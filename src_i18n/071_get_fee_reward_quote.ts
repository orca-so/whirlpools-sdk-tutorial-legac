import { address, createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import { fetchAllTickArray, fetchPosition, fetchTickArray, fetchWhirlpool, getPositionAddress, getTickArrayAddress } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../wallet.json";
import { collectFeesQuote, collectRewardsQuote, getTickArrayStartTickIndex, getTickIndexInArray } from "@orca-so/whirlpools-core";
import { fetchAllMaybeMint } from "@solana-program/token";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成
    //LANG:EN Initialize a connection to the RPC
    //LANG:KR RPC에 연결을 초기화
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    //LANG:JP 環境変数 POSITION_MINT からポジションのアドレスを読み込み
    //LANG:EN Retrieve the position address from the POSITION_MINT environment variable
    //LANG:KR 환경변수 WHIRLPOOL_POSITION에서 포지션 주소를 가져옴
    const positionMint = address(process.env.POSITION_MINT);

    //LANG:JP ポジション・プール取得
    //LANG:EN Get the position and the pool to which the position belongs
    //LANG:KR 포지션과 해당 포지션이 속한 풀 가져옴
    const positionAddress = (await getPositionAddress(positionMint))[0];
    const position = await fetchPosition(rpc, positionAddress);
    const whirlpoolAddress = position.data.whirlpool;
    const whirlpool = await fetchWhirlpool(rpc, whirlpoolAddress);

    //LANG:JP TickArray および Tick の取得
    //LANG:EN Get TickArray and Tick
    //LANG:KR TickArray 및 Tick 가져옴
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

    //LANG:JP トレード手数料(フィー)の取得
    //LANG:EN Get trade fee
    //LANG:KR 트레이드 수수료(피) 조회
    const feesQuote = collectFeesQuote(
        whirlpool.data,
        position.data,
        lowerTick,
        upperTick
    );
    console.log("Fees owed token A:", feesQuote.feeOwedA);
    console.log("Fees owed token B:", feesQuote.feeOwedB);

    //LANG:JP リワードの取得
    //LANG:EN Get rewards
    //LANG:KR 리워드 조회    
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