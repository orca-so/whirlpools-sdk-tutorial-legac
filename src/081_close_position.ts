import { address, createSolanaRpc } from "@solana/kit";
import secret from "../wallet.json";
import dotenv from "dotenv";
import { fetchPosition } from "@orca-so/whirlpools-client";
import { closePosition, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";

dotenv.config();

async function main() {
    try {
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
    
        const positionAddress = process.env.WHIRLPOOL_POSITION;
        const positionPubKey = address(positionAddress);
        const position = await fetchPosition(rpc, positionPubKey);
        console.log('position', position);

        const { instructions, callback: executeClosePosition } = await closePosition(position.data.positionMint, 0.01);
        console.log('instructions', instructions);

        const signature = await executeClosePosition();
        console.log('signature', signature);
    } catch (e) {
        console.error("error", e);
    }
}

main();