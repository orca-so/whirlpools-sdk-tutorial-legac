import { address, createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import {fetchPosition, fetchTickArray, fetchWhirlpool, getTickArrayAddress} from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";
import {collectFeesQuote, collectRewardsQuote, getTickArrayStartTickIndex} from "@orca-so/whirlpools-core";

dotenv.config();

async function main() {
    // RPC へのコネクション作成
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // 環境変数 WHIRLPOOL_POSITION からポジションのアドレスを読み込み
    const positionAddress = process.env.WHIRLPOOL_POSITION;
    const positionPubKey = address(positionAddress);

    // ポジション・プール取得
    const position = await fetchPosition(rpc, positionPubKey);
    const whirlpool = await fetchWhirlpool(rpc, position.data.whirlpool);
    const tickSpacing = whirlpool.data.tickSpacing;

    // TickArray および Tick の取得
    const tickArrayLowerStartIndex = getTickArrayStartTickIndex(position.data.tickLowerIndex, tickSpacing);
    const tickArrayUpperStartIndex = getTickArrayStartTickIndex(position.data.tickUpperIndex, tickSpacing);
    const [tickArrayLowerAddress] = await getTickArrayAddress(whirlpool.address, tickArrayLowerStartIndex);
    const [tickArrayUpperAddress] = await getTickArrayAddress(whirlpool.address, tickArrayUpperStartIndex);
    const tickArrayLower = await fetchTickArray(rpc, tickArrayLowerAddress);
    const tickArrayUpper = await fetchTickArray(rpc, tickArrayUpperAddress);
    console.log('tickLowerIndex:', position.data.tickLowerIndex);
    console.log('tickUpperIndex:', position.data.tickUpperIndex);
    console.log('tickArrayLowerStartIndex:', tickArrayLowerStartIndex);
    console.log('tickArrayUpperStartIndex:', tickArrayUpperStartIndex);
    console.log('tickArrayLowerAddress:', tickArrayLowerAddress);
    console.log('tickArrayUpperAddress:', tickArrayUpperAddress);

    // トレード手数料(フィー)の取得
    const quoteFee = collectFeesQuote(
        whirlpool.data,
        position.data,
        tickArrayLower.data.ticks[0],
        tickArrayUpper.data.ticks[0]
    );
    console.log(quoteFee.feeOwedA);
    console.log(quoteFee.feeOwedB);

    // リワードの取得
    const rewardQuote = collectRewardsQuote(
        whirlpool.data,
        position.data,
        tickArrayLower.data.ticks[0],
        tickArrayUpper.data.ticks[0],
        BigInt(Math.ceil(Date.now() / 1000)),
    );
    console.log(rewardQuote.rewards);
}

main().catch(e => console.error("error:", e));
