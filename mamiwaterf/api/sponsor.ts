import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Allowed contract calls for sponsorship
const ALLOWED_FUNCTIONS = [
    'add_review',
    'add_comment',
    'reply_to_comment',
];

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(address: string): boolean {
    const now = Date.now();
    const limit = rateLimits.get(address);

    if (!limit || now > limit.resetTime) {
        // Reset limit (10 transactions per hour)
        rateLimits.set(address, {
            count: 1,
            resetTime: now + 60 * 60 * 1000, // 1 hour
        });
        return true;
    }

    if (limit.count >= 10) {
        return false; // Rate limit exceeded
    }

    limit.count++;
    return true;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { transactionBytes, userAddress } = req.body;

        if (!transactionBytes || !userAddress) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check rate limit
        if (!checkRateLimit(userAddress)) {
            return res.status(429).json({
                error: 'Rate limit exceeded. Maximum 10 transactions per hour.',
            });
        }

        // Get sponsor private key from environment
        const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY;
        if (!sponsorPrivateKey) {
            console.error('SPONSOR_PRIVATE_KEY not configured');
            return res.status(500).json({ error: 'Sponsor not configured' });
        }

        // Initialize Sui client
        const client = new SuiClient({
            url: 'https://fullnode.testnet.sui.io:443',
        });

        // Create keypair from private key
        const sponsorKeypair = Ed25519Keypair.fromSecretKey(sponsorPrivateKey);
        const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();

        console.log(`Sponsoring transaction for ${userAddress} from ${sponsorAddress}`);

        // Deserialize transaction from base64
        const txBytesArray = Uint8Array.from(atob(transactionBytes), c => c.charCodeAt(0));
        const transaction = Transaction.from(txBytesArray);

        // Set sender and gas owner
        // For zkLogin: sponsor signs on behalf of user
        transaction.setSender(userAddress);
        transaction.setGasOwner(sponsorAddress);
        transaction.setGasBudget(10000000); // 0.01 SUI max

        // Build and sign with sponsor key
        const { bytes, signature } = await transaction.sign({
            client,
            signer: sponsorKeypair,
        });

        console.log(`Executing sponsored transaction...`);

        // Execute sponsored transaction
        const result = await client.executeTransactionBlock({
            transactionBlock: bytes,
            signature,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        const success = result.effects?.status?.status === 'success';

        if (success) {
            console.log(`✓ Sponsored transaction successful: ${result.digest}`);
            return res.status(200).json({
                success: true,
                digest: result.digest,
                effects: result.effects,
            });
        } else {
            console.error(`✗ Sponsored transaction failed:`, result.effects?.status);
            return res.status(500).json({
                success: false,
                error: result.effects?.status?.error || 'Transaction failed',
            });
        }
    } catch (error: any) {
        console.error('Sponsor API error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error',
        });
    }
}
