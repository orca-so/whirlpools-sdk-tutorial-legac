import { createKeyPairFromBytes, createKeyPairSignerFromBytes, createSolanaRpc, getAddressFromPublicKey } from "@solana/kit";

import secret from "../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    //LANG:JP Devnet の RPC への要求用のコネクションを作成
    //LANG:EN Create a connection for sending RPC requests to Devnet
    //LANG:KR Devnet RPC에 요청을 보내기 위한 커넥션 생성
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);

    //LANG:JP wallet.json から秘密鍵を読み込み (秘密鍵と公開鍵のペアは Keypair クラスで管理する)
    //LANG:EN Read in the private key from wallet.json (The public and private key pair will be managed using the Keypair class)
    //LANG:KR wallet.json에서 개인키 로딩 (공개키/비밀키 쌍은 Keypair 클래스로 관리됩니다)
    const wallet = await createKeyPairSignerFromBytes(new Uint8Array(secret));

    //LANG:JP 使用する RPC とウォレットの公開鍵を表示
    //LANG:JP 公開鍵を表示する場合は Base58 形式の文字列で表示する
    //LANG:EN Display the wallet's public key
    //LANG:EN When displaying the public key, use base58 encoding
    //LANG:KR 사용 중인 RPC와 지갑의 공개 키를 출력
    //LANG:KR 공개 키를 표시할 때는 Base58 형식의 문자열을 사용함
    console.log("wallet address: ", wallet.address);

    //LANG:JP SOL 残高取得
    //LANG:JP Rpc クラスの getBalance メソッドを利用する
    //LANG:EN Obtain the SOL balance
    //LANG:EN Use the getBalance method from the Rpc class
    //LANG:KR SOL 잔액을 조회
    //LANG:KR Rpc 클래스의 getBalance 함수를 활용
    const solBalance = await rpc.getBalance(wallet.address).send();

    //LANG:JP SOL 残高表示
    //LANG:JP lamports 単位の整数で内部管理されているため SOL 単位にするには 10^9 で割る (1 SOL = 10^9 lamports)
    //LANG:EN Display the SOL balance
    //LANG:EN Since SOL is internally managed as an integer value and denominated in lamports,
    //LANG:EN divide by 10^9 to obtain a value denominated in SOL.
    //LANG:KR SOL 잔액을 로그로 출력
    //LANG:KR lamports 단위이므로 10^9로 나누어 실제 SOL 단위로 변환 (1 SOL = 10^9 lamports)
    console.log("lamports: ", solBalance.value);
    console.log("SOL: ", Number(solBalance.value) / 10 ** 9);
}

main();