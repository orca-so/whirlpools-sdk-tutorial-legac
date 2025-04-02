import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import { setPayerFromBytes } from "@orca-so/whirlpools";

import secret from "../wallet.json";
import dotenv from "dotenv";
import { address } from "@solana/kit";
import { findAssociatedTokenPda, getTransferCheckedInstruction, getTransferInstruction } from "@solana-program/token";

dotenv.config();

async function main() {
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    
    console.log("signer:", signer.address);

    const tokenMint = address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"); // devSAMO
    const tokenAmount = BigInt(100_000_000); // 0.1 devSAMO
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    const TOKEN_PROGRAM_ID = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    const [associatedTokenAddress, bump] = await findAssociatedTokenPda({
        owner: signer.address,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
    });
    console.log("associatedTokenAddress:", associatedTokenAddress);

    const [destAssociatedTokenAddress, destBump] = await findAssociatedTokenPda({
        owner: destAddress,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
    });
    console.log("destAssociatedTokenAddress:", destAssociatedTokenAddress);

    const instruction = getTransferCheckedInstruction({
        amount: tokenAmount,
        mint: tokenMint,
        source: associatedTokenAddress,
        destination: destAssociatedTokenAddress,
        decimals: 9,
        authority: signer.address,
    });
    console.log("instruction:", instruction);

    const txHash = await buildAndSendTransaction([instruction], signer);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));