import { fetchConcentratedLiquidityPool, openConcentratedPosition, setPayerFromBytes, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { address, createSolanaRpc } from "@solana/kit";

import dotenv from "dotenv";
import secret from "../../wallet.json";
import assert from "assert";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('signer:', signer.address);

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
    const devSamoAmount = 10_000_000_000n;
    const slippage = 100;  // 100 bps = 1%
    console.log('lower & upper price::', lowerPrice, upperPrice);

    // Obtain deposit estimation
    // Create a transaction
    const { quote, positionMint, callback: sendTx } = await openConcentratedPosition(
        whirlpool.address,
        {
            tokenA: devSamoAmount,
        },
        lowerPrice,
        upperPrice,
        slippage,
    );
    // Send the transaction
    const txHash = await sendTx();

    console.log("Position mint:", positionMint);
    console.log("Quote:");
    console.log("  liquidity amount:", quote.liquidityDelta);
    console.log("  estimated amount of devSAMO to supply without slippage:", Number(quote.tokenEstA) / 10 ** devSAMO.decimals);
    console.log("  estimated amount of devUSDC to supply without slippage:", Number(quote.tokenEstB) / 10 ** devUSDC.decimals);
    console.log("  amount of devSAMO to supply if slippage is fully applied:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
    console.log("  amount of tokenB to supply if slippage is fully applied:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
    console.log('TX hash:', txHash);
}

main().catch(e => console.error("error:", e));

