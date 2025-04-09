import { Address, address, createKeyPairSignerFromBytes, createSolanaRpc, generateKeyPairSigner, getAddressEncoder, KeyPairSigner, Rpc, SolanaRpcApi } from "@solana/kit";
import secret from "../wallet.json";
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
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    //LANG:JP 新たなトークンを作成 (トークンは事前に作成されているべきであり、チュートリアル固有の処理です)
    //LANG:EN Create new token mints. Note that the in a more realistic scenario,
    //LANG:EN the mints are generated beforehand.
    //LANG:KR 새로운 토큰을 생성. 이 튜토리얼의 경우, 토큰은 이미 생성되어 있어야 함.
    const newTokenPubkeys = await Promise.all([
        createNewTokenMint(rpc, signer, signer.address, signer.address, 9),
        createNewTokenMint(rpc, signer, signer.address, signer.address, 6),
    ]);

    //LANG:JP 2 つのトークンを辞書順に並べ替え
    //LANG:JP Whirlpool は 2 つのトークン A/B のペアで構成されますが、順番がトークンのミントアドレスの辞書順と決まっています
    //LANG:JP 例えば、SOL/USDC のペアは作成できますが、USDC/SOL のペアは作成できません
    //LANG:EN Token A and Token B Mint has to be cardinally ordered
    //LANG:EN For example, SOL/USDC can be created, but USDC/SOL cannot be created
    //LANG:KR 2개의 토큰을 사전순으로 정렬
    //LANG:KR 예를 들어 SOL/USDC 풀은 생성할 수 있지만, USDC/SOL 풀은 생성할 수 없음
    const [tokenAddressA, tokenAddressB] = orderMints(newTokenPubkeys[0], newTokenPubkeys[1]);

    //LANG:JP トークンのミントアカウントを取得
    //LANG:EN Fetch token mint infos
    const tokenA = await fetchMint(rpc, tokenAddressA);
    const tokenB = await fetchMint(rpc, tokenAddressB);
    const decimalA = tokenA.data.decimals;
    const decimalB = tokenB.data.decimals;
    console.log("tokenA:", tokenAddressA, "decimalA:", decimalA);
    console.log("tokenB:", tokenAddressB, "decimalB:", decimalB);

    //LANG:JP Concentrated Liquidity Pool の作成では tick_spacing を指定する必要があります
    //LANG:JP tick_spacing はプールの手数料定義にマッピングされます。詳細は以下を参照してください
    //LANG:EN The tick spacing maps to the fee tier of the pool. For more details, see
    //LANG:KR tick_spacing 은 풀의 수수료 계층에 매핑됩니다. 자세한 내용은 다음을 참조
    // https://dev.orca.so/Architecture%20Overview/Whirlpool%20Parameters#initialized-feetiers
    const tickSpacing = 64;
    const initialPrice = 0.01;

    //LANG:JP プールを作成
    //LANG:EN Create a new pool
    //LANG:KR 새로운 풀을 생성
    const { instructions, poolAddress, callback: executeCreateConcentratedLiquidityPool } = await createConcentratedLiquidityPool(
        tokenAddressA, 
        tokenAddressB, 
        tickSpacing,
        initialPrice
    );
    console.log("instructions:", instructions);

    const signature = await executeCreateConcentratedLiquidityPool();
    console.log("createPoolTxId:", signature);

    //LANG:JP 初期化したプールの Whirlpool アカウントを取得
    //LANG:EN Fetch pool data to verify the initial price and tick
    //LANG:KR 초기화된 풀의 Whirlpool 계정을 가져옴
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