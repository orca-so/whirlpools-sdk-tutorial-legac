import { setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { increaseLiquidityQuoteB, priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";

import dotenv from "dotenv";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成
    //LANG:EN Initialize a connection to the RPC
    //LANG:KR RPC에 연결을 초기화
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");

    //LANG:JP トークン定義
    //LANG:EN Token definition
    //LANG:KR 토큰 정의함
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };

    //LANG:JP Whirlpool の Config アカウント
    //LANG:EN WhirlpoolsConfig account
    //LANG:KR WhirlpoolsConfig 계정
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    //LANG:JP devSAMO/devUSDC プール取得
    //LANG:EN Get devSAMO/devUSDC whirlpool
    //LANG:KR devSAMO/devUSDC 풀 가져옴
    const tickSpacing = 64;
    const whirlpoolPda = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda:", whirlpoolPda);

    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPda[0]);
    console.log("whirlpool:", whirlpool);

    //LANG:JP プールにおける現在価格を取得
    //LANG:EN Get the current price of the pool
    //LANG:KR 풀의 현재 가격 가져옴
    const sqrtPrice_x64 = sqrtPriceToPrice(whirlpool.data.sqrtPrice, devSAMO.decimals, devUSDC.decimals);
    console.log("sqrtPrice_x64:", sqrtPrice_x64);

    //LANG:JP 価格帯とデポジットするトークンの量、許容するスリッページを設定
    //LANG:EN Set price range, amount of tokens to deposit, and acceptable slippage
    //LANG:KR 가격 범위, 예치할 토큰 수량, 허용 슬리피지 설정
    const lowerPrice = 0.005;
    const upperPrice = 0.02;
    const devUsdcAmount = BigInt(1_000_000);
    const slippage = 100;  // 100 bps = 1%

    //LANG:JP 価格帯を調整 (全ての価格が設定可能ではなく、範囲指定に利用できる価格は決まっている(InitializableTickIndexに対応する価格))
    //LANG:EN Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
    //LANG:EN (prices corresponding to InitializableTickIndex are available)
    //LANG:KR 가격 범위 조정 (모든 가격 설정 불가, InitializableTickIndex에 해당하는 가격만 가능)
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lowerTickIndex:', lowerTickIndex);
    console.log('upperTickIndex:', upperTickIndex);

    //LANG:JP 見積もりを取得
    //LANG:EN Obtain deposit estimation
    //LANG:KR 예치 예상치 가져옴
    const quote = increaseLiquidityQuoteB(
        //LANG:JP 入力にするトークン
        //LANG:EN Input token and amount
        //LANG:KR 입력할 토큰 및 수량
        devUsdcAmount,

        //LANG:JP スリッページ
        //LANG:EN Acceptable slippage
        //LANG:KR 슬리피지 허용치
        slippage,  // 100 bps = 1%
        whirlpool.data.sqrtPrice,

        //LANG:JP 価格帯
        //LANG:EN Price range
        //LANG:KR 가격 범위
        lowerTickIndex,
        upperTickIndex,
    );

    //LANG:JP 見積もり結果表示
    //LANG:EN Output the estimation
    //LANG:KR 예상 결과 출력
    console.log("quote:", quote);
    console.log("devSAMO max input:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
    console.log("devUSDC max input:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
}

main().catch(e => console.error("error:", e));