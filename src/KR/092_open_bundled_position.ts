import { buildAndSendTransaction, setPriorityFeeSetting, setRpc } from "@orca-so/tx-sender";
import { fetchWhirlpoolsByTokenPair, setPayerFromBytes, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchPositionBundle, fetchWhirlpool, getBundledPositionAddress, getOpenBundledPositionInstruction } from "@orca-so/whirlpools-client";
import { address, createSolanaRpc } from "@solana/kit";
import {
    firstUnoccupiedPositionInBundle,
    getInitializableTickIndex,
    sqrtPriceToPrice,
    sqrtPriceToTickIndex,
    tickIndexToPrice
} from "@orca-so/whirlpools-core";
import {findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS} from "@solana-program/token";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // 토큰 정의
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};

    // 환경변수 WHIRLPOOL_POSITION_BUNDLE에서 PositionBundle 주소를 가져옴
    const positionBundleAddress = process.env.WHIRLPOOL_POSITION_BUNDLE;
    const positionBundlePubkey = address(positionBundleAddress);
    console.log("position bundle address:", positionBundlePubkey.toString());

    // devSAMO/devUSDC 풀 가져옴
    const tickSpacing = 64;
    const whirlpoolPubkey = (await fetchWhirlpoolsByTokenPair(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
    )).filter((whirlpool) => whirlpool.tickSpacing === tickSpacing);
    
    if (whirlpoolPubkey.length === 0) {
        throw new Error("No whirlpool found");
    }
    
    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPubkey[0].address);
    console.log("whirlpool:", whirlpool);

    // 풀의 현재 가격 가져옴
    const sqrtPriceX64 = whirlpool.data.sqrtPrice;
    const price = sqrtPriceToPrice(sqrtPriceX64, devSAMO.decimals, devUSDC.decimals);
    console.log("price:", price.toFixed(devUSDC.decimals));

    // 가격 범위를 설정
    const lowerPrice = BigInt(0.005);
    const upperPrice = BigInt(0.02);

    // 가격 범위 조정 (모든 가격을 설정할 수 없으며, InitializableTickIndex에 해당하는 가격만 가능)
    const lowerTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(lowerPrice), tickSpacing);
    const upperTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(upperPrice), tickSpacing);
    console.log("lower & upper tick index:", lowerTickIndex, upperTickIndex);
    console.log("lower & upper price:",
        tickIndexToPrice(lowerTickIndex, devSAMO.decimals, devUSDC.decimals),
        tickIndexToPrice(upperTickIndex, devSAMO.decimals, devUSDC.decimals),
    );

    // PositionBundle 계정 가져옴
    const positionBundle = await fetchPositionBundle(rpc, positionBundlePubkey);

    // PositionBundle용 ATA를 가져옴
    const positionBundleTokenAccount = await findAssociatedTokenPda(
        {
            mint: positionBundle.data.positionBundleMint,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
        }
    );
    console.log("positionBundleTokenAccount:", positionBundleTokenAccount);

    // PositionBundle 내에서 사용되지 않은 bundle index를 가져옴
    const unoccupiedBundleIndex = firstUnoccupiedPositionInBundle(new Uint8Array(positionBundle.data.positionBitmap));
    console.log("unoccupiedBundleIndex:", unoccupiedBundleIndex);

    // PositionBundle에서 관리할 포지션 주소를 생성
    const [bundledPositionOnePda] = await getBundledPositionAddress(positionBundle.address, unoccupiedBundleIndex);
    console.log("bundledPositionOnePda:", bundledPositionOnePda);

    // PositionBundle에서 관리할 첫 번째 포지션을 오픈하기 위한 명령 생성
    const openBundledPositionIx = getOpenBundledPositionInstruction({
        bundledPosition: bundledPositionOnePda,
        positionBundle: positionBundle.address,
        positionBundleTokenAccount: positionBundleTokenAccount[0],
        positionBundleAuthority: signer,
        whirlpool: whirlpool.address,
        funder: signer,
        bundleIndex: unoccupiedBundleIndex,
        tickLowerIndex: lowerTickIndex,
        tickUpperIndex: upperTickIndex,
    });

    // 트랜잭션 전파
    const tx = await buildAndSendTransaction(
        [openBundledPositionIx],
        signer,
        [positionBundleTokenAccount[0], bundledPositionOnePda[0]],
        "confirmed"
    );
    console.log("tx:", tx);
}

main().catch((e) => console.error("error:", e));
