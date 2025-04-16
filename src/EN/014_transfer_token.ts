import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import secret from "../../wallet.json";
import dotenv from "dotenv";
import { address, createKeyPairSignerFromBytes } from "@solana/kit";
import { findAssociatedTokenPda, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const wallet = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log("wallet:", wallet.address);

    // devSAMO
    // https://everlastingsong.github.io/nebula/
    const tokenMint = address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"); // devSAMO
    const tokenDecimals = 9;

    // Destination wallet for the devSAMO
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    // Amount to send
    const amount = 1_000_000_000n; // 1 devSAMO

    // Obtain the associated token account from the source wallet
    const [srcTokenAccount] = await findAssociatedTokenPda({
        owner: wallet.address,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("srcTokenAccount:", srcTokenAccount);

    // Obtain the associated token account for the destination wallet.
    const [destTokenAccount] = await findAssociatedTokenPda({
        owner: destAddress,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("destTokenAccount:", destTokenAccount);

    // Create the instruction to send devSAMO
    const instruction = getTransferCheckedInstruction({
        amount: amount,
        mint: tokenMint,
        source: srcTokenAccount,
        destination: destTokenAccount,
        decimals: tokenDecimals,
        authority: wallet.address,
    });

    // Send the transaction
    console.log("Sending the transaction using Orca's tx-sender...");
    const txHash = await buildAndSendTransaction([instruction], wallet);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));
