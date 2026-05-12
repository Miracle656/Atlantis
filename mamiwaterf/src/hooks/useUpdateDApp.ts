import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useQueryClient } from '@tanstack/react-query';
import { PACKAGE_ID, MODULE_NAME, REGISTRY_ID } from '../constants';

export interface UpdateDAppData {
    dappId: string;
    name: string;
    tagline: string;
    descriptionBlobId: string;
    iconUrl: string;
    bannerUrl: string;
    website: string;
    twitter?: string;
    discord?: string;
    github?: string;
    category: string;
    features: string[];
}

export interface UpdateDAppState {
    isUpdating: boolean;
    error: Error | null;
}

export function useUpdateDApp() {
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const queryClient = useQueryClient();

    const [state, setState] = useState<UpdateDAppState>({
        isUpdating: false,
        error: null,
    });

    const updateDApp = (
        data: UpdateDAppData,
        onSuccess?: () => void,
        onError?: (error: Error) => void
    ) => {
        setState({
            isUpdating: true,
            error: null,
        });

        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::update_dapp`,
                arguments: [
                    tx.object(REGISTRY_ID),
                    tx.pure.id(data.dappId),
                    tx.pure.string(data.name),
                    tx.pure.string(data.tagline),
                    tx.pure.string(data.descriptionBlobId),
                    tx.pure.string(data.iconUrl),
                    tx.pure.string(data.bannerUrl),
                    tx.pure.string(data.category),
                    tx.pure.string(data.website),
                    tx.pure.option("string", data.twitter || null),
                    tx.pure.option("string", data.discord || null),
                    tx.pure.option("string", data.github || null),
                    tx.pure.option("address", null), // package_id - keep existing
                    tx.pure.vector("string", data.features),
                    tx.object("0x6"), // Clock object
                ],
            });

            signAndExecute(
                {
                    transaction: tx,
                },
                {
                    onSuccess: async (result) => {
                        console.log(`✅ Updated dApp: ${data.name}`, result);

                        // Wait for transaction to be indexed
                        await client.waitForTransaction({
                            digest: result.digest,
                        });

                        // Invalidate ALL dApp-related caches (use prefix matching)
                        await queryClient.invalidateQueries({
                            queryKey: ['dapps'],
                            refetchType: 'all'
                        });
                        await queryClient.invalidateQueries({
                            queryKey: ['onChainDApp'],
                            refetchType: 'all'
                        });
                        await queryClient.invalidateQueries({
                            queryKey: ['reviews'],
                            refetchType: 'all'
                        });
                        await queryClient.invalidateQueries({
                            queryKey: ['comments'],
                            refetchType: 'all'
                        });

                        setState({
                            isUpdating: false,
                            error: null,
                        });

                        onSuccess?.();
                    },
                    onError: (error) => {
                        console.error('Update transaction failed:', error);
                        const err = error as Error;

                        setState({
                            isUpdating: false,
                            error: err,
                        });

                        onError?.(err);
                    },
                }
            );
        } catch (error) {
            console.error('Failed to build update transaction:', error);
            const err = error as Error;

            setState({
                isUpdating: false,
                error: err,
            });

            onError?.(err);
        }
    };

    return {
        ...state,
        updateDApp,
    };
}
