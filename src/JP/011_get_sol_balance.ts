import { createKeyPairFromBytes, createKeyPairSignerFromBytes, createSolanaRpc, getAddressFromPublicKey } from "@solana/kit";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // Devnet の RPC への要求用のコネクションを作成
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);

    // wallet.json から秘密鍵を読み込み (秘密鍵と公開鍵のペアは Keypair クラスで管理する)
    const wallet = await createKeyPairSignerFromBytes(new Uint8Array(secret));

    // 使用する RPC とウォレットの公開鍵を表示
    // 公開鍵を表示する場合は Base58 形式の文字列で表示する
    console.log("wallet address: ", wallet.address);

    // SOL 残高取得
    // Rpc クラスの getBalance メソッドを利用する
    const solBalance = await rpc.getBalance(wallet.address).send();

    // SOL 残高表示
    // lamports 単位の整数で内部管理されているため SOL 単位にするには 10^9 で割る (1 SOL = 10^9 lamports)
    console.log("lamports: ", solBalance.value);
    console.log("SOL: ", Number(solBalance.value) / 10 ** 9);
}

main();
