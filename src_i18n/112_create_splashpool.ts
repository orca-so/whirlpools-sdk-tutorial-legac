import { Address, createKeyPairSignerFromBytes, createSolanaRpc, generateKeyPairSigner, getAddressEncoder, KeyPairSigner, Rpc, SolanaRpcApi } from "@solana/kit";
import { fetchMint, getInitializeMint2Instruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { createSplashPool, setWhirlpoolsConfig, setRpc as setRpcActions, setPayerFromBytes } from "@orca-so/whirlpools";
import { fetchWhirlpool } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { getCreateAccountInstruction } from "@solana-program/system";
import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import dotenv from "dotenv";

dotenv.config();
import secret from "../wallet.json";

//LANG:JP SplashPool と Concentrated Liquidity Pool の違い
//LANG:JP SplashPool は Concentrated Liquidity Pool の上に構築されますが、Constant Product AMM のように振る舞います。
//LANG:JP - SplashPool は特定の tick_spacing を持つ Whirlpool であり、Whirlpool として扱うことができます。
//LANG:JP - SplashPool は 2 つの TickArray のみを持ちます (シンプルで低コスト)
//LANG:JP - SplashPool は FullRange のポジションのみを許可します (Constant Product AMM に似ています)
//LANG:EN What is a SplashPool?
//LANG:EN SplashPools are built on top of Orca's CLMM, but behave similar to a Constant Product AMM.
//LANG:EN - it is a Whirlpool with a specific tick_spacing. SplashPool can be handled as Whirlpool.
//LANG:EN - it has only 2 TickArrays (simple, low cost), which are initialized in the createSplashPool function.
//LANG:EN - it allows FullRange positions only (similar to Constant Product AMM)
//LANG:KR SplashPool 은 Concentrated Liquidity Pool 의 위에 구축되지만, Constant Product AMM 처럼 동작합니다.
//LANG:KR - SplashPool 은 특정 tick_spacing 을 가지며, Whirlpool 으로 취급할 수 있습니다.
//LANG:KR - SplashPool 은 2개의 TickArray 만 가지며, createSplashPool 함수에서 초기화됩니다.
//LANG:KR - SplashPool 은 FullRange 포지션만 허용합니다 (Constant Product AMM 와 유사합니다)
async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setRpcActions(process.env.RPC_ENDPOINT_URL);
    await setPayerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");
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
    //LANG:KR 토큰의 민트 정보를 가져옴
    const tokenA = await fetchMint(rpc, tokenAddressA);
    const tokenB = await fetchMint(rpc, tokenAddressB);
    const decimalA = tokenA.data.decimals;
    const decimalB = tokenB.data.decimals;
    console.log("tokenA:", tokenAddressA, "decimalA:", decimalA);
    console.log("tokenB:", tokenAddressB, "decimalB:", decimalB);

    //LANG:JP プールの初期価格を設定 (価格単位は トークンB/トークンA)
    //LANG:EN Set the price of token A in terms of token B
    //LANG:KR 토큰 A의 가격을 토큰 B의 가격으로 설정
    const initialPrice = 0.01;

    //LANG:JP プールを作成
    //LANG:EN Create a new pool
    //LANG:KR 새로운 풀을 생성
    const { poolAddress, callback: sendTx } = await createSplashPool(
        tokenAddressA,
        tokenAddressB,
        initialPrice
    );
    const signature = await sendTx();

    //LANG:JP 初期化したプールの Whirlpool アカウントを取得
    //LANG:EN Fetch pool data to verify the initial price and tick
    //LANG:KR 초기 가격과 tick을 확인하기 위해 pool 데이터를 가져옴
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