import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createSponsoredTransaction, executeSponsoredTransaction, suiClient } from './services/enoki';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Enoki backend server is running' });
});

// Create sponsored transaction endpoint (Step 1)
app.post('/api/create-sponsored-transaction', async (req: Request, res: Response) => {
    try {
        const { transactionKindBytes, senderAddress } = req.body;

        if (!transactionKindBytes || !senderAddress) {
            return res.status(400).json({
                error: 'transactionKindBytes and senderAddress are required'
            });
        }

        console.log(`Creating sponsored transaction for user: ${senderAddress}`);

        const result = await createSponsoredTransaction(
            transactionKindBytes,
            senderAddress
        );

        res.json({
            success: true,
            digest: result.digest,
            bytes: result.bytes
        });
    } catch (error: any) {
        console.error('Error creating sponsored transaction:', error);
        res.status(500).json({
            error: 'Failed to create sponsored transaction',
            message: error.message
        });
    }
});

// Execute sponsored transaction endpoint (Step 2)
app.post('/api/execute-sponsored-transaction', async (req: Request, res: Response) => {
    try {
        const { digest, signature } = req.body;

        if (!digest || !signature) {
            return res.status(400).json({
                error: 'digest and signature are required'
            });
        }

        console.log(`Executing sponsored transaction: ${digest}`);

        const result = await executeSponsoredTransaction(digest, signature);

        // Get transaction details from Sui
        const txDetails = await suiClient.getTransactionBlock({
            digest: result.digest,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        res.json({
            success: true,
            digest: result.digest,
            effects: txDetails.effects,
            objectChanges: txDetails.objectChanges
        });
    } catch (error: any) {
        console.error('Error executing sponsored transaction:', error);
        res.status(500).json({
            error: 'Failed to execute sponsored transaction',
            message: error.message
        });
    }
});


// Verification Endpoint (Step 3)
import { verifyUserInteraction } from './services/verification';

app.post('/api/verify-user', async (req: Request, res: Response) => {
    try {
        const { userAddress, dappId, packageId } = req.body;

        if (!userAddress || !dappId) {
            return res.status(400).json({ error: 'userAddress and dappId are required' });
        }

        const result = await verifyUserInteraction(userAddress, dappId, packageId);

        res.json(result);

    } catch (error: any) {
        console.error('Verification endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Enoki backend server running on port ${PORT}`);
    console.log(`📡 Network: ${process.env.SUI_NETWORK || 'testnet'}`);
    console.log(`🔑 Enoki configured: ${!!process.env.ENOKI_API_KEY}`);
});

export default app;
