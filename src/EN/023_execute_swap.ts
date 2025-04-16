import { setPayerFromBytes, setRpc, setWhirlpoolsConfig, swap } from "@orca-so/whirlpools";
import { address } from "@solana/kit";
import { getWhirlpoolAddress } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // Initialize a connection to the RPC and read in private key
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");
    console.log("signer:", signer.address);

    // Token definition
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 }

    // WhirlpoolsConfig account
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    // Get devSAMO/devUSDC whirlpool
    // Whirlpools are identified by 5 elements (Program, Config, mint address of the 1st token,
    // mint address of the 2nd token, tick spacing), similar to the 5 column compound primary key in DB
    const tickSpacing = 64;
    const [whirlpoolPda] = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda:", whirlpoolPda);

    // Swap 1 devUSDC for devSAMO
    const amountIn = BigInt(100_000);

    // Obtain swap estimation (run simulation)
    const { quote, callback: sendTx } = await swap(
        // Input token and amount
        {
            mint: devUSDC.mint,
            inputAmount: amountIn,   // swap 0.1 devUSDC to devSAMO
        },
        whirlpoolPda,
        // Acceptable slippage (100bps = 1%)
        100,  // 100 bps = 1%
    );

    // Output the quote
    console.log("Quote:");
    console.log("  - Amount of tokens to pay:", quote.tokenIn);
    console.log("  - Minimum amount of tokens to receive with maximum slippage:", quote.tokenMinOut);
    console.log("  - Estimated tokens to receive:");
    console.log("      Based on the price at the time of the quote");
    console.log("      Without slippage consideration:", quote.tokenEstOut);
    console.log("  - Trade fee (bps):", quote.tradeFee);

    // Send the transaction using action
    const swapSignature = await sendTx();
    console.log("swapSignature:", swapSignature);
}

main().catch(e => console.error("error:", e));
