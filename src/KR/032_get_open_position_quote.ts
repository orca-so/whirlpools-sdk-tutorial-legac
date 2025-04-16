import { fetchConcentratedLiquidityPool, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { increaseLiquidityQuoteB, priceToTickIndex, sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";
import assert from "assert";

import dotenv from "dotenv";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");

    // 토큰 정의함
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };

    // devSAMO/devUSDC 풀 로드
    const tickSpacing = 64;
    const whirlpool = await fetchConcentratedLiquidityPool(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing
    );

    // 풀의 현재 가격 가져옴
    assert(whirlpool.initialized, "whirlpool is not initialized");
    console.log("price:", whirlpool.price);

    // 가격 범위, 예치할 토큰 수량, 허용 슬리피지 설정
    const lowerPrice = 0.005;
    const upperPrice = 0.02;
    const devUsdcAmount = 1_000_000n;
    const slippage = 100;  // 100 bps = 1%

    // 가격 범위 조정 (모든 가격 설정 불가, InitializableTickIndex에 해당하는 가격만 가능)
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lower & upper tickindex:', lowerTickIndex, upperTickIndex);
    console.log('lower & upper price::', lowerPrice, upperPrice);

    // 예치 예상치 가져옴
    const quote = increaseLiquidityQuoteB(
        // 입력할 토큰 및 수량
        devUsdcAmount,

        // 슬리피지 허용치
        slippage,  // 100 bps = 1%
        whirlpool.sqrtPrice,

        // 가격 범위
        lowerTickIndex,
        upperTickIndex,
    );

    // 예상 결과 출력
    console.log("Quote:");
    console.log("  liquidity amount:", quote.liquidityDelta);
    console.log("  estimated amount of devSAMO to supply without slippage:", Number(quote.tokenEstA) / 10 ** devSAMO.decimals);
    console.log("  estimated amount of devUSDC to supply without slippage:", Number(quote.tokenEstB) / 10 ** devUSDC.decimals);
    console.log("  amount of devSAMO to supply if slippage is fully applied:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
    console.log("  amount of tokenB to supply if slippage is fully applied:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
}

main().catch(e => console.error("error:", e));
