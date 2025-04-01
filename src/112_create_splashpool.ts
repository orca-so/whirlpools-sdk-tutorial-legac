import { createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import secret from "../wallet.json";
import { createMint } from "./utils/spl_token_utils";
import { PoolUtil } from "@orca-so/whirlpools-sdk";
import { fetchMint } from "@solana-program/token";
import { createConcentratedLiquidityPool, createSplashPool } from "@orca-so/whirlpools";
import { fetchWhirlpool } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";

async function main() {
    try {
        const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
        const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
        console.log('wallet address:', signer.address);

        const newTokenPubkeys = await Promise.all([
            createMint(rpc, signer, signer.address, signer.address, 9),
            createMint(rpc, signer, signer.address, signer.address, 6),
        ]);

        const [tokenAddressA, tokenAddressB] = PoolUtil.orderMints(newTokenPubkeys[0], newTokenPubkeys[1]);

        const tokenA = await fetchMint(rpc, tokenAddressA);
        const tokenB = await fetchMint(rpc, tokenAddressB);
        const decimalA = tokenA.data.decimals;
        const decimalB = tokenB.data.decimals;
        console.log("tokenA:", tokenAddressA.toBase58(), "decimalA:", decimalA);
        console.log("tokenB:", tokenAddressB.toBase58(), "decimalB:", decimalB);

        const tickSpacing = 64;
        const initialPrice = 0.01;

        const { instructions, poolAddress, callback } = await createSplashPool(
            tokenAddressA, 
            tokenAddressB, 
            initialPrice
        );

        const createPoolTxId = await callback();

        const pool = await fetchWhirlpool(rpc, poolAddress);
        console.log("pool:", pool);
        
        const poolData = pool.data;
        const poolInitialPrice = sqrtPriceToPrice(poolData.sqrtPrice, decimalA, decimalB);
        const poolInitialTick = poolData.tickCurrentIndex;

        console.log("createPoolTxId:", createPoolTxId);
        console.log(
            "poolAddress:", poolAddress.toString(),
            "\n  tokenA:", poolData.tokenMintA.toString(),
            "\n  tokenB:", poolData.tokenMintB.toString(),
            "\n  tickSpacing:", poolData.tickSpacing,
            "\n  initialPrice:", poolInitialPrice,
            "\n  initialTick:", poolInitialTick
        );
    } catch (e) {
        console.error("error", e);
    }
}

main();