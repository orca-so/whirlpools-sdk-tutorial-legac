import { buildAndSendTransaction, setJitoTipSetting, setPriorityFeeSetting, setRpc } from "@orca-so/tx-sender";
import { setPayerFromBytes, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchPositionBundle, getInitializePositionBundleInstruction } from "@orca-so/whirlpools-client";
import { address, createSolanaRpc, generateKeyPairSigner } from "@solana/kit";

import secret from "../wallet.json";
import dotenv from "dotenv";
import { findAssociatedTokenPda } from "@solana-program/token";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    setJitoTipSetting({
        type: "dynamic",
    });
    
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    const TOKEN_PROGRAM_ID = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const ASSOCIATED_TOKEN_PROGRAM_ID = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const positionBundleKeyPair = await generateKeyPairSigner();
    const positionBundlePda = await fetchPositionBundle(rpc, positionBundleKeyPair.address);
    const positionBundleTokenAccount = await findAssociatedTokenPda(
        {
            mint: positionBundleKeyPair.address,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ID,
        }
    );

    const initializePositionBundleIx = getInitializePositionBundleInstruction(
        {
            funder: signer,        
            positionBundle: positionBundlePda.address,
            positionBundleMint: positionBundleKeyPair,
            positionBundleTokenAccount: positionBundleTokenAccount[0],
            positionBundleOwner: signer.address,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        }
    );

    const tx = await buildAndSendTransaction([initializePositionBundleIx], signer);
    console.log("tx:", tx);
}

main().catch((e) => console.error("error:", e));