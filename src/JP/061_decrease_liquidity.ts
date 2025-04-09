import { address, createSolanaRpc } from "@solana/kit";
import { decreaseLiquidity, fetchPositionsForOwner, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import {fetchPosition, getWhirlpoolAddress, Position} from "@orca-so/whirlpools-client";

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

    const positionAddress = address(process.env.WHIRLPOOL_POSITION);

    // ポジション・プール取得
    const position = await fetchPosition(rpc, positionAddress);
    const whirlpool = position.data.whirlpool;

    // 引き出す流動性を割合で指定 (30%)
    const liquidity = position.data.liquidity;
    const liquidityDelta = (liquidity * BigInt(30)) / BigInt(100);

    console.log("liquidity:", liquidity);
    console.log("liquidityDelta:", liquidityDelta);

    // 許容するスリッページを設定
    const slippage = 100; // 100 bps = 1%

    // トランザクション実行前の流動性を表示
    console.log("liquidity(before):", position.data.liquidity);

    // トランザクションを作成
    const { quote, instructions, callback: executeDecreaseLiquidity } = await decreaseLiquidity(
        position.data.positionMint,
        {
            // 引き出す流動性
            liquidity: liquidityDelta,
        },

        // スリッページ
        slippage,
    );

    console.log("quote:", quote);
    console.log("instructions:", instructions);

    // トランザクションを送信
    const signature = await executeDecreaseLiquidity();
    console.log('signature:', signature);

    // TODO: print after liquidity
}

main().catch(e => console.error(e));
