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

// ============================================================
// Agent evaluation endpoint
// ============================================================
//
// POST /api/agents/eval/:dappId
//   body: { packageId?, metadata: { name, tagline, category, website,
//           twitter?, github?, discord? }, parallel? }
//
// Runs the four specialists + summarizer for one dApp and publishes
// five AgentReports on-chain. Blocking — typical run is 60-180s. The
// caller should set a generous fetch timeout (>= 5 min).
//
// Returns:
//   200 EvalRoundResult on success or partial success
//   400 if metadata is missing
//   409 if an evaluation is already in flight for this dApp
//   500 on unexpected orchestrator error
import {
    runEvaluationRound,
    isEvalInFlight,
    EvalAlreadyRunningError,
} from './agents/orchestrator';

app.post('/api/agents/eval/:dappId', async (req: Request, res: Response) => {
    try {
        const { dappId } = req.params;
        const { packageId, metadata, parallel } = req.body;

        if (!dappId) {
            return res.status(400).json({ error: 'dappId path parameter is required' });
        }
        if (!metadata || typeof metadata.name !== 'string') {
            return res
                .status(400)
                .json({ error: 'request body must include metadata.name (string)' });
        }

        console.log(`[eval] starting round for ${dappId} (${metadata.name})`);
        const t0 = Date.now();

        const result = await runEvaluationRound({
            dappId,
            packageId,
            metadata,
            parallel: !!parallel,
        });

        console.log(
            `[eval] ${dappId} ${result.fullySuccessful ? 'OK' : 'PARTIAL'} in ${
                Date.now() - t0
            }ms — ${result.specialists.length} specialists, summary=${
                !!result.summary
            }`
        );
        res.json(result);
    } catch (err: any) {
        if (err instanceof EvalAlreadyRunningError) {
            return res.status(409).json({ error: err.message, dappId: err.dappId });
        }
        console.error('[eval] error:', err);
        res.status(500).json({ error: err?.message ?? String(err) });
    }
});

// Cheap probe so the frontend can disable the "Evaluate" button while
// a round is in flight (same in-process Set as the orchestrator).
app.get('/api/agents/eval/:dappId/in-flight', (req: Request, res: Response) => {
    res.json({ dappId: req.params.dappId, inFlight: isEvalInFlight(req.params.dappId) });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Enoki backend server running on port ${PORT}`);
    console.log(`📡 Network: ${process.env.SUI_NETWORK || 'testnet'}`);
    console.log(`🔑 Enoki configured: ${!!process.env.ENOKI_API_KEY}`);
});

export default app;
