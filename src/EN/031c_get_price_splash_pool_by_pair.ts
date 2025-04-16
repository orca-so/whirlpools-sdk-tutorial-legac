import { address, createSolanaRpc } from "@solana/kit";
import { getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { fetchConcentratedLiquidityPool, fetchSplashPool, fetchWhirlpoolsByTokenPair, setWhirlpoolsConfig } from "@orca-so/whirlpools";

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
    const whirlpool = await fetchSplashPool(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
    );

    // Get the current price of the pool
    const isInitialized = whirlpool.initialized;
    console.log("Whirlpool:", whirlpool.address);
    if (isInitialized) {
        console.log("  sqrtPrice_x64:", whirlpool.sqrtPrice);
        console.log("  price: ", whirlpool.price);
    }
}

main().catch(e => console.error("error:", e));
