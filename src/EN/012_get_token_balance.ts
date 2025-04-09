import { address, createKeyPairFromBytes, createSolanaRpc, getAddressFromPublicKey } from "@solana/kit";
import secret from "../../wallet.json";
import dotenv from "dotenv";
import { fetchToken } from "@solana-program/token";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const keypair = await createKeyPairFromBytes(new Uint8Array(secret));
    const walletAddress = await getAddressFromPublicKey(keypair.publicKey);

    // https://everlastingsong.github.io/nebula/
    // devToken specification
    const tokenDefs = {
        "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k": {name: "devUSDC", decimals: 6},
        "H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm": {name: "devUSDT", decimals: 6},
        "Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa":  {name: "devSAMO", decimals: 9},
        "Afn8YB1p4NsoZeS5XJBZ18LTfEy5NFPwN46wapZcBQr6": {name: "devTMAC", decimals: 6},
    };
    const TOKEN_PROGRAM_ID = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    // Obtain the token accounts from the wallet's public key
    //
    // {
    //   context: { apiVersion: '2.2.3', slot: 373019172n },
    //   value: [
    //     { account: [Object], pubkey: [PublicKey] },
    //     { account: [Object], pubkey: [PublicKey] },
    //     { account: [Object], pubkey: [PublicKey] },
    //     { account: [Object], pubkey: [PublicKey] }
    //   ]
    // }
    const accounts = await rpc.getTokenAccountsByOwner(walletAddress, 
        { programId: TOKEN_PROGRAM_ID }, 
        { commitment: "confirmed", encoding: "base64" }).send();
    console.log("getTokenAccountsByOwner:", accounts);

    for (let i = 0; i < accounts.value.length; i++) {
        const value = accounts.value[i];

        // Fetch token account data
        const tokenData = await fetchToken(rpc, value.pubkey);
        console.log("tokenData:", tokenData);

        // Use the mint address to determine which token account is for which token
        const mint = tokenData.data.mint;
        const tokenDef = tokenDefs[mint];
        if (tokenDef === undefined) continue;

        // The balance is "amount"
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
