import { buildAndSendTransaction, setPriorityFeeSetting, setRpc } from "@orca-so/tx-sender";
import { setPayerFromBytes, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchPositionBundle, getInitializePositionBundleInstruction } from "@orca-so/whirlpools-client";
import { createSolanaRpc, generateKeyPairSigner } from "@solana/kit";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // RPC へのコネクション作成、秘密鍵読み込み
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // PositionBundle 用の Mint, PDA, ATA のアドレスを生成
    const positionBundleKeyPair = await generateKeyPairSigner();
    const positionBundlePda = await fetchPositionBundle(rpc, positionBundleKeyPair.address);
    const positionBundleTokenAccount = await findAssociatedTokenPda(
        {
            mint: positionBundleKeyPair.address,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
        }
    );

    // PositionBundle 初期化命令を作成
    const initializePositionBundleIx = getInitializePositionBundleInstruction(
        {
            funder: signer,        
            positionBundle: positionBundlePda.address,
            positionBundleMint: positionBundleKeyPair,
            positionBundleTokenAccount: positionBundleTokenAccount[0],
            positionBundleOwner: signer.address,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
        }
    );

    // トランザクションを送信
    const tx = await buildAndSendTransaction([initializePositionBundleIx], signer);
    console.log("tx:", tx);
}

main().catch((e) => console.error("error:", e));
