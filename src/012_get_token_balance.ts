import { address, createKeyPairFromBytes, createSolanaRpc, Decoder, fixDecoderSize, getAddressFromPublicKey, getU64Codec } from "@solana/kit";
import secret from "../wallet.json";
import dotenv from "dotenv";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { unpackSplAccount } from "./utils/spl_token_utils";
import { DecimalUtil } from "@orca-so/common-sdk";
import BN from "bn.js";
import { decodeToken, getTokenDecoder } from "@solana-program/token";

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
    }

    const accounts = await rpc.getTokenAccountsByOwner(walletAddress, 
        { programId: address(TOKEN_PROGRAM_ID.toString()) }, 
        { commitment: "confirmed", encoding: "base64" }).send();
    console.log("getTokenAccountsByOwner:", accounts);

    for (let i = 0; i < accounts.value.length; i++) {
        const value = accounts.value[i];

        const decoder = getTokenDecoder();
        const parsedTokenData = decoder.decode(Buffer.from(value.account.data[0], "base64"));
        console.log("tokenData:", parsedTokenData);

        const mint = parsedTokenData.mint;
        const tokenDef = tokenDefs[mint];
        if (tokenDef === undefined) continue;

        const amount = parsedTokenData.amount;
        const uiAmount = DecimalUtil.fromBN(new BN(amount.toString()), tokenDef.decimals);

        console.log(
            "TokenAccount:", value.pubkey,
            "\n  mint:", mint,
            "\n  name:", tokenDef.name,
            "\n  amount:", uiAmount,
        );
    }
}

main();