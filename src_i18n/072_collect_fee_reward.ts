import { address, createSolanaRpc } from "@solana/kit";
import { fetchPosition } from "@orca-so/whirlpools-client";
import { harvestPosition, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc } from "@orca-so/whirlpools";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    //LANG:JP ポジション・プール取得
    //LANG:EN Get the position and the pool to which the position belongs
    //LANG:KR 포지션과 해당 포지션이 속한 풀 가져옴
    const positionAddress = process.env.WHIRLPOOL_POSITION;
    const positionPubKey = address(positionAddress);
    const position = await fetchPosition(rpc, positionPubKey);
    console.log('position', position);

    //LANG:JP ポジションの収益を収穫するためのトランザクションを生成
    //LANG:EN Create a transaction to harvest the position's earnings
    //LANG:KR 포지션의 수익을 수확하기 위한 트랜잭션 생성
    const { instructions, callback: executeHarvest } = await harvestPosition(position.data.positionMint);
    console.log('instructions', instructions);

    //LANG: JP 収穫トランザクション実行
    //LANG: EN Execute harvest transaction
    //LANG: KR 수확 트랜잭션 실행
    const signature = await executeHarvest();
    console.log('signature', signature);
}

main().catch(e => console.error("error:", e));