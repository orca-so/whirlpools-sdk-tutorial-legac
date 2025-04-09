import { address, createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import {fetchPosition, fetchTickArray, fetchWhirlpool, getTickArrayAddress} from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";
import {collectFeesQuote, collectRewardsQuote, getTickArrayStartTickIndex} from "@orca-so/whirlpools-core";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // 환경변수 WHIRLPOOL_POSITION에서 포지션 주소를 가져옴
    const positionAddress = process.env.WHIRLPOOL_POSITION;
    const positionPubKey = address(positionAddress);

    // 포지션과 해당 포지션이 속한 풀 가져옴
    const position = await fetchPosition(rpc, positionPubKey);
    const whirlpool = await fetchWhirlpool(rpc, position.data.whirlpool);
    const tickSpacing = whirlpool.data.tickSpacing;

    // TickArray 및 Tick 가져옴
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

    // 트레이드 수수료(피) 조회
    const quoteFee = collectFeesQuote(
        whirlpool.data,
        position.data,
        tickArrayLower.data.ticks[0],
        tickArrayUpper.data.ticks[0]
    );
    console.log(quoteFee.feeOwedA);
    console.log(quoteFee.feeOwedB);

    // 리워드 조회
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
