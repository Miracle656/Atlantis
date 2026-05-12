import dotenv from 'dotenv';
import { SuiClient } from '@mysten/sui.js/client';
import axios from 'axios';

// Load environment variables first
dotenv.config();

// Use the PRIVATE API key from Enoki dashboard
const ENOKI_API_KEY = process.env.ENOKI_API_KEY!;
const SUI_NETWORK = (process.env.SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet';

const ENOKI_API_BASE_URL = 'https://api.enoki.mystenlabs.com/v1';

if (!ENOKI_API_KEY) {
    throw new Error('ENOKI_API_KEY must be set in environment variables');
}

// Initialize Sui client
const suiClient = new SuiClient({
    url: SUI_NETWORK === 'mainnet'
        ? 'https://fullnode.mainnet.sui.io:443'
        : 'https://fullnode.testnet.sui.io:443'
});

interface SponsorTransactionRequest {
    network?: 'testnet' | 'mainnet' | 'devnet';
    transactionBlockKindBytes: string;
    sender: string;
    allowedAddresses?: string[];
    allowedMoveCallTargets?: string[];
}

interface SponsorTransactionResponse {
    data: {
        digest: string;
        bytes: string;
    };
}

interface ExecuteSponsoredTransactionRequest {
    signature: string;
}

interface ExecuteSponsoredTransactionResponse {
    data: {
        digest: string;
    };
}

/**
 * Step 1: Create a sponsored transaction using Enoki HTTP API
 * This returns the transaction bytes and digest
 */
export async function createSponsoredTransaction(
    transactionKindBytes: string,
    senderAddress: string
): Promise<{ digest: string; bytes: string }> {
    try {
        console.log('Creating sponsored transaction...');
        console.log('Sender:', senderAddress);
        console.log('Network:', SUI_NETWORK);

        const response = await axios.post<SponsorTransactionResponse>(
            `${ENOKI_API_BASE_URL}/transaction-blocks/sponsor`,
            {
                network: SUI_NETWORK,
                transactionBlockKindBytes: transactionKindBytes,
                sender: senderAddress,
            } as SponsorTransactionRequest,
            {
                headers: {
                    'Authorization': `Bearer ${ENOKI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('Sponsored transaction created:', response.data.data.digest);

        return response.data.data;
    } catch (error: any) {
        console.error('Error creating sponsored transaction:', error.response?.data || error.message);
        throw new Error(`Failed to create sponsored transaction: ${error.response?.data?.message || error.message}`);
    }
}

/**
 * Step 2: Execute the sponsored transaction with user signature
 */
export async function executeSponsoredTransaction(
    digest: string,
    userSignature: string
): Promise<{ digest: string }> {
    try {
        console.log('Executing sponsored transaction:', digest);

        const response = await axios.post<ExecuteSponsoredTransactionResponse>(
            `${ENOKI_API_BASE_URL}/transaction-blocks/sponsor/${digest}`,
            {
                signature: userSignature,
            } as ExecuteSponsoredTransactionRequest,
            {
                headers: {
                    'Authorization': `Bearer ${ENOKI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('Transaction executed successfully:', response.data.data.digest);

        return response.data.data;
    } catch (error: any) {
        console.error('Error executing sponsored transaction:');
        console.error('Full error:', JSON.stringify(error.response?.data, null, 2));
        throw new Error(`Failed to execute sponsored transaction: ${error.response?.data?.message || error.message}`);
    }
}

/**
 * Combined function for full sponsored transaction flow
 * This is the main function the backend API will use
 */
export async function sponsorAndExecuteTransaction(
    transactionKindBytes: string,
    senderAddress: string,
    userSignature: string
) {
    try {
        // Step 1: Create sponsored transaction
        const { digest, bytes } = await createSponsoredTransaction(
            transactionKindBytes,
            senderAddress
        );

        // Step 2: Execute with user signature
        const result = await executeSponsoredTransaction(digest, userSignature);

        // Get transaction details from Sui
        const txDetails = await suiClient.getTransactionBlock({
            digest: result.digest,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        return {
            digest: result.digest,
            effects: txDetails.effects,
            objectChanges: txDetails.objectChanges,
        };
    } catch (error: any) {
        console.error('Error in sponsorAndExecuteTransaction:', error);
        throw error;
    }
}

export { suiClient };
