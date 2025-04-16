import { address, createSolanaRpc } from "@solana/kit";
import { fetchPosition } from "@orca-so/whirlpools-client";
import { harvestPosition, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc } from "@orca-so/whirlpools";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    // Get the position
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const positionMint = address(process.env.WHIRLPOOL_POSITION);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // Create a transaction to harvest the position's earnings
    const { feesQuote, rewardsQuote, callback: sendTx } = await harvestPosition(positionMint);

    //LANG: JP 収穫トランザクション実行
    //LANG: EN Execute harvest transaction
    //LANG: KR 수확 트랜잭션 실행
    const signature = await sendTx();

    console.log("Fees owed token A:", feesQuote.feeOwedA);
    console.log("Fees owed token B:", feesQuote.feeOwedB);
    console.log("Rewards owed:");
    console.log(`  Token 1: ${rewardsQuote.rewards[0]?.rewardsOwed || 0}`);
    console.log(`  Token 2: ${rewardsQuote.rewards[1]?.rewardsOwed || 0}`);
    console.log(`  Token 3: ${rewardsQuote.rewards[2]?.rewardsOwed || 0}`);
    console.log('TX signature', signature);
}

main().catch(e => console.error("error:", e));
