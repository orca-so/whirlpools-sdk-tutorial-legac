# tour-de-whirlpool-kit
Tour de Whirlpool for SDK with kit

## How to run

1. Install dependencies
```bash
yarn
```

2. Create `.env` file
```bash
cp .env.example .env
# or create your own .env file
```

3. Run
```bash
ts-node src/011_get_sol_balance.ts
```

## What are differents between @orca-so/whirlpool-sdk and @orca-so/whirlpools?

@orca-so/whirlpool-sdk is a SDK for building a whirlpool, interacting with @solana/web3.js.
@orca-so/whirlpools is same SDK but with @solana/kit, the next version of @solana/web3.js.
