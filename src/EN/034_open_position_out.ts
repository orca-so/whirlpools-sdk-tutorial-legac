import { increasePosLiquidity, openPositionInstructions, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    console.log('signer:', signer.address);

    // Token definition
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};

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
    const lowerPrice = 0.03;
    const upperPrice = 0.04;
    const devSamoAmount = BigInt(10_000_000_000);
    const slippage = 100; // 100bps = 1%

    // Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
    // (prices corresponding to InitializableTickIndex are available)
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lowerTickIndex:', lowerTickIndex);
    console.log('upperTickIndex:', upperTickIndex);

    // Obtain deposit estimation
    const { quote, instructions, positionMint } = await openPositionInstructions(
        // Pass the pool definition and state
        rpc,
        whirlpool.address, 
        {
            tokenA: devSamoAmount,
        },

        // Price range
        lowerPrice, 
        upperPrice,

        // Acceptable slippage
        slippage,  // 100 bps = 1%
        signer
    );

    // Output the estimation
    console.log("quote:", quote);
    console.log("openPositionInstructions:", instructions);
    console.log("positionMint:", positionMint);

    // Create a transaction
    const { instructions: increaseLiquidityInstructions, callback: executeIncreaseLiquidity } = await increasePosLiquidity(
        positionMint, 
        {
            tokenA: quote.tokenMaxA,
        }, 
        100,  // 100 bps = 1%
    );
    console.log("increaseLiquidityInstructions:", increaseLiquidityInstructions);

    // Send the transaction
    const txHash = await executeIncreaseLiquidity();
    console.log('txHash:', txHash);
}

main().catch(e => console.error("error:", e));
