import { useState } from 'react';
import { Transaction } from "@mysten/sui/transactions";
import { useCurrentAccount } from "@mysten/dapp-kit";

interface SponsoredTransactionOptions {
    onSuccess?: (digest: string) => void;
    onError?: (error: any) => void;
}

interface SponsorResponse {
    success: boolean;
    digest?: string;
    error?: string;
}

export const useSponsoredTransaction = () => {
    const account = useCurrentAccount();
    const [isExecuting, setIsExecuting] = useState(false);

    const executeSponsored = async (
        transaction: Transaction,
        options?: SponsoredTransactionOptions
    ) => {
        if (!account?.address) {
            const error = new Error('No account connected');
            console.error(error);
            if (options?.onError) options.onError(error);
            return;
        }

        try {
            setIsExecuting(true);

            // For zkLogin sponsored transactions:
            // 1. Don't sign on frontend (zkLogin wallets have no gas)
            // 2. Send unsigned transaction to sponsor API
            // 3. Sponsor API will build, sign, and execute

            // Serialize transaction (unsigned)
            const transactionBytes = transaction.serialize();
            const transactionBase64 = btoa(String.fromCharCode.apply(null, Array.from(transactionBytes) as any));

            console.log('Sending unsigned transaction to sponsor API...');

            // Send to sponsor API
            const response = await fetch('/api/sponsor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionBytes: transactionBase64,
                    userAddress: account.address,
                    // No user signature - sponsor handles everything
                }),
            });

            const result: SponsorResponse = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Sponsorship failed');
            }

            console.log('✓ Sponsored transaction successful:', result.digest);
            setIsExecuting(false);

            if (options?.onSuccess && result.digest) {
                options.onSuccess(result.digest);
            }

            return result;
        } catch (error: any) {
            console.error('Sponsored transaction failed:', error);
            setIsExecuting(false);
            if (options?.onError) options.onError(error);
            throw error;
        }
    };

    // Check if user needs sponsorship (zkLogin wallet with no gas)
    const needsSponsorship = async (): Promise<boolean> => {
        // Sponsored transactions for zkLogin require Enoki's enterprise API
        // For now, zkLogin users should get testnet SUI from faucet
        // https://faucet.testnet.sui.io
        return false;

        /* Disabled until Enoki enterprise sponsorship is implemented
        if (!account?.address) return false;

        try {
            const coins = await client.getCoins({
                owner: account.address,
                coinType: '0x2::sui::SUI',
            });

            return coins.data.length === 0;
        } catch (error) {
            console.error('Error checking gas coins:', error);
            return false;
        }
        */
    };

    return {
        executeSponsored,
        needsSponsorship,
        isExecuting,
        isAuthenticated: !!account,
        address: account?.address,
    };
};
