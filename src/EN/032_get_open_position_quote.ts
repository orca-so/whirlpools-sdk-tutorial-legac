import { fetchConcentratedLiquidityPool, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { increaseLiquidityQuoteB, priceToTickIndex, sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";
import assert from "assert";

import dotenv from "dotenv";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");

    // Token definition
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };

    // Get devSAMO/devUSDC whirlpool
    const tickSpacing = 64;
    const whirlpool = await fetchConcentratedLiquidityPool(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing
    );

    // Get the current price of the pool
    assert(whirlpool.initialized, "whirlpool is not initialized");
    console.log("price:", whirlpool.price);

    // Set price range, amount of tokens to deposit, and acceptable slippage
    const lowerPrice = 0.005;
    const upperPrice = 0.02;
    const devUsdcAmount = 1_000_000n;
    const slippage = 100;  // 100 bps = 1%

    // Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
    // (prices corresponding to InitializableTickIndex are available)
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lower & upper tickindex:', lowerTickIndex, upperTickIndex);
    console.log('lower & upper price::', lowerPrice, upperPrice);

    // Obtain deposit estimation
    const quote = increaseLiquidityQuoteB(
        // Input token and amount
        devUsdcAmount,

        // Acceptable slippage
        slippage,  // 100 bps = 1%
        whirlpool.sqrtPrice,

        // Price range
        lowerTickIndex,
        upperTickIndex,
    );

    // Output the quote
    console.log("Quote:");
    console.log("  liquidity amount:", quote.liquidityDelta);
    console.log("  estimated amount of devSAMO to supply without slippage:", Number(quote.tokenEstA) / 10 ** devSAMO.decimals);
    console.log("  estimated amount of devUSDC to supply without slippage:", Number(quote.tokenEstB) / 10 ** devUSDC.decimals);
    console.log("  amount of devSAMO to supply if slippage is fully applied:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
    console.log("  amount of tokenB to supply if slippage is fully applied:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
}

main().catch(e => console.error("error:", e));
