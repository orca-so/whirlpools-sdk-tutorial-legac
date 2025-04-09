import { setPayerFromBytes } from "@orca-so/whirlpools";
import secret from "../wallet.json";
import dotenv from "dotenv";
import { createSolanaRpc, lamports } from "@solana/kit";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);

    const signer = await setPayerFromBytes(new Uint8Array(secret));

    const signature = await rpc.requestAirdrop(signer.address, lamports(BigInt(1_000_000_000))).send(); // 1 SOL
    console.log("signature:", signature);

    const solBalance = await rpc.getBalance(signer.address).send();
    console.log("solBalance:", solBalance);
}

main().catch((e) => console.error("error:", e));