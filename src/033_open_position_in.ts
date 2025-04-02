import { increasePosLiquidity, openPositionInstructions, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    setJitoTipSetting({
        type: "dynamic",
    });

    console.log('signer:', signer.address);

    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const tickSpacing = 64;
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());
    const whirlpoolPda = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda:", whirlpoolPda);

    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPda[0]);
    console.log("whirlpool:", whirlpool);

    const sqrtPrice_x64 = sqrtPriceToPrice(whirlpool.data.sqrtPrice, devSAMO.decimals, devUSDC.decimals);
    console.log("sqrtPrice_x64:", sqrtPrice_x64);

    const devUsdcAmount = BigInt(1_000_000);

    const lowerTickIndex = priceToTickIndex(0.005, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(0.02, devSAMO.decimals, devUSDC.decimals);
    console.log('lowerTickIndex:', lowerTickIndex);
    console.log('upperTickIndex:', upperTickIndex);

    const lowerPrice = tickIndexToPrice(lowerTickIndex, devSAMO.decimals, devUSDC.decimals);
    const upperPrice = tickIndexToPrice(upperTickIndex, devSAMO.decimals, devUSDC.decimals);
    console.log('lowerPrice:', lowerPrice);
    console.log('upperPrice:', upperPrice);
    
    const { quote, instructions, positionMint } = await openPositionInstructions(
        rpc, 
        whirlpool.address, 
        {
            tokenB: devUsdcAmount,
        }, 
        lowerPrice, 
        upperPrice, 
        0.01, 
        signer
    );
    console.log("quote:", quote);
    console.log("openPositionInbstructions:", instructions);
    console.log("positionMint:", positionMint);

    const { instructions: increaseLiquidityInstructions, callback: executeIncreaseLiquidity } = await increasePosLiquidity(
        positionMint, 
        {
            tokenB: quote.tokenMaxB,
        }, 
        0.01
    );
    console.log("increaseLiquidityInstructions:", increaseLiquidityInstructions);

    const txHash = await executeIncreaseLiquidity();
    console.log('txHash:', txHash);
}

main().catch(e => console.error("error:", e));