import { address, createSolanaRpc } from "@solana/kit";
import { getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { fetchConcentratedLiquidityPool, fetchWhirlpoolsByTokenPair, setWhirlpoolsConfig } from "@orca-so/whirlpools";

import dotenv from "dotenv";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成
    //LANG:EN Initialize a connection to the RPC
    //LANG:KR RPC에 연결을 초기화
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");

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
    const tickSpacing = 64;
    const whirlpool = await fetchConcentratedLiquidityPool(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing
    );

    //LANG:JP プールにおける現在価格を取得
    //LANG:EN Get the current price of the pool
    //LANG:KR 풀의 현재 가격을 조회
    const isInitialized = whirlpool.initialized;
    console.log("Whirlpool:", whirlpool.address);
    if (isInitialized) {
        console.log("  sqrtPrice_x64:", whirlpool.sqrtPrice);
        console.log("  price: ", whirlpool.price);
    }
}

main().catch(e => console.error("error:", e));