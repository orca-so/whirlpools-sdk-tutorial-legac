import { address, createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import {fetchPosition, fetchTickArray, fetchWhirlpool, getTickArrayAddress} from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";
import {collectFeesQuote, collectRewardsQuote, getTickArrayStartTickIndex} from "@orca-so/whirlpools-core";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // Retrieve the position address from the WHIRLPOOL_POSITION environment variable
    const positionAddress = process.env.WHIRLPOOL_POSITION;
    const positionPubKey = address(positionAddress);

    // Get the position and the pool to which the position belongs
    const position = await fetchPosition(rpc, positionPubKey);
    const whirlpool = await fetchWhirlpool(rpc, position.data.whirlpool);
    const tickSpacing = whirlpool.data.tickSpacing;

    // Get TickArray and Tick
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

    // Get trade fee
    const quoteFee = collectFeesQuote(
        whirlpool.data,
        position.data,
        tickArrayLower.data.ticks[0],
        tickArrayUpper.data.ticks[0]
    );
    console.log(quoteFee.feeOwedA);
    console.log(quoteFee.feeOwedB);

    // Get rewards
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
