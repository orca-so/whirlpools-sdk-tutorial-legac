import { address, lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import { setPayerFromBytes, setWhirlpoolsConfig } from "@orca-so/whirlpools";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");
    
    console.log("signer:", signer.address);

    // SOL destination
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    // Amount to send
    const amount = BigInt(100_000);

    // Build the instruction to send SOL
    const instruction = getTransferSolInstruction({
        amount: lamports(amount),
        source: signer,
        destination: destAddress
    });
    console.log("instruction:", instruction);

    // Send the transaction
    const txHash = await buildAndSendTransaction([instruction], signer);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));
