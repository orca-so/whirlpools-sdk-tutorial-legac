import { address, createSolanaRpc } from "@solana/kit";
import { decreaseLiquidity, fetchPositionsForOwner, setJitoTipSetting, setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import {fetchPosition, getWhirlpoolAddress, Position} from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../../wallet.json";

dotenv.config();

async function main() {
    // RPC에 연결을 초기화하고 개인키를 로딩
    const rpc = createSolanaRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });
    console.log('signer:', signer.address);

    const positionAddress = address(process.env.WHIRLPOOL_POSITION);

    // 포지션과 해당 포지션이 속한 풀 가져옴
    const position = await fetchPosition(rpc, positionAddress);
    const whirlpool = position.data.whirlpool;

    // 인출할 유동성을 비율로 지정 (30%)
    const liquidity = position.data.liquidity;
    const liquidityDelta = (liquidity * BigInt(30)) / BigInt(100);

    console.log("liquidity:", liquidity);
    console.log("liquidityDelta:", liquidityDelta);

    // 허용 슬리피지 설정
    const slippage = 100; // 100 bps = 1%

    // 트랜잭션 실행 전의 유동성 표시
    console.log("liquidity(before):", position.data.liquidity);

    // 트랜잭션 생성
    const { quote, instructions, callback: executeDecreaseLiquidity } = await decreaseLiquidity(
        position.data.positionMint,
        {
            // 인출할 유동성
            liquidity: liquidityDelta,
        },

        // 허용 슬리피지
        slippage,
    );

    console.log("quote:", quote);
    console.log("instructions:", instructions);

    // 트랜잭션 전파
    const signature = await executeDecreaseLiquidity();
    console.log('signature:', signature);

    // TODO: print after liquidity
}

main().catch(e => console.error(e));
