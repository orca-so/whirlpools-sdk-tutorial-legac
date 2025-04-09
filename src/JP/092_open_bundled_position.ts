import { buildAndSendTransaction, setPriorityFeeSetting, setRpc } from "@orca-so/tx-sender";
import { fetchWhirlpoolsByTokenPair, setPayerFromBytes, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchPositionBundle, fetchWhirlpool, getBundledPositionAddress, getOpenBundledPositionInstruction } from "@orca-so/whirlpools-client";
import { address, createSolanaRpc } from "@solana/kit";
import {
    firstUnoccupiedPositionInBundle,
    getInitializableTickIndex,
    sqrtPriceToPrice,
    sqrtPriceToTickIndex,
    tickIndexToPrice
} from "@orca-so/whirlpools-core";
import {findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS} from "@solana-program/token";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // RPC へのコネクション作成、秘密鍵読み込み
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // トークン定義
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};

    // 環境変数 WHIRLPOOL_POSITION_BUNDLE から PositionBundle のアドレスを読み込み
    const positionBundleAddress = process.env.WHIRLPOOL_POSITION_BUNDLE;
    const positionBundlePubkey = address(positionBundleAddress);
    console.log("position bundle address:", positionBundlePubkey.toString());

    // devSAMO/devUSDC プール取得
    const tickSpacing = 64;
    const whirlpoolPubkey = (await fetchWhirlpoolsByTokenPair(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
    )).filter((whirlpool) => whirlpool.tickSpacing === tickSpacing);
    
    if (whirlpoolPubkey.length === 0) {
        throw new Error("No whirlpool found");
    }
    
    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPubkey[0].address);
    console.log("whirlpool:", whirlpool);

    // プールにおける現在価格を取得
    const sqrtPriceX64 = whirlpool.data.sqrtPrice;
    const price = sqrtPriceToPrice(sqrtPriceX64, devSAMO.decimals, devUSDC.decimals);
    console.log("price:", price.toFixed(devUSDC.decimals));

    // 価格帯を設定
    const lowerPrice = BigInt(0.005);
    const upperPrice = BigInt(0.02);

    // 価格帯を調整 (全ての価格が設定可能ではなく、範囲指定に利用できる価格は決まっている(InitializableTickIndexに対応する価格))
    const lowerTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(lowerPrice), tickSpacing);
    const upperTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(upperPrice), tickSpacing);
    console.log("lower & upper tick index:", lowerTickIndex, upperTickIndex);
    console.log("lower & upper price:",
        tickIndexToPrice(lowerTickIndex, devSAMO.decimals, devUSDC.decimals),
        tickIndexToPrice(upperTickIndex, devSAMO.decimals, devUSDC.decimals),
    );

    // PositionBundle アカウントを取得
    const positionBundle = await fetchPositionBundle(rpc, positionBundlePubkey);

    // PositionBundle 向けの ATA を取得
    const positionBundleTokenAccount = await findAssociatedTokenPda(
        {
            mint: positionBundle.data.positionBundleMint,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
        }
    );
    console.log("positionBundleTokenAccount:", positionBundleTokenAccount);

    // PositionBundle における未使用の bundle index を取得
    const unoccupiedBundleIndex = firstUnoccupiedPositionInBundle(new Uint8Array(positionBundle.data.positionBitmap));
    console.log("unoccupiedBundleIndex:", unoccupiedBundleIndex);

    // PositionBundle によって管理されるポジションのアドレスを生成する
    const [bundledPositionOnePda] = await getBundledPositionAddress(positionBundle.address, unoccupiedBundleIndex);
    console.log("bundledPositionOnePda:", bundledPositionOnePda);

    // PositionBundle で管理する 1 個目のポジションをオープンする命令を作成
    const openBundledPositionIx = getOpenBundledPositionInstruction({
        bundledPosition: bundledPositionOnePda,
        positionBundle: positionBundle.address,
        positionBundleTokenAccount: positionBundleTokenAccount[0],
        positionBundleAuthority: signer,
        whirlpool: whirlpool.address,
        funder: signer,
        bundleIndex: unoccupiedBundleIndex,
        tickLowerIndex: lowerTickIndex,
        tickUpperIndex: upperTickIndex,
    });

    // トランザクションを送信
    const tx = await buildAndSendTransaction(
        [openBundledPositionIx],
        signer,
        [positionBundleTokenAccount[0], bundledPositionOnePda[0]],
        "confirmed"
    );
    console.log("tx:", tx);
}

main().catch((e) => console.error("error:", e));
