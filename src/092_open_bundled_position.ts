import { buildAndSendTransaction, setJitoTipSetting, setPriorityFeeSetting, setRpc } from "@orca-so/tx-sender";
import { fetchWhirlpoolsByTokenPair, setPayerFromBytes, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchPositionBundle, fetchWhirlpool, getBundledPositionAddress, getOpenBundledPositionInstruction } from "@orca-so/whirlpools-client";
import { address, createSolanaRpc } from "@solana/kit";

import secret from "../wallet.json";
import dotenv from "dotenv";
import { firstUnoccupiedPositionInBundle, getInitializableTickIndex, sqrtPriceToPrice, sqrtPriceToTickIndex } from "@orca-so/whirlpools-core";
import { findAssociatedTokenPda } from "@solana-program/token";

dotenv.config();

async function main() {
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    setJitoTipSetting({
        type: "dynamic",
    });
    
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};

    const positionBundleAddress = process.env.WHIRLPOOL_POSITION_BUNDLE;
    const positionBundlePubkey = address(positionBundleAddress);
    console.log("position bundle address:", positionBundlePubkey.toString());

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

    const sqrtPriceX64 = whirlpool.data.sqrtPrice;
    const price = sqrtPriceToPrice(sqrtPriceX64, devSAMO.decimals, devUSDC.decimals);
    console.log("price:", price.toFixed(devUSDC.decimals));

    const lowerPrice = BigInt(0.005);
    const upperPrice = BigInt(0.02);

    const lowerTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(lowerPrice), tickSpacing);
    const upperTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(upperPrice), tickSpacing);
    const TOKEN_PROGRAM_ID = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const positionBundle = await fetchPositionBundle(rpc, positionBundlePubkey);
    const positionBundleTokenAccount = await findAssociatedTokenPda(
        {
            mint: positionBundle.data.positionBundleMint,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ID,
        }
    );
    console.log("positionBundleTokenAccount:", positionBundleTokenAccount);
    
    const unoccupiedBundleIndex = firstUnoccupiedPositionInBundle(new Uint8Array(positionBundle.data.positionBitmap));
    console.log("unoccupiedBundleIndex:", unoccupiedBundleIndex);

    const bundledPositionOnePda = await getBundledPositionAddress(positionBundle.address, unoccupiedBundleIndex);
    console.log("bundledPositionOnePda:", bundledPositionOnePda);

    const openBundledPositionIx = getOpenBundledPositionInstruction({
        bundledPosition: bundledPositionOnePda[0],
        positionBundle: positionBundle.address,
        positionBundleTokenAccount: positionBundleTokenAccount[0],
        positionBundleAuthority: signer,
        whirlpool: whirlpool.address,
        funder: signer,
        bundleIndex: unoccupiedBundleIndex,
        tickLowerIndex: lowerTickIndex,
        tickUpperIndex: upperTickIndex,
    });
    
    const tx = await buildAndSendTransaction(
        [openBundledPositionIx],
        signer,
        [positionBundleTokenAccount[0], bundledPositionOnePda[0]],
        "confirmed"
    );
    console.log("tx:", tx);
}

main().catch((e) => console.error("error:", e));