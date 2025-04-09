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
    // RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // 새로운 토큰을 생성. 이 튜토리얼의 경우, 토큰은 이미 생성되어 있어야 함.
    const newTokenPubkeys = await Promise.all([
        createNewTokenMint(rpc, signer, signer.address, signer.address, 9),
        createNewTokenMint(rpc, signer, signer.address, signer.address, 6),
    ]);

    // 2개의 토큰을 사전순으로 정렬
    // 예를 들어 SOL/USDC 풀은 생성할 수 있지만, USDC/SOL 풀은 생성할 수 없음
    const [tokenAddressA, tokenAddressB] = orderMints(newTokenPubkeys[0], newTokenPubkeys[1]);

    const tokenA = await fetchMint(rpc, tokenAddressA);
    const tokenB = await fetchMint(rpc, tokenAddressB);
    const decimalA = tokenA.data.decimals;
    const decimalB = tokenB.data.decimals;
    console.log("tokenA:", tokenAddressA, "decimalA:", decimalA);
    console.log("tokenB:", tokenAddressB, "decimalB:", decimalB);

    // tick_spacing 은 풀의 수수료 계층에 매핑됩니다. 자세한 내용은 다음을 참조
    // https://dev.orca.so/Architecture%20Overview/Whirlpool%20Parameters#initialized-feetiers
    const tickSpacing = 64;
    const initialPrice = 0.01;

    // 새로운 풀을 생성
    const { instructions, poolAddress, callback: executeCreateConcentratedLiquidityPool } = await createConcentratedLiquidityPool(
        tokenAddressA, 
        tokenAddressB, 
        tickSpacing,
        initialPrice
    );
    console.log("instructions:", instructions);

    const signature = await executeCreateConcentratedLiquidityPool();
    console.log("createPoolTxId:", signature);

    // 초기화된 풀의 Whirlpool 계정을 가져옴
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
