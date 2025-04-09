import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import { setPayerFromBytes } from "@orca-so/whirlpools";

import secret from "../../wallet.json";
import dotenv from "dotenv";
import { address } from "@solana/kit";
import {findAssociatedTokenPda, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS} from "@solana-program/token";

dotenv.config();

async function main() {
    // RPC へのコネクション作成、秘密鍵読み込み
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log("signer:", signer.address);

    // devSAMO
    // https://everlastingsong.github.io/nebula/
    const tokenMint = address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"); // devSAMO

    // 送る量
    const tokenAmount = BigInt(100_000_000); // 0.1 devSAMO

    // 送信元のトークンアカウント取得
    const [srcTokenAccount] = await findAssociatedTokenPda({
        owner: signer.address,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("srcTokenAccount:", srcTokenAccount);

    // devSAMOの送信先のウォレット
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    // 送信先のトークンアカウント取得 (トークンアカウントが存在しない場合は create_ata_ix に作成用の命令が入る)
    const [destTokenAccount] = await findAssociatedTokenPda({
        owner: destAddress,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("destTokenAccount:", destTokenAccount);

    // devSAMOを送る命令を作成
    const instruction = getTransferCheckedInstruction({
        amount: tokenAmount,
        mint: tokenMint,
        source: srcTokenAccount,
        destination: destTokenAccount,
        decimals: 9,
        authority: signer.address,
    });
    console.log("instruction:", instruction);

    // トランザクションを送信
    const txHash = await buildAndSendTransaction([instruction], signer);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));
