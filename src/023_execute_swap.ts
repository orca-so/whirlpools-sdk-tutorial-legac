import { setWhirlpoolsConfig, swapInstructions } from "@orca-so/whirlpools";
import { address, appendTransactionMessageInstructions, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions, createTransactionMessage, getSignatureFromTransaction, isSolanaError, pipe, sendAndConfirmTransactionFactory, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners } from "@solana/kit";
import { getSystemErrorMessage, isSystemError } from "@solana-program/system";
import { getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const rpcSubscriptions = createSolanaRpcSubscriptions(process.env.WS_ENDPOINT_URL);
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");

    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const tickSpacing = 64;

    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());
    const whirlpoolPda = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda", whirlpoolPda);

    const { instructions, quote } = await swapInstructions(
        rpc,
        {
            inputAmount: BigInt(1_000_000),
            mint: devUSDC.mint,
        },
        whirlpoolPda[0],
        0.01,
        signer,
    );
    console.log("instructions:", instructions);
    console.log("quote:", quote);

    const latestBlockHash = await rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(signer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockHash.value, tx),
        tx => appendTransactionMessageInstructions(instructions, tx),
    );
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    console.log("signedTransaction:", signedTransaction);
    console.log("signatures:", getSignatureFromTransaction(signedTransaction));

    try {
        await sendAndConfirmTransaction(signedTransaction, { commitment: "confirmed" });
        console.log('Transfer confirmed')
    } catch (e) {
        if (isSolanaError(e)) {
            const preflightErrorContext = e.context;
            const preflightErrorMessage = e.message;
            const errorDetailMessage = isSystemError(e.cause, transactionMessage)
                ? getSystemErrorMessage(e.cause.context.code)
                : e.message;
            console.log(preflightErrorContext, `${preflightErrorMessage}: ${errorDetailMessage}`);
        } else {
            throw e;
        }
    }
}

main();