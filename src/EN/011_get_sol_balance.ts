import { createKeyPairFromBytes, createKeyPairSignerFromBytes, createSolanaRpc, getAddressFromPublicKey } from "@solana/kit";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // Create a connection for sending RPC requests to Devnet
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);

    // Read in the private key from wallet.json (The public and private key pair will be managed using the Keypair class)
    const wallet = await createKeyPairSignerFromBytes(new Uint8Array(secret));

    // Display the wallet's public key
    // When displaying the public key, use base58 encoding
    console.log("wallet address: ", wallet.address);

    // Obtain the SOL balance
    // Use the getBalance method from the Rpc class
    const solBalance = await rpc.getBalance(wallet.address).send();

    // Display the SOL balance
    // Since SOL is internally managed as an integer value and denominated in lamports,
    // divide by 10^9 to obtain a value denominated in SOL.
    console.log("lamports: ", solBalance.value);
    console.log("SOL: ", Number(solBalance.value) / 10 ** 9);
}

main();
