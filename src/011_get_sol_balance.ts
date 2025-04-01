import { createKeyPairFromBytes, createSolanaRpc, getAddressFromPublicKey } from "@solana/kit";
import secret from "../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);

    const keypair = await createKeyPairFromBytes(new Uint8Array(secret));
    const walletAddress = await getAddressFromPublicKey(keypair.publicKey);
    console.log("wallet address: ", walletAddress);

    const result = await rpc.getBalance(walletAddress, { commitment: "confirmed" }).send();
    console.log("balance(lamports): ", result.value);
    console.log("balance(sol): ", Number(result.value) / 10**9);
}

main();