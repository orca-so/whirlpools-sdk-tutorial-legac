import { fetchConcentratedLiquidityPool, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { increaseLiquidityQuoteB, priceToTickIndex, sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";
import assert from "assert";

import dotenv from "dotenv";

dotenv.config();

async function main() {
    // RPC へのコネクション作成
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");

    // トークン定義
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };

    // devSAMO/devUSDC プール取得
    const tickSpacing = 64;
    const whirlpool = await fetchConcentratedLiquidityPool(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing
    );

    // プールにおける現在価格を取得
    assert(whirlpool.initialized, "whirlpool is not initialized");
    console.log("price:", whirlpool.price);

    // 価格帯とデポジットするトークンの量、許容するスリッページを設定
    const lowerPrice = 0.005;
    const upperPrice = 0.02;
    const devUsdcAmount = 1_000_000n;
    const slippage = 100;  // 100 bps = 1%

    // 価格帯を調整 (全ての価格が設定可能ではなく、範囲指定に利用できる価格は決まっている(InitializableTickIndexに対応する価格))
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lower & upper tickindex:', lowerTickIndex, upperTickIndex);
    console.log('lower & upper price::', lowerPrice, upperPrice);

    // 見積もりを取得
    const quote = increaseLiquidityQuoteB(
        // 入力にするトークン
        devUsdcAmount,

        // スリッページ
        slippage,  // 100 bps = 1%
        whirlpool.sqrtPrice,

        // 価格帯
        lowerTickIndex,
        upperTickIndex,
    );

    // 見積もり結果表示
    console.log("Quote:");
    console.log("  liquidity amount:", quote.liquidityDelta);
    console.log("  estimated amount of devSAMO to supply without slippage:", Number(quote.tokenEstA) / 10 ** devSAMO.decimals);
    console.log("  estimated amount of devUSDC to supply without slippage:", Number(quote.tokenEstB) / 10 ** devUSDC.decimals);
    console.log("  amount of devSAMO to supply if slippage is fully applied:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
    console.log("  amount of tokenB to supply if slippage is fully applied:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
}

main().catch(e => console.error("error:", e));
