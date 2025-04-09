import { address, createSolanaRpc } from "@solana/kit";
import { decreaseLiquidity, fetchPositionsForOwner, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import {fetchPosition, getWhirlpoolAddress, Position} from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    console.log('signer:', signer.address);

    const positionAddress = address(process.env.WHIRLPOOL_POSITION);

    //LANG:JP ポジション・プール取得
    //LANG:EN Get the position and the pool to which the position belongs
    //LANG:KR 포지션과 해당 포지션이 속한 풀 가져옴
    const position = await fetchPosition(rpc, positionAddress);
    const whirlpool = position.data.whirlpool;

    //LANG:JP 引き出す流動性を割合で指定 (30%)
    //LANG:EN Set the percentage of liquidity to be withdrawn (30%)
    //LANG:KR 인출할 유동성을 비율로 지정 (30%)
    const liquidity = position.data.liquidity;
    const liquidityDelta = (liquidity * BigInt(30)) / BigInt(100);

    console.log("liquidity:", liquidity);
    console.log("liquidityDelta:", liquidityDelta);

    //LANG:JP 許容するスリッページを設定
    //LANG:EN Set acceptable slippage
    //LANG:KR 허용 슬리피지 설정
    const slippage = 100; // 100 bps = 1%

    //LANG:JP トランザクション実行前の流動性を表示
    //LANG:EN Output the liquidity before transaction execution
    //LANG:KR 트랜잭션 실행 전의 유동성 표시
    console.log("liquidity(before):", position.data.liquidity);

    //LANG:JP トランザクションを作成
    //LANG:EN Create a transaction
    //LANG:KR 트랜잭션 생성
    const { quote, instructions, callback: executeDecreaseLiquidity } = await decreaseLiquidity(
        position.data.positionMint,
        {
            //LANG:JP 引き出す流動性
            //LANG:EN Liquidity to be withdrawn
            //LANG:KR 인출할 유동성
            liquidity: liquidityDelta,
        },

        //LANG:JP スリッページ
        //LANG:EN Acceptable slippage
        //LANG:KR 허용 슬리피지
        slippage,
    );

    console.log("quote:", quote);
    console.log("instructions:", instructions);

    //LANG:JP トランザクションを送信
    //LANG:EN Send the transaction
    //LANG:KR 트랜잭션 전파
    const signature = await executeDecreaseLiquidity();
    console.log('signature:', signature);

    // TODO: print after liquidity
}

main().catch(e => console.error(e));