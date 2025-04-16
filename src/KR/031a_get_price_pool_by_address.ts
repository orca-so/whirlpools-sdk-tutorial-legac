import { address, createSolanaRpc } from "@solana/kit";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { setWhirlpoolsConfig } from "@orca-so/whirlpools";

import dotenv from "dotenv";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");

    // 토큰 정의
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };

    // WhirlpoolsConfig 계정
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    // devSAMO/devUSDC 풀 로드
    const tickSpacing = 64;
    const whirlpoolAddress = (await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    ))[0];

    const whirlpool = await fetchWhirlpool(rpc, whirlpoolAddress);
    // 풀의 현재 가격을 조회
    const price = sqrtPriceToPrice(whirlpool.data.sqrtPrice, devSAMO.decimals, devUSDC.decimals);
    console.log("whirlpoolAddress:", whirlpoolAddress);
    console.log("  sqrtPrice:", whirlpool.data.sqrtPrice);
    console.log("  price:", price)
}

main().catch(e => console.error("error:", e));
