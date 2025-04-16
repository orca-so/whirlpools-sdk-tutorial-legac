import { setPayerFromBytes, setRpc, setWhirlpoolsConfig, swap } from "@orca-so/whirlpools";
import { address } from "@solana/kit";
import { getWhirlpoolAddress } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // RPC へのコネクション作成、秘密鍵読み込み
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");
    console.log("signer:", signer.address);

    // トークン定義
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 }

    // Whirlpool の Config アカウント
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    // devSAMO/devUSDC プール取得
    // Whirlpool のプールは (プログラム, Config, 1個目のトークンのミントアドレス, 2個目のトークンのミントアドレス, ティックスペース)
    // の 5 要素で特定されます (DBで考えると5列の複合プライマリキーです)
    const tickSpacing = 64;
    const [whirlpoolPda] = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda:", whirlpoolPda);

    // 1 devUSDC トークンを devSAMO にスワップします
    const amountIn = BigInt(100_000);

    // スワップの見積もり取得(シミュレーション実行)
    const { quote, callback: sendTx } = await swap(
        // 入力するトークン
        {
            mint: devUSDC.mint,
            inputAmount: amountIn,   // swap 0.1 devUSDC to devSAMO
        },
        whirlpoolPda,
        // 許容するスリッページ (100bps = 1%)
        100,  // 100 bps = 1%
    );

    // 見積もり結果表示
    console.log("Quote:");
    console.log("  - Amount of tokens to pay:", quote.tokenIn);
    console.log("  - Minimum amount of tokens to receive with maximum slippage:", quote.tokenMinOut);
    console.log("  - Estimated tokens to receive:");
    console.log("      Based on the price at the time of the quote");
    console.log("      Without slippage consideration:", quote.tokenEstOut);
    console.log("  - Trade fee (bps):", quote.tradeFee);

    // トランザクションを送信
    const swapSignature = await sendTx();
    console.log("swapSignature:", swapSignature);
}

main().catch(e => console.error("error:", e));
