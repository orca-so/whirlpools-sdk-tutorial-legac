import { getCreateAccountInstruction } from "@solana-program/system";
import { getInitializeMint2Instruction, } from "@solana-program/token";
import { Address, appendTransactionMessageInstructions, createTransactionMessage, generateKeyPairSigner, getBase64EncodedWireTransaction, getSignatureFromTransaction, getTransactionEncoder, KeyPairSigner, pipe, Rpc, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners, SolanaRpcApi } from "@solana/kit";
import { getMintLen, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export async function createMint(
    rpc: Rpc<SolanaRpcApi>, 
    payer: KeyPairSigner, 
    mintAuthority: Address, 
    freezeAuthority: Address,
    decimals: number,
    programId = TOKEN_PROGRAM_ID,
) {
    const keypair = await generateKeyPairSigner();
    const mintLen = getMintLen([]);
    const lamports = await rpc.getMinimumBalanceForRentExemption(BigInt(mintLen)).send();

    const createAccountInstruction = getCreateAccountInstruction({
        payer: payer,
        newAccount: keypair,
        lamports,
        space: mintLen,
        programAddress: keypair.address,
    });

    const encodedInstruction = getInitializeMint2Instruction({
        mint: keypair.address,
        decimals,
        mintAuthority,
        freezeAuthority,
    });

    const { value: latestBlockHash } = await rpc.getLatestBlockhash().send();

    const transactionMessages = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(payer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockHash, tx),
        tx => appendTransactionMessageInstructions([createAccountInstruction, encodedInstruction], tx),
    );

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessages);
    console.log("CreateMint signature:", getSignatureFromTransaction(signedTransaction));

    const base64EncodedTx = getBase64EncodedWireTransaction(signedTransaction);

    const result = await rpc.sendTransaction(base64EncodedTx).send();
    console.log("CreateMint result:", result);

    return keypair.address;
}