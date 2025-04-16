import { Address, createKeyPairSignerFromBytes, createSolanaRpc, generateKeyPairSigner, getAddressEncoder, KeyPairSigner, Rpc, SolanaRpcApi } from "@solana/kit";
import { fetchMint, getInitializeMint2Instruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { createSplashPool, setWhirlpoolsConfig, setRpc as setRpcActions, setPayerFromBytes } from "@orca-so/whirlpools";
import { fetchWhirlpool } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { getCreateAccountInstruction } from "@solana-program/system";
import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import dotenv from "dotenv";

dotenv.config();
import secret from "../../wallet.json";

// SplashPool 은 Concentrated Liquidity Pool 의 위에 구축되지만, Constant Product AMM 처럼 동작합니다.
// - SplashPool 은 특정 tick_spacing 을 가지며, Whirlpool 으로 취급할 수 있습니다.
// - SplashPool 은 2개의 TickArray 만 가지며, createSplashPool 함수에서 초기화됩니다.
// - SplashPool 은 FullRange 포지션만 허용합니다 (Constant Product AMM 와 유사합니다)
async function main() {
    // RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setRpcActions(process.env.RPC_ENDPOINT_URL);
    await setPayerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");
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

    // 토큰의 민트 정보를 가져옴
    const tokenA = await fetchMint(rpc, tokenAddressA);
    const tokenB = await fetchMint(rpc, tokenAddressB);
    const decimalA = tokenA.data.decimals;
    const decimalB = tokenB.data.decimals;
    console.log("tokenA:", tokenAddressA, "decimalA:", decimalA);
    console.log("tokenB:", tokenAddressB, "decimalB:", decimalB);

    // 토큰 A의 가격을 토큰 B의 가격으로 설정
    const initialPrice = 0.01;

    // 새로운 풀을 생성
    const { poolAddress, callback: sendTx } = await createSplashPool(
        tokenAddressA,
        tokenAddressB,
        initialPrice
    );
    const signature = await sendTx();

    // 초기 가격과 tick을 확인하기 위해 pool 데이터를 가져옴
    const pool = await fetchWhirlpool(rpc, poolAddress);
    const poolData = pool.data;
    const poolInitialPrice = sqrtPriceToPrice(poolData.sqrtPrice, decimalA, decimalB);
    const poolInitialTick = poolData.tickCurrentIndex;

    console.log("txId:", signature);
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
        programAddress: TOKEN_PROGRAM_ADDRESS,
    });

    const initializeMintInstruction = getInitializeMint2Instruction({
        mint: keypair.address,
        decimals,
        mintAuthority,
        freezeAuthority,
    });

    await buildAndSendTransaction([createAccountInstruction, initializeMintInstruction], signer);

    return keypair.address;
}

// This function is implemented in token.ts in the @orca/whirlpools package
function orderMints(mintA: Address, mintB: Address) {
    const encoder = getAddressEncoder();
    const mint1Bytes = new Uint8Array(encoder.encode(mintA));
    const mint2Bytes = new Uint8Array(encoder.encode(mintB));
    return Buffer.compare(mint1Bytes, mint2Bytes) < 0 ? [mintA, mintB] : [mintB, mintA];
}

main().catch((e) => console.error("error:", e));
