import { Address, address, createKeyPairSignerFromBytes, createSolanaRpc, generateKeyPairSigner, getAddressEncoder, KeyPairSigner, Rpc, SolanaRpcApi } from "@solana/kit";
import secret from "../../wallet.json";
import { fetchMint, getInitializeMint2Instruction } from "@solana-program/token";
import { createConcentratedLiquidityPool } from "@orca-so/whirlpools";
import { fetchWhirlpool } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { getCreateAccountInstruction } from "@solana-program/system";
import { buildAndSendTransaction } from "@orca-so/tx-sender";

// This function is implemented in token.ts in the @orca/whirlpools package
function orderMints(mintA: Address, mintB: Address) {
    const encoder = getAddressEncoder();
    const mint1Bytes = new Uint8Array(encoder.encode(mintA));
    const mint2Bytes = new Uint8Array(encoder.encode(mintB));
    return Buffer.compare(mint1Bytes, mint2Bytes) < 0 ? [mintA, mintB] : [mintB, mintA];
}

async function main() {
    // RPC へのコネクション作成、秘密鍵読み込み
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // 新たなトークンを作成 (トークンは事前に作成されているべきであり、チュートリアル固有の処理です)
    const newTokenPubkeys = await Promise.all([
        createNewTokenMint(rpc, signer, signer.address, signer.address, 9),
        createNewTokenMint(rpc, signer, signer.address, signer.address, 6),
    ]);

    // 2 つのトークンを辞書順に並べ替え
    // Whirlpool は 2 つのトークン A/B のペアで構成されますが、順番がトークンのミントアドレスの辞書順と決まっています
    // 例えば、SOL/USDC のペアは作成できますが、USDC/SOL のペアは作成できません
    const [tokenAddressA, tokenAddressB] = orderMints(newTokenPubkeys[0], newTokenPubkeys[1]);

    // トークンのミントアカウントを取得
    const tokenA = await fetchMint(rpc, tokenAddressA);
    const tokenB = await fetchMint(rpc, tokenAddressB);
    const decimalA = tokenA.data.decimals;
    const decimalB = tokenB.data.decimals;
    console.log("tokenA:", tokenAddressA, "decimalA:", decimalA);
    console.log("tokenB:", tokenAddressB, "decimalB:", decimalB);

    // Concentrated Liquidity Pool の作成では tick_spacing を指定する必要があります
    // tick_spacing はプールの手数料定義にマッピングされます。詳細は以下を参照してください
    // https://dev.orca.so/Architecture%20Overview/Whirlpool%20Parameters#initialized-feetiers
    const tickSpacing = 64;
    const initialPrice = 0.01;

    // プールを作成
    const { instructions, poolAddress, callback: executeCreateConcentratedLiquidityPool } = await createConcentratedLiquidityPool(
        tokenAddressA, 
        tokenAddressB, 
        tickSpacing,
        initialPrice
    );
    console.log("instructions:", instructions);

    const signature = await executeCreateConcentratedLiquidityPool();
    console.log("createPoolTxId:", signature);

    // 初期化したプールの Whirlpool アカウントを取得
    const pool = await fetchWhirlpool(rpc, poolAddress);
    console.log("pool:", pool);
    
    const poolData = pool.data;
    const poolInitialPrice = sqrtPriceToPrice(poolData.sqrtPrice, decimalA, decimalB);
    const poolInitialTick = poolData.tickCurrentIndex;

    console.log(
        "poolAddress:", poolAddress.toString(),
        "\n  tokenA:", poolData.tokenMintA.toString(),
        "\n  tokenB:", poolData.tokenMintB.toString(),
        "\n  tickSpacing:", poolData.tickSpacing,
        "\n  initialPrice:", poolInitialPrice,
        "\n  initialTick:", poolInitialTick
    );
}

async function createNewTokenMint(
    rpc: Rpc<SolanaRpcApi>, 
    signer: KeyPairSigner, 
    mintAuthority: Address, 
    freezeAuthority: Address,
    decimals: number) {
    const keypair = await generateKeyPairSigner();
    const mintLen = 82;
    const lamports = await rpc.getMinimumBalanceForRentExemption(BigInt(mintLen)).send();
    const createAccountInstruction = getCreateAccountInstruction({
        payer: signer,
        newAccount: keypair,
        lamports,
        space: mintLen,
        programAddress: keypair.address,
    });

    const initializeMintInstruction = getInitializeMint2Instruction({
        mint: keypair.address,
        decimals,
        mintAuthority,
        freezeAuthority,
    });

    const txHash = await buildAndSendTransaction([createAccountInstruction, initializeMintInstruction], signer);
    console.log("createNewTokenMint txHash:", txHash);

    return keypair.address;
}

main().catch((e) => console.error("error:", e));
