import { address, createKeyPairSignerFromBytes, lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const wallet = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log("wallet:", wallet.address);

    // SOL destination
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    // Amount to send
    const amount = 10_000_000n; // lamports = 0.01 SOL

    // Build the instruction to send SOL
    const instruction = getTransferSolInstruction({
        amount: lamports(amount),
        source: wallet,
        destination: destAddress
    });

    // Send the transaction
    console.log("Sending the transaction using Orca's tx-sender...");
    const txHash = await buildAndSendTransaction([instruction], wallet);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));
