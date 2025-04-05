import { address, createKeyPairFromBytes, createSolanaRpc, getAddressFromPublicKey } from "@solana/kit";
import secret from "../wallet.json";
import dotenv from "dotenv";
import { fetchToken } from "@solana-program/token";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);

    const keypair = await createKeyPairFromBytes(new Uint8Array(secret));
    const walletAddress = await getAddressFromPublicKey(keypair.publicKey);
    const tokenDefs = {
        "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k": {name: "devUSDC", decimals: 6},
        "H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm": {name: "devUSDT", decimals: 6},
        "Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa":  {name: "devSAMO", decimals: 9},
        "Afn8YB1p4NsoZeS5XJBZ18LTfEy5NFPwN46wapZcBQr6": {name: "devTMAC", decimals: 6},
    };
    const TOKEN_PROGRAM_ID = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    const accounts = await rpc.getTokenAccountsByOwner(walletAddress, 
        { programId: TOKEN_PROGRAM_ID }, 
        { commitment: "confirmed", encoding: "base64" }).send();
    console.log("getTokenAccountsByOwner:", accounts);

    for (let i = 0; i < accounts.value.length; i++) {
        const value = accounts.value[i];

        const tokenData = await fetchToken(rpc, value.pubkey);
        console.log("tokenData:", tokenData);

        const mint = tokenData.data.mint;
        const tokenDef = tokenDefs[mint];
        if (tokenDef === undefined) continue;

        const amount = tokenData.data.amount;

        console.log(
            "TokenAccount:", value.pubkey,
            "\n  mint:", mint,
            "\n  name:", tokenDef.name,
            "\n  amount:", amount,
        );
    }
}

main();