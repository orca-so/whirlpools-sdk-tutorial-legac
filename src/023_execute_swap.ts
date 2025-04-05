import { setPayerFromBytes, setRpc, setWhirlpoolsConfig, swap } from "@orca-so/whirlpools";
import { address } from "@solana/kit";
import { getWhirlpoolAddress } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");

    console.log("signer:", signer.address);

    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const tickSpacing = 64;

    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());
    const whirlpoolPda = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda:", whirlpoolPda);

    const { instructions, quote, callback: executeSwap } = await swap(
        {
            mint: devUSDC.mint,
            inputAmount: BigInt(100_000),   // swap 0.1 devUSDC to devSAMO
        },
        whirlpoolPda[0],
        100,  // 100 bps = 1%
    );
    console.log("instructions:", instructions);
    console.log("quote:", quote);

    const swapSignature = await executeSwap();
    console.log("swapSignature:", swapSignature);
}

main().catch(e => console.error("error:", e));