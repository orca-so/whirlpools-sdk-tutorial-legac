import { address, createSolanaRpc } from "@solana/kit";
import { fetchPosition } from "@orca-so/whirlpools-client";
import { closePosition, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";

import secret from "../../wallet.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    console.log('wallet address:', signer.address);

    // 환경변수 WHIRLPOOL_POSITION에서 포지션 주소 가져옴
    const positionAddress = process.env.WHIRLPOOL_POSITION;
    const positionPubKey = address(positionAddress);
    const position = await fetchPosition(rpc, positionPubKey);
    console.log('position', position);

    // 허용 슬리피지 설정
    const slippage = 100; // 100bps = 1%

    const { instructions, callback: executeClosePosition } = await closePosition(position.data.positionMint, slippage);
    console.log('instructions', instructions);

    // 트랜잭션 전송
    const signature = await executeClosePosition();
    console.log('signature', signature);
}

main().catch((e) => console.error("error", e));
