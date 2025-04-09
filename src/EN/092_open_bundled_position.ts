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
    // Initialize a connection to the RPC and read in private key
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // Token definition
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};

    // Retrieve the position bundle address from the WHIRLPOOL_POSITION_BUNDLE environment variable
    const positionBundleAddress = process.env.WHIRLPOOL_POSITION_BUNDLE;
    const positionBundlePubkey = address(positionBundleAddress);
    console.log("position bundle address:", positionBundlePubkey.toString());

    // Get devSAMO/devUSDC whirlpool
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

    // Get the current price of the pool
    const sqrtPriceX64 = whirlpool.data.sqrtPrice;
    const price = sqrtPriceToPrice(sqrtPriceX64, devSAMO.decimals, devUSDC.decimals);
    console.log("price:", price.toFixed(devUSDC.decimals));

    // Set price range
    const lowerPrice = BigInt(0.005);
    const upperPrice = BigInt(0.02);

    // Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
    // (prices corresponding to InitializableTickIndex are available)
    const lowerTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(lowerPrice), tickSpacing);
    const upperTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(upperPrice), tickSpacing);
    console.log("lower & upper tick index:", lowerTickIndex, upperTickIndex);
    console.log("lower & upper price:",
        tickIndexToPrice(lowerTickIndex, devSAMO.decimals, devUSDC.decimals),
        tickIndexToPrice(upperTickIndex, devSAMO.decimals, devUSDC.decimals),
    );

    // Get PositionBundle account
    const positionBundle = await fetchPositionBundle(rpc, positionBundlePubkey);

    // Get ATA for PositionBundle
    const positionBundleTokenAccount = await findAssociatedTokenPda(
        {
            mint: positionBundle.data.positionBundleMint,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
        }
    );
    console.log("positionBundleTokenAccount:", positionBundleTokenAccount);

    // Get unused bundle indexes in PositionBundle
    const unoccupiedBundleIndex = firstUnoccupiedPositionInBundle(new Uint8Array(positionBundle.data.positionBitmap));
    console.log("unoccupiedBundleIndex:", unoccupiedBundleIndex);

    // Generate address for positions managed by PositionBundle
    const [bundledPositionOnePda] = await getBundledPositionAddress(positionBundle.address, unoccupiedBundleIndex);
    console.log("bundledPositionOnePda:", bundledPositionOnePda);

    // Create an instruction to open the first position managed by PositionBundle
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

    // Send the transaction
    const tx = await buildAndSendTransaction(
        [openBundledPositionIx],
        signer,
        [positionBundleTokenAccount[0], bundledPositionOnePda[0]],
        "confirmed"
    );
    console.log("tx:", tx);
}

main().catch((e) => console.error("error:", e));
