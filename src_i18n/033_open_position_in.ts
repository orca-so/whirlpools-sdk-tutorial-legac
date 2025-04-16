import { fetchConcentratedLiquidityPool, increasePosLiquidity, openConcentratedPosition, openPositionInstructions, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";

import dotenv from "dotenv";
import secret from "../wallet.json";
import assert from "assert";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('signer:', signer.address);

    //LANG:JP トークン定義
    //LANG:EN Token definition
    //LANG:KR 토큰 정의
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };

    //LANG:JP devSAMO/devUSDC プール取得
    //LANG:EN Get devSAMO/devUSDC whirlpool
    //LANG:KR devSAMO/devUSDC 풀 로드
    const tickSpacing = 1;
    const whirlpool = await fetchConcentratedLiquidityPool(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing
    );

    //LANG:JP プールにおける現在価格を取得
    //LANG:EN Get the current price of the pool
    //LANG:KR 풀의 현재 가격 가져옴
    assert(whirlpool.initialized, "whirlpool is not initialized");
    console.log("price:", whirlpool.price);

    //LANG:JP 価格帯とデポジットするトークンの量、許容するスリッページを設定
    //LANG:EN Set price range, amount of tokens to deposit, and acceptable slippage
    //LANG:KR 가격 범위, 예치할 토큰 수량, 허용 슬리피지 설정
    const lowerPrice = 0.005;
    const upperPrice = 0.02;
    const devUsdcAmount = 1_000_000n;
    const slippage = 100;  // 100 bps = 1%
    console.log('lower & upper price::', lowerPrice, upperPrice);

    //LANG:JP 見積もりを取得
    //LANG:JP トランザクションを作成
    //LANG:EN Obtain deposit estimation
    //LANG:EN Create a transaction
    //LANG:KR 예치 예상치 가져옴
    //LANG:KR 트랜잭션 생성
    const { quote, positionMint, callback: sendTx } = await openConcentratedPosition(
        whirlpool.address,
        {
            tokenB: devUsdcAmount,
        },
        lowerPrice,
        upperPrice,
        slippage,
    );
    //LANG:JP トランザクションを送信
    //LANG:EN Send the transaction
    //LANG:KR 트랜잭션 전파
    const txHash = await sendTx();

    console.log("Position mint:", positionMint);
    console.log("Quote:");
    console.log("  liquidity amount:", quote.liquidityDelta);
    console.log("  estimated amount of devSAMO to supply without slippage:", Number(quote.tokenEstA) / 10 ** devSAMO.decimals);
    console.log("  estimated amount of devUSDC to supply without slippage:", Number(quote.tokenEstB) / 10 ** devUSDC.decimals);
    console.log("  amount of devSAMO to supply if slippage is fully applied:", Number(quote.tokenMaxA) / 10 ** devSAMO.decimals);
    console.log("  amount of tokenB to supply if slippage is fully applied:", Number(quote.tokenMaxB) / 10 ** devUSDC.decimals);
    console.log('TX hash:', txHash);
}

main().catch(e => console.error("error:", e));