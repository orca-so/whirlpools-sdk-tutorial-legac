import { createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import { fetchPositionsForOwner } from "@orca-so/whirlpools";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成
    //LANG:EN Initialize a connection to the RPC
    //LANG:KR RPC에 연결을 초기화
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    //LANG:JP ポジションのアドレスを出力
    //LANG:EN Output the address of the positions
    //LANG:KR 포지션 주소 출력
    const positions = await fetchPositionsForOwner(rpc, signer.address);
    console.log("positions:", positions);
}

main().catch(console.error);