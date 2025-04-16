import { address, createSolanaRpc } from "@solana/kit";
import { fetchPosition } from "@orca-so/whirlpools-client";
import { closePosition, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";

import secret from "../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    ///LANG:JP 環境変数 POSITION_MINT からポジションのアドレスを読み込み
    //LANG:EN Retrieve the POSITION_MINT environment variable
    //LANG:KR 환경변수 WHIRLPOOL_POSITION에서 포지션 주소를 가져옴
    const positionMint = address(process.env.POSITION_MINT);

    //LANG:JP 許容するスリッページを設定
    //LANG:EN Set acceptable slippage
    //LANG:KR 허용 슬리피지 설정
    const slippage = 100; // 100bps = 1%

    const { feesQuote, rewardsQuote, callback: sendTx } = await closePosition(positionMint, slippage);

    //LANG:JP トランザクションを送信
    //LANG:EN Send the transaction
    //LANG:KR 트랜잭션 전송
    const signature = await sendTx();

    console.log('signature', signature);
    console.log("Fees owed token A:", feesQuote.feeOwedA);
    console.log("Fees owed token B:", feesQuote.feeOwedB);
    console.log("Rewards owed:");
    console.log(`  Token 1: ${rewardsQuote.rewards[0]?.rewardsOwed || 0}`);
    console.log(`  Token 2: ${rewardsQuote.rewards[1]?.rewardsOwed || 0}`);
    console.log(`  Token 3: ${rewardsQuote.rewards[2]?.rewardsOwed || 0}`);
    console.log('TX signature', signature);
}

main().catch((e) => console.error("error", e));