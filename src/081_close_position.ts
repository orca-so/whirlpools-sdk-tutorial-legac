import { address, createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import secret from "../wallet.json";
import dotenv from "dotenv";
import { fetchPosition } from "@orca-so/whirlpools-client";
import { closePositionInstructions, setJitoTipSetting, setPriorityFeeSetting, setRpc } from "@orca-so/whirlpools";
import { buildAndSendTransaction } from "@orca-so/tx-sender";

dotenv.config();

async function main() {
    try {
        const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
        
        const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
        console.log('wallet address:', signer.address);
    
        const positionAddress = process.env.WHIRLPOOL_POSITION;
        const positionPubKey = address(positionAddress);
        const position = await fetchPosition(rpc, positionPubKey);
        console.log('position', position);
    
        const { instructions } = await closePositionInstructions(rpc, position.data.positionMint, 0.01, signer);
        console.log('instructions', instructions);

        await setRpc(process.env.RPC_ENDPOINT_URL);
        setPriorityFeeSetting({
            type: "dynamic",
            maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
        });
        setJitoTipSetting({
            type: "dynamic",
        });
        const txHash = await buildAndSendTransaction(
            instructions,
            signer,
        );
        console.log('txHash:', txHash);
    } catch (e) {
        console.error("error", e);
    }
}

main();