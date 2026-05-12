# Recording User Interactions

This guide will help you record a user interaction so you can test the review functionality.

## Prerequisites

You need:
1. Your wallet address (the one that deployed the contract)
2. Your wallet's private key
3. Your dApp ID (the one you submitted)

## Step 1: Find Your IndexerCap

1. Open `scripts/findIndexerCap.ts`
2. Replace `YOUR_WALLET_ADDRESS_HERE` with your wallet address
3. Run the script:

```bash
npx tsx scripts/findIndexerCap.ts
```

This will output your `INDEXER_CAP_ID`.

## Step 2: Record an Interaction

1. Open `scripts/recordInteraction.ts`
2. Fill in the required values:
   - `INDEXER_CAP_ID`: From Step 1
   - `DAPP_ID`: Your dApp's object ID (e.g., `0x2dda84d475ac7aa76bbd4f6e290e5c278b3ef946dfdf467065a80787fea97dd3`)
   - `USER_ADDRESS`: Your wallet address (the one you want to review with)
   - `PRIVATE_KEY`: Your wallet's private key (without the `0x` prefix)

3. Run the script:

```bash
npx tsx scripts/recordInteraction.ts
```

## Step 3: Test the Review

After successfully recording an interaction, you can now:
1. Go to your dApp's detail page
2. Submit a review
3. The transaction should succeed!

## Security Note

⚠️ **NEVER commit your private key to version control!**

Consider adding `scripts/recordInteraction.ts` to `.gitignore` after filling in your private key, or use environment variables instead.

## Finding Your DApp ID

Your dApp ID was shown in the console logs when you submitted it. You can also find it by:
1. Opening the browser console
2. Looking for the log: `DApp IDs: ['0x...']`
3. Or checking the URL when viewing your dApp (e.g., `/dapp/0x...`)

## Alternative: Using Environment Variables

For better security, you can modify the script to use environment variables:

```typescript
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const USER_ADDRESS = process.env.USER_ADDRESS || '';
```

Then run:
```bash
PRIVATE_KEY=your_key USER_ADDRESS=your_address npx tsx scripts/recordInteraction.ts
```
