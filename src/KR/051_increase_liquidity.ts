import { address, createSolanaRpc } from "@solana/kit";
import { fetchPositionsForOwner, increasePosLiquidity, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { increaseLiquidityQuoteB } from "@orca-so/whirlpools-core";
import { fetchWhirlpool, getWhirlpoolAddress, Position } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    console.log('signer:', signer.address);

    // 토큰 정의
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};

    // WhirlpoolsConfig 계정
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const tickSpacing = 64;
    const whirlpoolPda = await getWhirlpoolAddress(
        DEVNET_WHIRLPOOLS_CONFIG,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log('whirlpoolPda:', whirlpoolPda);

    // 포지션과 해당 포지션이 속한 풀 가져옴
    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPda[0]);
    const positions = (await fetchPositionsForOwner(rpc, signer.address))
        .filter(position => (position.data as Position).whirlpool === whirlpoolPda[0]);
    console.log(positions);

    if (positions.length > 0) {
        // Only increase liquidity for the first position
        const position: Position = positions[0].data as Position;

        // 예치할 토큰 수량과 허용 슬리피지 설정
        const devUsdcAmount = BigInt(1_000_000); // 1 devUSDC
        const slippage = 100; // 100 bps = 1

        // 예치 예상치 가져옴
        const calculatedQuote = increaseLiquidityQuoteB(
            // 입력할 토큰 및 수량
            devUsdcAmount,

            // 허용 슬리피지
            slippage,
            whirlpool.data.sqrtPrice,

            // 포지션이 가지고 있는 가격 범위를 그대로 전달
            position.tickLowerIndex,
            position.tickUpperIndex
        );

        // 예상 결과 출력
        console.log("quote:", calculatedQuote);
        console.log("devSAMO max input:", Number(calculatedQuote.tokenMaxA) / 10 ** devSAMO.decimals);
        console.log("devUSDC max input:", Number(calculatedQuote.tokenMaxB) / 10 ** devUSDC.decimals);

        // 트랜잭션 실행 전의 유동성 표시
        console.log("liquidity(before):", position.liquidity);

        // 트랜잭션 생성
        const { quote, instructions, callback: executeIncreaseLiquidity } = await increasePosLiquidity(
            position.positionMint, 
            {
                tokenB: calculatedQuote.tokenMaxB,
            }, 
            0.01
        );
        console.log("increaseLiquidityInstructions:", instructions);

        // 트랜잭션 전파
        const signature = await executeIncreaseLiquidity();
        console.log('signature:', signature);

        // TODO: print after liquidity
    } else {
        console.log("No position in devSAMO/devUSDC pool");
    }
}

main().catch(e => console.error(e));
