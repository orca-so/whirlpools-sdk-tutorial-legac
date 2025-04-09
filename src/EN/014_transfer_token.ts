import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import { setPayerFromBytes } from "@orca-so/whirlpools";

import secret from "../../wallet.json";
import dotenv from "dotenv";
import { address } from "@solana/kit";
import {findAssociatedTokenPda, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS} from "@solana-program/token";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log("signer:", signer.address);

    // devSAMO
    // https://everlastingsong.github.io/nebula/
    const tokenMint = address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"); // devSAMO

    // Amount to send
    const tokenAmount = BigInt(100_000_000); // 0.1 devSAMO

    // Obtain the associated token account from the source wallet
    const [srcTokenAccount] = await findAssociatedTokenPda({
        owner: signer.address,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("srcTokenAccount:", srcTokenAccount);

    // Destination wallet for the devSAMO
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    // Obtain the associated token account for the destination wallet.
    const [destTokenAccount] = await findAssociatedTokenPda({
        owner: destAddress,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("destTokenAccount:", destTokenAccount);

    // Create the instruction to send devSAMO
    const instruction = getTransferCheckedInstruction({
        amount: tokenAmount,
        mint: tokenMint,
        source: srcTokenAccount,
        destination: destTokenAccount,
        decimals: 9,
        authority: signer.address,
    });
    console.log("instruction:", instruction);

    // Send the transaction
    const txHash = await buildAndSendTransaction([instruction], signer);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));
