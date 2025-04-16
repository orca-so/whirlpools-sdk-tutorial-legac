import { address, createKeyPairSignerFromBytes, lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";

import secret from "../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC 연결을 초기화하고 개인키를 로딩
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const wallet = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log("wallet:", wallet.address);

    //LANG:JP SOLの宛先
    //LANG:EN SOL destination
    //LANG:KR SOL을 전송할 대상
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    //LANG:JP 送る量
    //LANG:EN Amount to send
    //LANG:KR 전송할 금액
    const amount = 10_000_000n; // lamports = 0.01 SOL

    //LANG:JP SOLを送る命令を作成
    //LANG:EN Build the instruction to send SOL
    //LANG:KR SOL을 전송하기 위한 명령을 생성
    const instruction = getTransferSolInstruction({
        amount: lamports(amount),
        source: wallet,
        destination: destAddress
    });

    //LANG:JP トランザクションを送信
    //LANG:EN Send the transaction
    //LANG:KR 트랜잭션을 전송
    console.log("Sending the transaction using Orca's tx-sender...");
    const txHash = await buildAndSendTransaction([instruction], wallet);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));