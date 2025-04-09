import { address, createSolanaRpc } from "@solana/kit";
import { fetchPositionsForOwner, increasePosLiquidity, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { increaseLiquidityQuoteB } from "@orca-so/whirlpools-core";
import { fetchWhirlpool, getWhirlpoolAddress, Position } from "@orca-so/whirlpools-client";

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

    //LANG:JP トークン定義
    //LANG:EN Token definition
    //LANG:KR 토큰 정의
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};

    //LANG:JP Whirlpool の Config アカウント
    //LANG:EN WhirlpoolsConfig account
    //LANG:KR WhirlpoolsConfig 계정
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const tickSpacing = 64;
    const whirlpoolPda = await getWhirlpoolAddress(
        DEVNET_WHIRLPOOLS_CONFIG,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log('whirlpoolPda:', whirlpoolPda);

    //LANG:JP ポジション・プール取得
    //LANG:EN Get the position and the pool to which the position belongs
    //LANG:KR 포지션과 해당 포지션이 속한 풀 가져옴
    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPda[0]);
    const positions = (await fetchPositionsForOwner(rpc, signer.address))
        .filter(position => (position.data as Position).whirlpool === whirlpoolPda[0]);
    console.log(positions);

    if (positions.length > 0) {
        // Only increase liquidity for the first position
        const position: Position = positions[0].data as Position;

        //LANG:JP 追加デポジットするトークンの量、許容するスリッページを設定
        //LANG:EN Set amount of tokens to deposit and acceptable slippage
        //LANG:KR 예치할 토큰 수량과 허용 슬리피지 설정
        const devUsdcAmount = BigInt(1_000_000); // 1 devUSDC
        const slippage = 100; // 100 bps = 1

        //LANG:JP 見積もりを取得
        //LANG:EN Obtain deposit estimation
        //LANG:KR 예치 예상치 가져옴
        const calculatedQuote = increaseLiquidityQuoteB(
            //LANG:JP 入力にするトークン
            //LANG:EN Input token and amount
            //LANG:KR 입력할 토큰 및 수량
            devUsdcAmount,

            //LANG:JP スリッページ
            //LANG:EN Acceptable slippage
            //LANG:KR 허용 슬리피지
            slippage,
            whirlpool.data.sqrtPrice,

            //LANG:JP 価格帯はポジションのものをそのまま渡す
            //LANG:EN Pass the price range of the position as is
            //LANG:KR 포지션이 가지고 있는 가격 범위를 그대로 전달
            position.tickLowerIndex,
            position.tickUpperIndex
        );

        //LANG:JP 見積もり結果表示
        //LANG:EN Output the estimation
        //LANG:KR 예상 결과 출력
        console.log("quote:", calculatedQuote);
        console.log("devSAMO max input:", Number(calculatedQuote.tokenMaxA) / 10 ** devSAMO.decimals);
        console.log("devUSDC max input:", Number(calculatedQuote.tokenMaxB) / 10 ** devUSDC.decimals);

        //LANG:JP トランザクション実行前の流動性を表示
        //LANG:EN Output the liquidity before transaction execution
        //LANG:KR 트랜잭션 실행 전의 유동성 표시
        console.log("liquidity(before):", position.liquidity);

        //LANG:JP トランザクションを作成
        //LANG:EN Create a transaction
        //LANG:KR 트랜잭션 생성
        const { quote, instructions, callback: executeIncreaseLiquidity } = await increasePosLiquidity(
            position.positionMint, 
            {
                tokenB: calculatedQuote.tokenMaxB,
            }, 
            0.01
        );
        console.log("increaseLiquidityInstructions:", instructions);

        //LANG:JP トランザクションを送信
        //LANG:EN Send the transaction
        //LANG:KR 트랜잭션 전파
        const signature = await executeIncreaseLiquidity();
        console.log('signature:', signature);

        // TODO: print after liquidity
    } else {
        console.log("No position in devSAMO/devUSDC pool");
    }
}

main().catch(e => console.error(e));