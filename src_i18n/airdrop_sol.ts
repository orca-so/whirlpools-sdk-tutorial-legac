import { setPayerFromBytes } from "@orca-so/whirlpools";
import secret from "../wallet.json";
import dotenv from "dotenv";
import { createSolanaRpc, devnet, lamports } from "@solana/kit";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(devnet(process.env.RPC_ENDPOINT_URL));

    const signer = await setPayerFromBytes(new Uint8Array(secret));

    const signature = await rpc.requestAirdrop(signer.address, lamports(1_000_000_000n)).send(); // 1 SOL
    console.log("signature:", signature);

    const solBalance = await rpc.getBalance(signer.address).send();
    console.log("solBalance:", solBalance.value);
}

main().catch((e) => console.error("error:", e));