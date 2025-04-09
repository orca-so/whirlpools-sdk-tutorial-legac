import { createKeyPairFromBytes, createSolanaRpc, getAddressFromPublicKey } from "@solana/kit";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // Devnet RPC에 요청을 보내기 위한 커넥션 생성
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);

    // wallet.json에서 개인키 로딩 (공개키/비밀키 쌍은 Keypair 클래스로 관리됩니다)
    const keypair = await createKeyPairFromBytes(new Uint8Array(secret));
    const walletAddress = await getAddressFromPublicKey(keypair.publicKey);

    // 사용 중인 RPC와 지갑의 공개 키를 출력
    // 공개 키를 표시할 때는 Base58 형식의 문자열을 사용함
    console.log("wallet address: ", walletAddress);

    // SOL 잔액을 조회
    // Rpc 클래스의 getBalance 함수를 활용
    const solBalance = await rpc.getBalance(walletAddress, { commitment: "confirmed" }).send();

    // SOL 잔액을 로그로 출력
    // lamports 단위이므로 10^9로 나누어 실제 SOL 단위로 변환 (1 SOL = 10^9 lamports)
    console.log("balance(lamports): ", solBalance.value);
    console.log("balance(sol): ", Number(solBalance.value) / 10**9);
}

main();
