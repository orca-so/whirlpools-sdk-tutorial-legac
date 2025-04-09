import { buildAndSendTransaction, setRpc } from "@orca-so/tx-sender";
import { setPayerFromBytes } from "@orca-so/whirlpools";

import secret from "../../wallet.json";
import dotenv from "dotenv";
import { address } from "@solana/kit";
import {findAssociatedTokenPda, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS} from "@solana-program/token";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화하고 개인키를 로딩
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log("signer:", signer.address);

    // devSAMO
    // https://everlastingsong.github.io/nebula/
    const tokenMint = address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"); // devSAMO

    // 전송할 수량
    const tokenAmount = BigInt(100_000_000); // 0.1 devSAMO

    // 송신자의 연관 토큰 계정을 가져옴
    const [srcTokenAccount] = await findAssociatedTokenPda({
        owner: signer.address,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("srcTokenAccount:", srcTokenAccount);

    // devSAMO를 전송할 대상 지갑
    const destAddress = address("vQW71yo6X1FjTwt9gaWtHYeoGMu7W9ehSmNiib7oW5G");

    // 수신자의 연관 토큰 계정을 가져옴 (계정이 없으면 create_ata_ix에 계정 생성 명령이 포함됩니다)
    const [destTokenAccount] = await findAssociatedTokenPda({
        owner: destAddress,
        mint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log("destTokenAccount:", destTokenAccount);

    // devSAMO를 전송하기 위한 명령을 생성
    const instruction = getTransferCheckedInstruction({
        amount: tokenAmount,
        mint: tokenMint,
        source: srcTokenAccount,
        destination: destTokenAccount,
        decimals: 9,
        authority: signer.address,
    });
    console.log("instruction:", instruction);

    // 트랜잭션 전파
    const txHash = await buildAndSendTransaction([instruction], signer);
    console.log("txHash:", txHash);
}

main().catch(e => console.error("error:", e));
