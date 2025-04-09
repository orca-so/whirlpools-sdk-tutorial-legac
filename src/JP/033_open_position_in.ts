import { increasePosLiquidity, openPositionInstructions, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchWhirlpool, getWhirlpoolAddress } from "@orca-so/whirlpools-client";
import { priceToTickIndex, sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { address, createSolanaRpc } from "@solana/kit";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // RPC へのコネクション作成、秘密鍵読み込み
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('signer:', signer.address);

    // トークン定義
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };

    // Whirlpool の Config アカウント
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    // devSAMO/devUSDC プール取得
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

    // プールにおける現在価格を取得
    const sqrtPrice_x64 = sqrtPriceToPrice(whirlpool.data.sqrtPrice, devSAMO.decimals, devUSDC.decimals);
    console.log("sqrtPrice_x64:", sqrtPrice_x64);

    // 価格帯とデポジットするトークンの量、許容するスリッページを設定
    const lowerPrice = 0.005;
    const upperPrice = 0.02;
    const devUsdcAmount = BigInt(1_000_000);
    const slippage = 100;  // 100 bps = 1%

    // 価格帯を調整 (全ての価格が設定可能ではなく、範囲指定に利用できる価格は決まっている(InitializableTickIndexに対応する価格))
    const lowerTickIndex = priceToTickIndex(lowerPrice, devSAMO.decimals, devUSDC.decimals);
    const upperTickIndex = priceToTickIndex(upperPrice, devSAMO.decimals, devUSDC.decimals);
    console.log('lowerTickIndex:', lowerTickIndex);
    console.log('upperTickIndex:', upperTickIndex);

    // 見積もりを取得
    const { quote, instructions, positionMint } = await openPositionInstructions(
        rpc, 
        whirlpool.address, 
        {
            tokenB: devUsdcAmount,
        },
        lowerPrice, 
        upperPrice, 
        slippage,
        signer
    );
    console.log("quote:", quote);
    console.log("openPositionInbstructions:", instructions);
    console.log("positionMint:", positionMint);

    // トランザクションを作成
    const { instructions: increaseLiquidityInstructions, callback: executeIncreaseLiquidity } = await increasePosLiquidity(
        positionMint, 
        {
            tokenB: quote.tokenMaxB,
        }, 
        100,  // 100 bps = 1%
    );
    console.log("increaseLiquidityInstructions:", increaseLiquidityInstructions);

    // トランザクションを送信
    const txHash = await executeIncreaseLiquidity();
    console.log('txHash:', txHash);
}

main().catch(e => console.error("error:", e));
