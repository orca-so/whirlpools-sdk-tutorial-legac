import { setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { increaseLiquidityQuoteB, priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";

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

    // WhirlpoolsConfig account
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    // Get devSAMO/devUSDC whirlpool
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

    // Get the current price of the pool
    const sqrtPrice_x64 = sqrtPriceToPrice(whirlpool.data.sqrtPrice, devSAMO.decimals, devUSDC.decimals);
    console.log("sqrtPrice_x64:", sqrtPrice_x64);

    // Set price range, amount of tokens to deposit, and acceptable slippage
    const lowerPrice = 0.005;
    const upperPrice = 0.02;
    const devUsdcAmount = BigInt(1_000_000);
    const slippage = 100;  // 100 bps = 1%

    // Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
    // (prices corresponding to InitializableTickIndex are available)
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lowerTickIndex:', lowerTickIndex);
    console.log('upperTickIndex:', upperTickIndex);

    // Obtain deposit estimation
    const quote = increaseLiquidityQuoteB(
        // Input token and amount
        devUsdcAmount,

        // Acceptable slippage
        slippage,  // 100 bps = 1%
        whirlpool.data.sqrtPrice,

        // Price range
        lowerTickIndex,
        upperTickIndex,
    );

    // Output the estimation
    console.log("quote:", quote);
    console.log("devSAMO max input:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
    console.log("devUSDC max input:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
}

main().catch(e => console.error("error:", e));
