import { increasePosLiquidity, openPositionInstructions, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
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
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    //LANG:JP devSAMO/devUSDC プール取得
    //LANG:EN Get devSAMO/devUSDC whirlpool
    //LANG:KR devSAMO/devUSDC 풀 가져오기
    const tickSpacing = 64;
    const whirlpoolPda = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda:", whirlpoolPda);

    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPda[0]);
    console.log("whirlpool:", whirlpool);

    //LANG:JP プールにおける現在価格を取得
    //LANG:EN Get the current price of the pool
    //LANG:KR 풀의 현재 가격 조회
    const sqrtPrice_x64 = sqrtPriceToPrice(whirlpool.data.sqrtPrice, devSAMO.decimals, devUSDC.decimals);
    console.log("sqrtPrice_x64:", sqrtPrice_x64);

    //LANG:JP 価格帯とデポジットするトークンの量、許容するスリッページを設定
    //LANG:EN Set price range, amount of tokens to deposit, and acceptable slippage
    //LANG:KR 가격 범위, 예치할 토큰 수량, 허용 슬리피지 설정
    const lowerPrice = 0.03;
    const upperPrice = 0.04;
    const devSamoAmount = BigInt(10_000_000_000);
    const slippage = 100; // 100bps = 1%

    //LANG:JP 価格帯を調整 (全ての価格が設定可能ではなく、範囲指定に利用できる価格は決まっている(InitializableTickIndexに対応する価格))
    //LANG:EN Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
    //LANG:EN (prices corresponding to InitializableTickIndex are available)
    //LANG:KR 가격 범위 조정 (모든 가격 설정 불가, InitializableTickIndex에 해당하는 가격만 가능)
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lowerTickIndex:', lowerTickIndex);
    console.log('upperTickIndex:', upperTickIndex);

    //LANG:JP 見積もりを取得
    //LANG:EN Obtain deposit estimation
    //LANG:KR 예치 예상치 가져옴
    const { quote, instructions, positionMint } = await openPositionInstructions(
        //LANG:JP プールの定義や状態をそのまま渡す
        //LANG:EN Pass the pool definition and state
        //LANG:KR 풀 정의와 상태 그대로 전달
        rpc,
        whirlpool.address, 
        {
            tokenA: devSamoAmount,
        },

        //LANG:JP 価格帯
        //LANG:EN Price range
        //LANG:KR 가격 범위
        lowerPrice, 
        upperPrice,

        //LANG:JP スリッページ
        //LANG:EN Acceptable slippage
        //LANG:KR 허용 슬리피지
        slippage,  // 100 bps = 1%
        signer
    );

    //LANG:JP 見積もり結果表示
    //LANG:EN Output the estimation
    //LANG:KR 예상 결과 출력
    console.log("quote:", quote);
    console.log("openPositionInstructions:", instructions);
    console.log("positionMint:", positionMint);

    //LANG:JP トランザクションを作成
    //LANG:EN Create a transaction
    //LANG:KR 트랜잭션 생성
    const { instructions: increaseLiquidityInstructions, callback: executeIncreaseLiquidity } = await increasePosLiquidity(
        positionMint, 
        {
            tokenA: quote.tokenMaxA,
        }, 
        100,  // 100 bps = 1%
    );
    console.log("increaseLiquidityInstructions:", increaseLiquidityInstructions);

    //LANG:JP トランザクションを送信
    //LANG:EN Send the transaction
    //LANG:KR 트랜잭션 전송
    const txHash = await executeIncreaseLiquidity();
    console.log('txHash:', txHash);
}

main().catch(e => console.error("error:", e));