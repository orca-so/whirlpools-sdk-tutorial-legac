import { address, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions, sendAndConfirmTransactionFactory } from "@solana/kit";
import { fetchPosition } from "@orca-so/whirlpools-client";
import dotenv from "dotenv";
import secret from "../wallet.json";
import { harvestPositionInstructions, setJitoTipSetting, setPriorityFeeSetting, setRpc } from "@orca-so/whirlpools";
import { buildAndSendTransaction } from "@orca-so/tx-sender";

dotenv.config();

async function main() {
    try {
        const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
        const rpcSubscriptions = createSolanaRpcSubscriptions(process.env.WS_ENDPOINT_URL);
        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
        const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
        console.log('wallet address:', signer.address);
    
        const positionAddress = process.env.WHIRLPOOL_POSITION;
        const positionPubKey = address(positionAddress);
        const position = await fetchPosition(rpc, positionPubKey);
        console.log('position', position);
        
        const { feesQuote, rewardsQuote, instructions} = await harvestPositionInstructions(rpc, position.data.positionMint, signer);
        console.log('feesQuote', feesQuote);
        console.log('rewardsQuote', rewardsQuote);
        console.log('harvest instructions', instructions);

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