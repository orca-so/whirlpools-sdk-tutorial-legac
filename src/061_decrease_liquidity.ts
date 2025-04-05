import { address, createSolanaRpc } from "@solana/kit";
import { decreaseLiquidity, fetchPositionsForOwner, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { getWhirlpoolAddress, Position } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
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
    const tickSpacing = 64;

    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolPda = await getWhirlpoolAddress(
        DEVNET_WHIRLPOOLS_CONFIG,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log('whirlpoolPda:', whirlpoolPda);
    
    const positions = (await fetchPositionsForOwner(rpc, signer.address))
        .filter(position => (position.data as Position).whirlpool === whirlpoolPda[0]);
    console.log(positions);

    if (positions.length > 0) {
        // Only increase liquidity for the first position
        const position: Position = positions[0].data as Position;

        const liquidity = position.liquidity;
        const liquidityDelta = (liquidity * BigInt(30)) / BigInt(100);
        console.log("liquidity:", liquidity);
        console.log("liquidityDelta:", liquidityDelta);

        const slippage = 100; // 100 bps = 1%

        const { quote, instructions, callback: executeDecreaseLiquidity } = await decreaseLiquidity(
            position.positionMint,
            {
                liquidity: liquidityDelta,
            },
            slippage,
        );
        console.log("quote:", quote);
        console.log("instructions:", instructions);

        const signature = await executeDecreaseLiquidity();
        console.log('signature:', signature);
    }
}

main().catch(e => console.error(e));