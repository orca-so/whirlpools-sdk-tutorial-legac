import { createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import secret from "../../wallet.json";
import dotenv from "dotenv";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { fetchToken, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const wallet = await createKeyPairSignerFromBytes(new Uint8Array(secret));

    // https://everlastingsong.github.io/nebula/
    // devToken specification
    const tokenDefs = {
        "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k": { name: "devUSDC", decimals: 6, program: TOKEN_PROGRAM_ADDRESS },
        "H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm": { name: "devUSDT", decimals: 6, program: TOKEN_PROGRAM_ADDRESS },
        "Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa": { name: "devSAMO", decimals: 9, program: TOKEN_PROGRAM_ADDRESS },
        "Afn8YB1p4NsoZeS5XJBZ18LTfEy5NFPwN46wapZcBQr6": { name: "devTMAC", decimals: 6, program: TOKEN_PROGRAM_ADDRESS },
        "Hy5ZLF26P3bjfVtrt4qDQCn6HGhS5izb5SNv7P9qmgcG": { name: "devPYUSD", decimals: 6, program: TOKEN_2022_PROGRAM_ADDRESS },
        "9fcwFnknB7cZrpVYQxoFgt9haYe59G7bZyTYJ4PkYjbS": { name: "devBERN", decimals: 5, program: TOKEN_2022_PROGRAM_ADDRESS },
        "FKUPCock94bCnKqsi7UgqxnpzQ43c6VHEYhuEPXYpoBk": { name: "devSUSD", decimals: 6, program: TOKEN_2022_PROGRAM_ADDRESS },
    };

    // Obtain the token accounts from the wallet's public key
    //
    // {
    //   context: { apiVersion: '2.2.3', slot: 373019172n },
    //   value: [
    //     { account: [Object], pubkey: 'string' },
    //     { account: [Object], pubkey: 'string' },
    //     { account: [Object], pubkey: 'string' },
    //     { account: [Object], pubkey: 'string' }
    //   ]
    // }
    const accounts = await rpc.getTokenAccountsByOwner(
        wallet.address,
        { programId: TOKEN_PROGRAM_ADDRESS },
        { encoding: "base64" }
    ).send();
    console.log("getTokenAccountsByOwner:", accounts);
    const accounts2022 = await rpc.getTokenAccountsByOwner(
        wallet.address,
        { programId: TOKEN_2022_PROGRAM_ADDRESS },
        { encoding: "base64" }
    ).send();
    console.log("getTokenAccountsByOwner(2022):", accounts2022);
    const allAccounts = [...accounts.value, ...accounts2022.value];

    for (let i = 0; i < allAccounts.length; i++) {
        const value = allAccounts[i];

        // Fetch token account data
        const tokenData = await fetchToken(rpc, value.pubkey);

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
