import { setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { increaseLiquidityQuoteB, priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";

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

    // Whirlpool の Config アカウント
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    // devSAMO/devUSDC プール取得
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

    // プールにおける現在価格を取得
    const sqrtPrice_x64 = sqrtPriceToPrice(whirlpool.data.sqrtPrice, devSAMO.decimals, devUSDC.decimals);
    console.log("sqrtPrice_x64:", sqrtPrice_x64);

    // 価格帯とデポジットするトークンの量、許容するスリッページを設定
    const lowerPrice = 0.005;
    const upperPrice = 0.02;
    const devUsdcAmount = BigInt(1_000_000);
    const slippage = 100;  // 100 bps = 1%

    // 価格帯を調整 (全ての価格が設定可能ではなく、範囲指定に利用できる価格は決まっている(InitializableTickIndexに対応する価格))
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lowerTickIndex:', lowerTickIndex);
    console.log('upperTickIndex:', upperTickIndex);

    // 見積もりを取得
    const quote = increaseLiquidityQuoteB(
        // 入力にするトークン
        devUsdcAmount,

        // スリッページ
        slippage,  // 100 bps = 1%
        whirlpool.data.sqrtPrice,

        // 価格帯
        lowerTickIndex,
        upperTickIndex,
    );

    // 見積もり結果表示
    console.log("quote:", quote);
    console.log("devSAMO max input:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
    console.log("devUSDC max input:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
}

main().catch(e => console.error("error:", e));
