import { address, Address, createKeyPairSignerFromBytes, createSolanaRpc, generateKeyPairSigner, KeyPairSigner, Rpc, SolanaRpcApi } from "@solana/kit";
import secret from "../wallet.json";
import { PoolUtil } from "@orca-so/whirlpools-sdk";
import { fetchMint, getInitializeMint2Instruction } from "@solana-program/token";
import { createSplashPool } from "@orca-so/whirlpools";
import { fetchWhirlpool } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { getCreateAccountInstruction } from "@solana-program/system";
import { buildAndSendTransaction } from "@orca-so/tx-sender";

async function main() {
    try {
        const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
        const signer = await createKeyPairSignerFromBytes(new Uint8Array(secret));
        console.log('wallet address:', signer.address);

        const newTokenPubkeys = await Promise.all([
            createNewTokenMint(rpc, signer, signer.address, signer.address, 9),
            createNewTokenMint(rpc, signer, signer.address, signer.address, 6),
        ]);

        const [tokenAddressA, tokenAddressB] = PoolUtil.orderMints(newTokenPubkeys[0], newTokenPubkeys[1]);

        const tokenA = await fetchMint(rpc, tokenAddressA);
        const tokenB = await fetchMint(rpc, tokenAddressB);
        const decimalA = tokenA.data.decimals;
        const decimalB = tokenB.data.decimals;
        console.log("tokenA:", tokenAddressA.toBase58(), "decimalA:", decimalA);
        console.log("tokenB:", tokenAddressB.toBase58(), "decimalB:", decimalB);

        const initialPrice = 0.01;

        const { instructions, poolAddress, callback: executeCreateSplashPool } = await createSplashPool(
            tokenAddressA, 
            tokenAddressB, 
            initialPrice
        );
        console.log("instructions:", instructions);

        const signature = await executeCreateSplashPool();
        console.log("createPoolTxId:", signature);
        
        const pool = await fetchWhirlpool(rpc, poolAddress);
        console.log("pool:", pool);
        
        const poolData = pool.data;
        const poolInitialPrice = sqrtPriceToPrice(poolData.sqrtPrice, decimalA, decimalB);
        const poolInitialTick = poolData.tickCurrentIndex;

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

async function createNewTokenMint(
    rpc: Rpc<SolanaRpcApi>, 
    signer: KeyPairSigner, 
    mintAuthority: Address, 
    freezeAuthority: Address,
    decimals: number) {
    const TOKEN_PROGRAM_ID = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const keypair = await generateKeyPairSigner();
    const mintLen = 82;
    const lamports = await rpc.getMinimumBalanceForRentExemption(BigInt(mintLen)).send();

    const createAccountInstruction = getCreateAccountInstruction({
        payer: signer,
        newAccount: keypair,
        lamports,
        space: mintLen,
        programAddress: keypair.address,
    });

    const initializeMintInstruction = getInitializeMint2Instruction({
        mint: keypair.address,
        decimals,
        mintAuthority,
        freezeAuthority,
    });

    const txHash = await buildAndSendTransaction([createAccountInstruction, initializeMintInstruction], signer);
    console.log("createNewTokenMint txHash:", txHash);

    return keypair.address;
}


main();