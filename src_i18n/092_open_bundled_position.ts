import { buildAndSendTransaction, setPriorityFeeSetting, setRpc } from "@orca-so/tx-sender";
import { fetchWhirlpoolsByTokenPair, setPayerFromBytes, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { fetchPositionBundle, fetchWhirlpool, getBundledPositionAddress, getOpenBundledPositionInstruction } from "@orca-so/whirlpools-client";
import { address, createSolanaRpc } from "@solana/kit";
import {
    firstUnoccupiedPositionInBundle,
    getInitializableTickIndex,
    sqrtPriceToPrice,
    sqrtPriceToTickIndex,
    tickIndexToPrice
} from "@orca-so/whirlpools-core";
import {findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS} from "@solana-program/token";

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

    //LANG:JP トークン定義
    //LANG:EN Token definition
    //LANG:KR 토큰 정의
    // devToken specification
    // https://everlastingsong.github.io/nebula/
    const devUSDC = {mint: address("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
    const devSAMO = {mint: address("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};

    //LANG:JP 環境変数 WHIRLPOOL_POSITION_BUNDLE から PositionBundle のアドレスを読み込み
    //LANG:EN Retrieve the position bundle address from the WHIRLPOOL_POSITION_BUNDLE environment variable
    //LANG:KR 환경변수 WHIRLPOOL_POSITION_BUNDLE에서 PositionBundle 주소를 가져옴
    const positionBundleAddress = process.env.WHIRLPOOL_POSITION_BUNDLE;
    const positionBundlePubkey = address(positionBundleAddress);
    console.log("position bundle address:", positionBundlePubkey.toString());

    //LANG:JP devSAMO/devUSDC プール取得
    //LANG:EN Get devSAMO/devUSDC whirlpool
    //LANG:KR devSAMO/devUSDC 풀 가져옴
    const tickSpacing = 64;
    const whirlpoolPubkey = (await fetchWhirlpoolsByTokenPair(
        rpc,
        devSAMO.mint,
        devUSDC.mint,
    )).filter((whirlpool) => whirlpool.tickSpacing === tickSpacing);
    
    if (whirlpoolPubkey.length === 0) {
        throw new Error("No whirlpool found");
    }
    
    const whirlpool = await fetchWhirlpool(rpc, whirlpoolPubkey[0].address);
    console.log("whirlpool:", whirlpool);

    //LANG:JP プールにおける現在価格を取得
    //LANG:EN Get the current price of the pool
    //LANG:KR 풀의 현재 가격 가져옴
    const sqrtPriceX64 = whirlpool.data.sqrtPrice;
    const price = sqrtPriceToPrice(sqrtPriceX64, devSAMO.decimals, devUSDC.decimals);
    console.log("price:", price.toFixed(devUSDC.decimals));

    //LANG:JP 価格帯を設定
    //LANG:EN Set price range
    //LANG:KR 가격 범위를 설정
    const lowerPrice = BigInt(0.005);
    const upperPrice = BigInt(0.02);

    //LANG:JP 価格帯を調整 (全ての価格が設定可能ではなく、範囲指定に利用できる価格は決まっている(InitializableTickIndexに対応する価格))
    //LANG:EN Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
    //LANG:EN (prices corresponding to InitializableTickIndex are available)
    //LANG:KR 가격 범위 조정 (모든 가격을 설정할 수 없으며, InitializableTickIndex에 해당하는 가격만 가능)
    const lowerTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(lowerPrice), tickSpacing);
    const upperTickIndex = getInitializableTickIndex(sqrtPriceToTickIndex(upperPrice), tickSpacing);
    console.log("lower & upper tick index:", lowerTickIndex, upperTickIndex);
    console.log("lower & upper price:",
        tickIndexToPrice(lowerTickIndex, devSAMO.decimals, devUSDC.decimals),
        tickIndexToPrice(upperTickIndex, devSAMO.decimals, devUSDC.decimals),
    );

    //LANG:JP PositionBundle アカウントを取得
    //LANG:EN Get PositionBundle account
    //LANG:KR PositionBundle 계정 가져옴
    const positionBundle = await fetchPositionBundle(rpc, positionBundlePubkey);

    //LANG:JP PositionBundle 向けの ATA を取得
    //LANG:EN Get ATA for PositionBundle
    //LANG:KR PositionBundle용 ATA를 가져옴
    const positionBundleTokenAccount = await findAssociatedTokenPda(
        {
            mint: positionBundle.data.positionBundleMint,
            owner: signer.address,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
        }
    );
    console.log("positionBundleTokenAccount:", positionBundleTokenAccount);

    //LANG:JP PositionBundle における未使用の bundle index を取得
    //LANG:EN Get unused bundle indexes in PositionBundle
    //LANG:KR PositionBundle 내에서 사용되지 않은 bundle index를 가져옴
    const unoccupiedBundleIndex = firstUnoccupiedPositionInBundle(new Uint8Array(positionBundle.data.positionBitmap));
    console.log("unoccupiedBundleIndex:", unoccupiedBundleIndex);

    //LANG:JP PositionBundle によって管理されるポジションのアドレスを生成する
    //LANG:EN Generate address for positions managed by PositionBundle
    //LANG:KR PositionBundle에서 관리할 포지션 주소를 생성
    const [bundledPositionOnePda] = await getBundledPositionAddress(positionBundle.address, unoccupiedBundleIndex);
    console.log("bundledPositionOnePda:", bundledPositionOnePda);

    //LANG:JP PositionBundle で管理する 1 個目のポジションをオープンする命令を作成
    //LANG:EN Create an instruction to open the first position managed by PositionBundle
    //LANG:KR PositionBundle에서 관리할 첫 번째 포지션을 오픈하기 위한 명령 생성
    const openBundledPositionIx = getOpenBundledPositionInstruction({
        bundledPosition: bundledPositionOnePda,
        positionBundle: positionBundle.address,
        positionBundleTokenAccount: positionBundleTokenAccount[0],
        positionBundleAuthority: signer,
        whirlpool: whirlpool.address,
        funder: signer,
        bundleIndex: unoccupiedBundleIndex,
        tickLowerIndex: lowerTickIndex,
        tickUpperIndex: upperTickIndex,
    });

    //LANG:JP トランザクションを送信
    //LANG:EN Send the transaction
    //LANG:KR 트랜잭션 전파
    const tx = await buildAndSendTransaction(
        [openBundledPositionIx],
        signer,
        [positionBundleTokenAccount[0], bundledPositionOnePda[0]],
        "confirmed"
    );
    console.log("tx:", tx);
}

main().catch((e) => console.error("error:", e));