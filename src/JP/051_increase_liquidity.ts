import { address, createSolanaRpc } from "@solana/kit";
import { fetchPositionsForOwner, increasePosLiquidity, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { increaseLiquidityQuoteB } from "@orca-so/whirlpools-core";
import { fetchWhirlpool, getWhirlpoolAddress, Position } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // RPC へのコネクション作成、秘密鍵読み込み
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    console.log('signer:', signer.address);

    // トークン定義
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};

    // Whirlpool の Config アカウント
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

    // ポジション・プール取得
    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPda[0]);
    const positions = (await fetchPositionsForOwner(rpc, signer.address))
        .filter(position => (position.data as Position).whirlpool === whirlpoolPda[0]);
    console.log(positions);

    if (positions.length > 0) {
        // Only increase liquidity for the first position
        const position: Position = positions[0].data as Position;

        // 追加デポジットするトークンの量、許容するスリッページを設定
        const devUsdcAmount = BigInt(1_000_000); // 1 devUSDC
        const slippage = 100; // 100 bps = 1

        // 見積もりを取得
        const calculatedQuote = increaseLiquidityQuoteB(
            // 入力にするトークン
            devUsdcAmount,

            // スリッページ
            slippage,
            whirlpool.data.sqrtPrice,

            // 価格帯はポジションのものをそのまま渡す
            position.tickLowerIndex,
            position.tickUpperIndex
        );

        // 見積もり結果表示
        console.log("quote:", calculatedQuote);
        console.log("devSAMO max input:", Number(calculatedQuote.tokenMaxA) / 10 ** devSAMO.decimals);
        console.log("devUSDC max input:", Number(calculatedQuote.tokenMaxB) / 10 ** devUSDC.decimals);

        // トランザクション実行前の流動性を表示
        console.log("liquidity(before):", position.liquidity);

        // トランザクションを作成
        const { quote, instructions, callback: executeIncreaseLiquidity } = await increasePosLiquidity(
            position.positionMint, 
            {
                tokenB: calculatedQuote.tokenMaxB,
            }, 
            0.01
        );
        console.log("increaseLiquidityInstructions:", instructions);

        // トランザクションを送信
        const signature = await executeIncreaseLiquidity();
        console.log('signature:', signature);

        // TODO: print after liquidity
    } else {
        console.log("No position in devSAMO/devUSDC pool");
    }
}

main().catch(e => console.error(e));
