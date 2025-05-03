import { address, createSolanaRpc } from "@solana/kit";
import { fetchAllTickArrayWithFilter, tickArrayWhirlpoolFilter } from "@orca-so/whirlpools-client";
import { setWhirlpoolsConfig } from "@orca-so/whirlpools";

import dotenv from "dotenv";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");

    const poolAddress = address(process.env.POOL_ADDRESS);
    
    const filter = tickArrayWhirlpoolFilter(poolAddress);
    const tickArrays = await fetchAllTickArrayWithFilter(rpc, filter);

    tickArrays.forEach(tickArray => {
        console.log('Tick Array: ', tickArray.data.startTickIndex);
        const tickIndex = tickArray.data.startTickIndex;
        const ticks = tickArray.data.ticks;
        let idx = 0;
        let onlyInitialized = true;

        if (onlyInitialized) {
            ticks.filter(tick => tick.initialized).forEach(tick => {
                console.log(`    [Tick ${tickArray.data.startTickIndex + idx}] initialized? ${tick.initialized}, liquidity gross: ${tick.liquidityGross}, liquidity net: ${tick.liquidityNet}`); 
                idx++;
            });
        } else {
            ticks.forEach(tick => {
                console.log(`    [Tick ${tickArray.data.startTickIndex + idx}] initialized? ${tick.initialized}, liquidity gross: ${tick.liquidityGross}, liquidity net: ${tick.liquidityNet}`); 
                idx++;
            });
        }
    });
}

main().catch(e => console.error("error:", e));