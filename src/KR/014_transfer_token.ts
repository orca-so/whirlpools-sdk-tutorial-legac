import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import secret from "../../wallet.json";
import dotenv from "dotenv";
import { address, createKeyPairSignerFromBytes } from "@solana/kit";
import { findAssociatedTokenPda, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화하고 개인키를 로딩
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const wallet = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log("wallet:", wallet.address);

    // devSAMO
    // https://everlastingsong.github.io/nebula/
    const tokenMint = address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"); // devSAMO
    const tokenDecimals = 9;

    // devSAMO를 전송할 대상 지갑
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    // 전송할 수량
    const amount = 1_000_000_000n; // 1 devSAMO

    // 송신자의 연관 토큰 계정을 가져옴
    const [srcTokenAccount] = await findAssociatedTokenPda({
        owner: wallet.address,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("srcTokenAccount:", srcTokenAccount);

    // 수신자의 연관 토큰 계정을 가져옴 (계정이 없으면 create_ata_ix에 계정 생성 명령이 포함됩니다)
    const [destTokenAccount] = await findAssociatedTokenPda({
        owner: destAddress,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("destTokenAccount:", destTokenAccount);

    // devSAMO를 전송하기 위한 명령을 생성
    const instruction = getTransferCheckedInstruction({
        amount: amount,
        mint: tokenMint,
        source: srcTokenAccount,
        destination: destTokenAccount,
        decimals: tokenDecimals,
        authority: wallet.address,
    });

    // 트랜잭션 전파
    console.log("Sending the transaction using Orca's tx-sender...");
    const txHash = await buildAndSendTransaction([instruction], wallet);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));
