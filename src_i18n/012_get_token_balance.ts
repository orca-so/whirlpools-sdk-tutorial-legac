import { address, createKeyPairFromBytes, createSolanaRpc, getAddressFromPublicKey } from "@solana/kit";
import secret from "../wallet.json";
import dotenv from "dotenv";
import { fetchToken } from "@solana-program/token";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 불러옴
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const keypair = await createKeyPairFromBytes(new Uint8Array(secret));
    const walletAddress = await getAddressFromPublicKey(keypair.publicKey);

    // https://everlastingsong.github.io/nebula/
    // devToken specification
    const tokenDefs = {
        "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k": {name: "devUSDC", decimals: 6},
        "H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm": {name: "devUSDT", decimals: 6},
        "Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa":  {name: "devSAMO", decimals: 9},
        "Afn8YB1p4NsoZeS5XJBZ18LTfEy5NFPwN46wapZcBQr6": {name: "devTMAC", decimals: 6},
    };
    const TOKEN_PROGRAM_ID = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    //LANG:JP ウォレットの公開鍵からトークンアカウントを取得
    //LANG:EN Obtain the token accounts from the wallet's public key
    //LANG:KR 지갑의 공개 키로부터 토큰 계정을 조회
    //
    // {
    //   context: { apiVersion: '2.2.3', slot: 373019172n },
    //   value: [
    //     { account: [Object], pubkey: [PublicKey] },
    //     { account: [Object], pubkey: [PublicKey] },
    //     { account: [Object], pubkey: [PublicKey] },
    //     { account: [Object], pubkey: [PublicKey] }
    //   ]
    // }
    const accounts = await rpc.getTokenAccountsByOwner(walletAddress, 
        { programId: TOKEN_PROGRAM_ID }, 
        { commitment: "confirmed", encoding: "base64" }).send();
    console.log("getTokenAccountsByOwner:", accounts);

    for (let i = 0; i < accounts.value.length; i++) {
        const value = accounts.value[i];

        //LANG:JP トークンアカウントデータを取得する
        //LANG:EN Fetch token account data
        //LANG:KR 토큰 계정 데이터를 가져옴
        const tokenData = await fetchToken(rpc, value.pubkey);
        console.log("tokenData:", tokenData);

        //LANG:JP mint アドレスからどのトークンのトークンアカウントか特定
        //LANG:EN Use the mint address to determine which token account is for which token
        //LANG:KR mint 주소를 사용해 어떤 토큰 계정인지 식별
        const mint = tokenData.data.mint;
        const tokenDef = tokenDefs[mint];
        if (tokenDef === undefined) continue;

        //LANG:JP 残高は amount
        //LANG:EN The balance is "amount"
        //LANG:KR 잔액을 amount 필드에 저장
        const amount = tokenData.data.amount;

        console.log(
            "TokenAccount:", value.pubkey,
            "\n  mint:", mint,
            "\n  name:", tokenDef.name,
            "\n  amount:", amount,
        );
    }
}

main();