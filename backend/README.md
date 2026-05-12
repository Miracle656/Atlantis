# ATLANTIS Backend - Enoki Gasless Transactions

This backend server handles gasless transactions for the ATLANTIS dApp discovery platform using Mysten's Enoki service.

## Features

- **Gasless Transactions**: Sponsor user transactions using Enoki
- **Testnet Support**: Works on Sui testnet
- **Express API**: RESTful endpoints for transaction sponsoring
- **TypeScript**: Fully typed for better development experience

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Then edit `.env` with your Enoki credentials:

```env
ENOKI_API_KEY=your_enoki_api_key_here
ENOKI_PRIVATE_KEY=your_enoki_private_key_here
PORT=3001
NODE_ENV=development
SUI_NETWORK=testnet
```

### 3. Get Enoki Credentials

1. Visit [Enoki Dashboard](https://enoki.mystenlabs.com/)
2. Create a new project
3. Get your API Key and Private Key
4. Add them to your `.env` file

### 4. Run the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### Sponsor Transaction
```
POST /api/sponsor-transaction
```

**Request Body:**
```json
{
  "transactionBytes": "base64_encoded_transaction",
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "digest": "transaction_digest",
  "effects": {...}
}
```

## Frontend Integration

Update your frontend to call the backend API instead of directly executing transactions:

```typescript
// Instead of:
await signAndExecuteTransactionBlock({ transactionBlock: tx });

// Use:
const txBytes = await tx.build({ client: suiClient });
const response = await fetch('http://localhost:3001/api/sponsor-transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionBytes: txBytes,
    userAddress: account.address
  })
});
```

## Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Update CORS origins in `src/index.ts`
3. Deploy to your preferred hosting service (Vercel, Railway, Render, etc.)
4. Update frontend API URL to point to your deployed backend

## Security Notes

- **Never commit `.env` file** - It contains sensitive credentials
- **Rotate keys regularly** - Update Enoki keys periodically
- **Use HTTPS in production** - Always use secure connections
- **Rate limiting** - Consider adding rate limiting for production

## Troubleshooting

### "ENOKI_API_KEY must be set"
Make sure you've created a `.env` file with your Enoki credentials.

### "Failed to sponsor transaction"
Check that:
- Your Enoki API key is valid
- You have sufficient balance in your Enoki account
- The transaction bytes are correctly formatted
- You're using the correct network (testnet/mainnet)

## License

MIT
