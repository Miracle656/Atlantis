import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeSponsoredTransaction, suiClient } from '../src/services/enoki';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

        res.status(200).json({
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
}
