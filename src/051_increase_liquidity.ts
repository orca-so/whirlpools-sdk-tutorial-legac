import { address, createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import { fetchPositionsForOwner, increaseLiquidityInstructions, setJitoTipSetting, setPriorityFeeSetting, setRpc } from "@orca-so/whirlpools";
import { increaseLiquidityQuoteB } from "@orca-so/whirlpools-core";
import { fetchWhirlpool, getWhirlpoolAddress, Position } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../wallet.json";
import { buildAndSendTransaction } from "@orca-so/tx-sender";

dotenv.config();

async function main() {
    try {
        const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
        const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
        console.log('wallet address:', signer.address);
    
        const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};
        const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
        
        const devUsdcAmount = BigInt(1_000_000); // 1 devUSDC
        const slippage = 0.01; // 1%
        const tickSpacing = 64;
    
        const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
        const whirlpoolPda = await getWhirlpoolAddress(
            DEVNET_WHIRLPOOLS_CONFIG,
            devSAMO.mint,
            devUSDC.mint,
            tickSpacing,
        );
        console.log('whirlpoolPda:', whirlpoolPda);
        const whirlpool = await fetchWhirlpool(rpc, whirlpoolPda[0]);
        
        const positions = (await fetchPositionsForOwner(rpc, signer.address))
            .filter(position => (position.data as Position).whirlpool === whirlpoolPda[0]);
        console.log(positions);
    
        if (positions.length > 0) {
            // Only increase liquidity for the first position
            const position: Position = positions[0].data as Position;
            const quote = increaseLiquidityQuoteB(
                devUsdcAmount,
                slippage,
                whirlpool.data.sqrtPrice,
                position.tickLowerIndex,
                position.tickUpperIndex
            );
            console.log("quote:", quote);
            console.log("devSAMO max input:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
            console.log("devUSDC max input:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
    
            const increaseLiquidity = await increaseLiquidityInstructions(
                rpc,
                position.positionMint,
                {
                    tokenA: quote.tokenMaxA,
                    tokenB: quote.tokenMaxB,
                },
                slippage,
                signer
            );
            console.log("instructions", increaseLiquidity.instructions);
    
            await setRpc(process.env.RPC_ENDPOINT_URL);
            setPriorityFeeSetting({
                type: "dynamic",
                maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
            });
            setJitoTipSetting({
                type: "dynamic",
            });
            const txHash = await buildAndSendTransaction(
                increaseLiquidity.instructions,
                signer,
            );
            console.log('txHash:', txHash);
        } else {
            console.log("No position in devSAMO/devUSDC pool");
        }
    } catch (e) {
        console.error('error:', e);
    }
}

main();