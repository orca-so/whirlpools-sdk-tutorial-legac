import { setPayerFromBytes, setPriorityFeeSetting, setRpc, setWhirlpoolsConfig, swap } from "@orca-so/whirlpools";
import { address } from "@solana/kit";
import { getWhirlpoolAddress } from "@orca-so/whirlpools-client";

import dotenv from "dotenv";
import secret from "../wallet.json";

dotenv.config();

async function main() {
    //LANG:JP RPC へのコネクション作成、秘密鍵読み込み
    //LANG:EN Initialize a connection to the RPC and read in private key
    //LANG:KR RPC에 연결을 초기화하고 개인키를 로딩
    await setRpc(process.env.RPC_ENDPOINT_URL);
    const signer = await setPayerFromBytes(new Uint8Array(secret));
    await setWhirlpoolsConfig("solanaDevnet");
    console.log("signer:", signer.address);

    //LANG:JP トークン定義
    //LANG:EN Token definition
    //LANG:KR 토큰 정의
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devUSDC = { mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6 };
    const devSAMO = { mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9 };

    //LANG:JP Whirlpool の Config アカウント
    //LANG:EN WhirlpoolsConfig account
    //LANG:KR WhirlpoolsConfig 계정임
    // devToken ecosystem / Orca Whirlpools
    const DEVNET_WHIRLPOOLS_CONFIG = address("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");
    const whirlpoolConfigAddress = address(DEVNET_WHIRLPOOLS_CONFIG.toString());

    //LANG:JP devSAMO/devUSDC プール取得
    //LANG:EN Get devSAMO/devUSDC whirlpool
    //LANG:KR devSAMO/devSUDC whirlpool을 가져옴옴
    //LANG:JP Whirlpool のプールは (プログラム, Config, 1個目のトークンのミントアドレス, 2個目のトークンのミントアドレス, ティックスペース)
    //LANG:JP の 5 要素で特定されます (DBで考えると5列の複合プライマリキーです)
    //LANG:EN Whirlpools are identified by 5 elements (Program, Config, mint address of the 1st token,
    //LANG:EN mint address of the 2nd token, tick spacing), similar to the 5 column compound primary key in DB
    //LANG:KR Whirlpools은 데이터베이스에서 5개의 열로 구성된 복합 기본키처럼, 다음의 5가지 요소로 식별됨
    //LANG:KR 프로그램, Config, 첫 번째 토큰의 민트 주소, 두 번째 토큰의 민트 주소, 그리고 틱 간격
    const tickSpacing = 64;
    const whirlpoolPda = await getWhirlpoolAddress(
        whirlpoolConfigAddress,
        devSAMO.mint,
        devUSDC.mint,
        tickSpacing,
    );
    console.log("whirlpoolPda:", whirlpoolPda);

    // NOTE: Set priority fee, maximum priority fee is 0.005 SOL
    setPriorityFeeSetting({
        type: "dynamic",
        maxCapLamports: BigInt(5_000_000), // Max priority fee = 0.005 SOL
    });

    //LANG:JP 1 devUSDC トークンを devSAMO にスワップします
    //LANG:EN Swap 1 devUSDC for devSAMO
    //LANG:KR devUSDC 1개를 devSAMO로 스왑함
    const amountIn = BigInt(100_000);

    //LANG:JP スワップの見積もり取得(シミュレーション実行)
    //LANG:EN Obtain swap estimation (run simulation)
    //LANG:KR 스왑 예상치 획득(시뮬레이션 실행)
    const { instructions, quote, callback: executeSwap } = await swap(
        //LANG:JP 入力するトークン
        //LANG:EN Input token and amount
        //LANG:KR 입력할 토큰과 수량
        {
            mint: devUSDC.mint,
            inputAmount: amountIn,   // swap 0.1 devUSDC to devSAMO
        },
        whirlpoolPda[0],
        //LANG:JP 許容するスリッページ (100bps = 1%)
        //LANG:EN Acceptable slippage (100bps = 1%)
        //LANG:KR 허용 슬리피지 (100bps = 1%)
        100,  // 100 bps = 1%
    );

    //LANG:JP 見積もり結果表示
    //LANG:EN Output the estimation
    //LANG:KR 예상 결과 출력
    console.log("instructions:", instructions);
    console.log("quote:", quote);

    //LANG:JP トランザクションを送信
    //LANG:EN Send the transaction using action
    //LANG:KR 액션을 이용하여 트랜잭션 전파
    const swapSignature = await executeSwap();
    console.log("swapSignature:", swapSignature);
}

main().catch(e => console.error("error:", e));