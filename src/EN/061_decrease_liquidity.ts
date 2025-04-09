import { address, createSolanaRpc } from "@solana/kit";
import { decreaseLiquidity, fetchPositionsForOwner, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import {fetchPosition, getWhirlpoolAddress, Position} from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    console.log('signer:', signer.address);

    const positionAddress = address(process.env.WHIRLPOOL_POSITION);

    // Get the position and the pool to which the position belongs
    const position = await fetchPosition(rpc, positionAddress);
    const whirlpool = position.data.whirlpool;

    // Set the percentage of liquidity to be withdrawn (30%)
    const liquidity = position.data.liquidity;
    const liquidityDelta = (liquidity * BigInt(30)) / BigInt(100);

    console.log("liquidity:", liquidity);
    console.log("liquidityDelta:", liquidityDelta);

    // Set acceptable slippage
    const slippage = 100; // 100 bps = 1%

    // Output the liquidity before transaction execution
    console.log("liquidity(before):", position.data.liquidity);

    // Create a transaction
    const { quote, instructions, callback: executeDecreaseLiquidity } = await decreaseLiquidity(
        position.data.positionMint,
        {
            // Liquidity to be withdrawn
            liquidity: liquidityDelta,
        },

        // Acceptable slippage
        slippage,
    );

    console.log("quote:", quote);
    console.log("instructions:", instructions);

    // Send the transaction
    const signature = await executeDecreaseLiquidity();
    console.log('signature:', signature);

    // TODO: print after liquidity
}

main().catch(e => console.error(e));
