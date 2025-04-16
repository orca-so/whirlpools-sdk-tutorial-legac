import { setJitoFeePercentile, setJitoTipSetting, setPayerFromBytes, setPriorityFeePercentile, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig, swap } from "@orca-so/whirlpools";
import { address } from "@solana/kit";
import { getWhirlpoolAddress } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화하고 개인키를 로딩
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");
    console.log("signer:", signer.address);

    // 토큰 정의
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };

    // WhirlpoolsConfig 계정임
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    // devSAMO/devSUDC whirlpool을 가져옴옴
    // Whirlpools은 데이터베이스에서 5개의 열로 구성된 복합 기본키처럼, 다음의 5가지 요소로 식별됨
    // 프로그램, Config, 첫 번째 토큰의 민트 주소, 두 번째 토큰의 민트 주소, 그리고 틱 간격
    const tickSpacing = 64;
    const whirlpoolPda = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda:", whirlpoolPda);

    // NOTE: Set priority fee
    // https://dev.orca.so/SDKs/Send%20Transaction#priority-fee-configuration
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    setPriorityFeePercentile("50")

    // Set Jito tip - available on Solana Mainnet only!
    // https://dev.orca.so/SDKs/Send%20Transaction#jito-tip-configuration
    // setJitoTipSetting({
    //     type: "dynamic",
    //     maxCapLamports: BigInt(3_000_000), // Max priority fee = 0.005 SOL
    // });
    // setJitoFeePercentile("50ema")

    // devUSDC 1개를 devSAMO로 스왑함
    const amountIn = BigInt(100_000);

    // 스왑 예상치 획득(시뮬레이션 실행)
    const { instructions, quote, callback: executeSwap } = await swap(
        // 입력할 토큰과 수량
        {
            mint: devUSDC.mint,
            inputAmount: amountIn,   // swap 0.1 devUSDC to devSAMO
        },
        whirlpoolPda[0],
        // 허용 슬리피지 (100bps = 1%)
        100,  // 100 bps = 1%
    );

    // 예상 결과 출력
    console.log("Quote:");
    console.log("  - Amount of tokens to pay:", quote.tokenIn);
    console.log("  - Minimum amount of tokens to receive with maximum slippage:", quote.tokenMinOut);
    console.log("  - Estimated tokens to receive:");
    console.log("      Based on the price at the time of the quote");
    console.log("      Without slippage consideration:", quote.tokenEstOut);
    console.log("  - Trade fee (bps):", quote.tradeFee);

    // 액션을 이용하여 트랜잭션 전파
    const swapSignature = await executeSwap();
    console.log("swapSignature:", swapSignature);
}

main().catch(e => console.error("error:", e));
