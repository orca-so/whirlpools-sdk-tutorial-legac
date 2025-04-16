import { address } from "@solana/kit";
import { increasePosLiquidity, setPayerFromBytes, setRpc, setWhirlpoolsConfig } from "@orca-so/whirlpools";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    const positionMint = address(process.env.POSITION_MINT);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setRpc(process.env.RPC_ENDPOINT_URL);
    await setWhirlpoolsConfig("solanaDevnet");
    console.log('signer:', signer.address);

    //LANG:JP トランザクションを作成
    //LANG:JP 見積もりを取得
    //LANG:EN Create a transaction
    //LANG:EN Obtain deposit estimation
    //LANG:KR 트랜잭션 생성
    //LANG:KR 예치 예상치 가져옴
    const devUsdcAmount = 1_000_000n;
    const { quote, callback: sendTx } = await increasePosLiquidity(
        positionMint,
        {
            tokenB: devUsdcAmount,
        },
        100
    );

    const txHash = await sendTx();
    console.log("Position mint:", positionMint);
    console.log("Quote:");
    console.log("  liquidity amount:", quote.liquidityDelta);
    console.log("  estimated amount of devSAMO to supply without slippage:", quote.tokenEstA);
    console.log("  estimated amount of devUSDC to supply without slippage:", quote.tokenEstB);
    console.log("  amount of devSAMO to supply if slippage is fully applied:", quote.tokenMaxA);
    console.log("  amount of tokenB to supply if slippage is fully applied:", quote.tokenMaxB);
    console.log('TX hash:', txHash);
}

main().catch(e => console.error(e));