import { openPositionInstructions, setJitoTipSetting, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { increaseLiquidityQuoteB, priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import dotenv from "dotenv";
import secret from "../wallet.json";
import { buildAndSendTransaction } from "@orca-so/tx-sender";

dotenv.config();

async function main() {
    try {
        const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
        const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
        console.log('wallet address:', signer.address);
        
        await setWhirlpoolsConfig("solanaDevnet");
    
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
    
        const quote = increaseLiquidityQuoteB(
            devUsdcAmount,
            0.01,
            whirlpool.data.sqrtPrice,
            lowerTickIndex,
            upperTickIndex,
        );
        console.log("quote", quote);
        console.log("devSAMO max input", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
        console.log("devUSDC max input", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
        
        const openPosition = await openPositionInstructions(
            rpc, 
            whirlpool.address, 
            {
                tokenA: quote.tokenMaxA,
                tokenB: quote.tokenMaxB,
            }, 
            lowerPrice, 
            upperPrice, 
            0.01, 
            signer
        );
    
        console.log("openPositionInbstructions:", openPosition);
    
        await setRpc(process.env.RPC_ENDPOINT_URL);
        setPriorityFeeSetting({
            type: "dynamic",
            maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
        });
        setJitoTipSetting({
            type: "dynamic",
        });
        const txHash = await buildAndSendTransaction(
            openPosition.instructions,
            signer,
        );
        console.log('txHash:', txHash);
    } catch (e) {
        console.error('error:', e);
    }
}

main();