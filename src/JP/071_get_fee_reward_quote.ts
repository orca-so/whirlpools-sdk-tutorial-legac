import { address, createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import { fetchAllTickArray, fetchPosition, fetchTickArray, fetchWhirlpool, getPositionAddress, getTickArrayAddress } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";
import { collectFeesQuote, collectRewardsQuote, getTickArrayStartTickIndex, getTickIndexInArray } from "@orca-so/whirlpools-core";
import { fetchAllMaybeMint } from "@solana-program/token";

dotenv.config();

async function main() {
    // RPC へのコネクション作成
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // 環境変数 POSITION_MINT からポジションのアドレスを読み込み
    const positionMint = address(process.env.POSITION_MINT);

    // ポジション・プール取得
    const positionAddress = (await getPositionAddress(positionMint))[0];
    const position = await fetchPosition(rpc, positionAddress);
    const whirlpoolAddress = position.data.whirlpool;
    const whirlpool = await fetchWhirlpool(rpc, whirlpoolAddress);

    // TickArray および Tick の取得
    const lowerTickArrayStartIndex = getTickArrayStartTickIndex(
        position.data.tickLowerIndex,
        whirlpool.data.tickSpacing
    );
    const upperTickArrayStartIndex = getTickArrayStartTickIndex(
        position.data.tickUpperIndex,
        whirlpool.data.tickSpacing
    );

    const [lowerTickArrayAddress, upperTickArrayAddress] = await Promise.all([
        getTickArrayAddress(whirlpool.address, lowerTickArrayStartIndex).then(
            (x) => x[0]
        ),
        getTickArrayAddress(whirlpool.address, upperTickArrayStartIndex).then(
            (x) => x[0]
        ),
    ]);

    const [lowerTickArray, upperTickArray] = await fetchAllTickArray(rpc, [
        lowerTickArrayAddress,
        upperTickArrayAddress,
    ]);

    const lowerTick = lowerTickArray.data.ticks[
        getTickIndexInArray(
            position.data.tickLowerIndex,
            lowerTickArrayStartIndex,
            whirlpool.data.tickSpacing
        )
    ];
    const upperTick = upperTickArray.data.ticks[
        getTickIndexInArray(
            position.data.tickUpperIndex,
            upperTickArrayStartIndex,
            whirlpool.data.tickSpacing
        )
    ];

    // トレード手数料(フィー)の取得
    const feesQuote = collectFeesQuote(
        whirlpool.data,
        position.data,
        lowerTick,
        upperTick
    );
    console.log("Fees owed token A:", feesQuote.feeOwedA);
    console.log("Fees owed token B:", feesQuote.feeOwedB);

    // リワードの取得
    const currentUnixTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const rewardsQuote = collectRewardsQuote(
        whirlpool.data,
        position.data,
        lowerTick,
        upperTick,
        currentUnixTimestamp
    );
    console.log("Rewards owed:");
    for (let i = 0; i < rewardsQuote.rewards.length; i++) {
        console.log(`  Token ${i + 1}: ${rewardsQuote.rewards[i].rewardsOwed}`);
    }

}

main().catch(e => console.error("error:", e));
