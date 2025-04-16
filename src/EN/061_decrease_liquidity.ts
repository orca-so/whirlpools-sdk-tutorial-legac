import { address, createSolanaRpc } from "@solana/kit";
import { decreaseLiquidity, fetchPositionsForOwner, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchPosition, getWhirlpoolAddress, Position } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    const positionMint = address(process.env.POSITION_MINT);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    console.log('signer:', signer.address);

    // Create a transaction
    // Obtain deposit estimation
    const devUsdcAmount = 1_000_000n;
    const { quote, callback: sendTx } = await decreaseLiquidity(
        positionMint,
        {
            tokenB: devUsdcAmount,
        },
        100
    );

    const txHash = await sendTx();
    console.log("Position mint:", positionMint);
    console.log("Quote:");
    console.log("  liquidity amount:", quote.liquidityDelta);
    console.log("  estimated amount of devSAMO to supply without slippage:", quote.tokenEstA);
    console.log("  estimated amount of devUSDC to supply without slippage:", quote.tokenEstB);
    console.log("  amount of devSAMO able to withdraw if slippage is fully applied:", quote.tokenMinA);
    console.log("  amount of tokenB able to withdraw if slippage is fully applied:", quote.tokenMinB);
    console.log('TX hash:', txHash);
}

main().catch(e => console.error(e));
