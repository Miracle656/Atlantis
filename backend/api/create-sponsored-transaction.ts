import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSponsoredTransaction } from '../src/services/enoki';

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

        res.status(200).json({
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
}
