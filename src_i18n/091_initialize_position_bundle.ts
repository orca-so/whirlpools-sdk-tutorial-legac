import { buildAndSendTransaction, setPriorityFeeSetting, setRpc } from "@orca-so/tx-sender";
import { setPayerFromBytes, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchPositionBundle, getInitializePositionBundleInstruction } from "@orca-so/whirlpools-client";
import { createSolanaRpc, generateKeyPairSigner } from "@solana/kit";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

import secret from "../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    //LANG:JP PositionBundle 用の Mint, PDA, ATA のアドレスを生成
    //LANG:EN Generate the address of Mint, PDA, and ATA for PositionBundle
    //LANG:KR PositionBundle에 사용할 민트, PDA, ATA 주소를 생성
    const positionBundleKeyPair = await generateKeyPairSigner();
    const positionBundlePda = await fetchPositionBundle(rpc, positionBundleKeyPair.address);
    const positionBundleTokenAccount = await findAssociatedTokenPda(
        {
            mint: positionBundleKeyPair.address,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
        }
    );

    //LANG:JP PositionBundle 初期化命令を作成
    //LANG:EN Build the instruction to initialize PositionBundle
    //LANG:KR PositionBundle를 초기화하기 위한 명령을 생성
    const initializePositionBundleIx = getInitializePositionBundleInstruction(
        {
            funder: signer,        
            positionBundle: positionBundlePda.address,
            positionBundleMint: positionBundleKeyPair,
            positionBundleTokenAccount: positionBundleTokenAccount[0],
            positionBundleOwner: signer.address,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
        }
    );

    //LANG:JP トランザクションを送信
    //LANG:EN Send the transaction
    //LANG:KR 트랜잭션을 전송
    const tx = await buildAndSendTransaction([initializePositionBundleIx], signer);
    console.log("tx:", tx);
}

main().catch((e) => console.error("error:", e));