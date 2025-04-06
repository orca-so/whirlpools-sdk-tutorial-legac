import { AccountRole, address } from "@solana/kit";
import { setPayerFromBytes, setRpc } from "@orca-so/whirlpools";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda } from "@solana-program/token";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { buildAndSendTransaction } from "@orca-so/tx-sender";

import secret from "../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));

    const tokenDefs = {
        "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k": {name: "devUSDC", decimals: 6},
        "H8UekPGwePSmQ3ttuYGPU1szyFfjZR4N53rymSFwpLPm": {name: "devUSDT", decimals: 6},
        "Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa":  {name: "devSAMO", decimals: 9},
        "Afn8YB1p4NsoZeS5XJBZ18LTfEy5NFPwN46wapZcBQr6": {name: "devTMAC", decimals: 6},
    };

    const devTokenName = process.argv[process.argv.length - 1];
    const devTokenMint = address(Object.keys(tokenDefs).find(key => tokenDefs[key].name === devTokenName));

    const devTokenDistributorProgramId = address("Bu2AaWnVoveQT47wP4obpmmZUwK9bN9ah4w6Vaoa93Y9");
    const devTokenAdmin = address("3otH3AHWqkqgSVfKFkrxyDqd2vK6LcaqigHrFEmWcGuo");
    const pda = address("3pgfe1L6jcq59uy3LZmmeSCk9mwVvHXjn21nSvNr8D6x");
    const tokenProgramId = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    const user = signer.address;
    const [vault] = await findAssociatedTokenPda({
        mint: devTokenMint,
        owner: pda,
        tokenProgram: tokenProgramId,
    });
    const [userVault] = await findAssociatedTokenPda({
        mint: devTokenMint,
        owner: signer.address,
        tokenProgram: tokenProgramId,
    });
    
    const ix = {
        programAddress: devTokenDistributorProgramId,
        accounts: [
            { address: devTokenDistributorProgramId, role: AccountRole.READONLY },
            { address: vault, role: AccountRole.WRITABLE },
            { address: pda, role: AccountRole.READONLY },
            { address: user, role: AccountRole.WRITABLE_SIGNER },
            { address: userVault, role: AccountRole.WRITABLE },
            { address: devTokenAdmin ,role: AccountRole.WRITABLE },
            { address: tokenProgramId, role: AccountRole.READONLY},
            { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
            { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY}
        ]
    };

    const signature = await buildAndSendTransaction([ix], signer);
    console.log("signature:", signature);
}

main().catch((e) => console.error("error:", e));