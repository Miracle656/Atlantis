// Backend API URL
export const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';

interface CreateSponsoredTransactionRequest {
    transactionKindBytes: string;
    senderAddress: string;
}

interface CreateSponsoredTransactionResponse {
    success: boolean;
    digest: string;
    bytes: string;
}

interface ExecuteSponsoredTransactionRequest {
    digest: string;
    signature: string;
}

interface ExecuteSponsoredTransactionResponse {
    success: boolean;
    digest: string;
    effects: any;
    objectChanges?: any[];
}

/**
 * Step 1: Create a sponsored transaction
 * Returns the digest and bytes that need to be signed
 */
export async function createSponsoredTransaction(
    transactionKindBytes: string,
    senderAddress: string
): Promise<CreateSponsoredTransactionResponse> {
    try {
        const response = await fetch(`${BACKEND_API_URL}/api/create-sponsored-transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transactionKindBytes,
                senderAddress,
            } as CreateSponsoredTransactionRequest),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create sponsored transaction');
        }

        const data: CreateSponsoredTransactionResponse = await response.json();
        return data;
    } catch (error: any) {
        console.error('Error creating sponsored transaction:', error);
        throw new Error(`Failed to create sponsored transaction: ${error.message}`);
    }
}

/**
 * Step 2: Execute the sponsored transaction with user signature
 */
export async function executeSponsoredTransaction(
    digest: string,
    signature: string
): Promise<ExecuteSponsoredTransactionResponse> {
    try {
        const response = await fetch(`${BACKEND_API_URL}/api/execute-sponsored-transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                digest,
                signature,
            } as ExecuteSponsoredTransactionRequest),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to execute sponsored transaction');
        }

        const data: ExecuteSponsoredTransactionResponse = await response.json();
        return data;
    } catch (error: any) {
        console.error('Error executing sponsored transaction:', error);
        throw new Error(`Failed to execute sponsored transaction: ${error.message}`);
    }
}

/**
 * Check if the backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${BACKEND_API_URL}/health`);
        return response.ok;
    } catch (error) {
        console.error('Backend health check failed:', error);
        return false;
    }
}

/**
 * Verify user interaction with a dApp using the backend indexer
 */
export async function verifyUser(
    userAddress: string,
    dappId: string,
    packageId: string
): Promise<{ verified: boolean; txDigest?: string, message?: string }> {
    try {
        const response = await fetch(`${BACKEND_API_URL}/api/verify-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress, dappId, packageId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to verify user');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Verification failed:', error);
        return { verified: false, message: error.message };
    }
}
