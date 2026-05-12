import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useQueryClient } from '@tanstack/react-query';
import { PACKAGE_ID, MODULE_NAME, REGISTRY_ID } from '../constants';

export interface DeleteDAppOptions {
    dappId: string;
    dappName: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export interface DeleteDAppState {
    isDeleting: boolean;
    isPending: boolean; // Undo period active
    error: Error | null;
    timeRemaining: number; // Seconds remaining to undo
}

export function useDeleteDApp() {
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const queryClient = useQueryClient();

    const [state, setState] = useState<DeleteDAppState>({
        isDeleting: false,
        isPending: false,
        error: null,
        timeRemaining: 0,
    });

    const [undoTimer, setUndoTimer] = useState<number | null>(null);
    const [countdownTimer, setCountdownTimer] = useState<number | null>(null);

    const deleteDApp = (options: DeleteDAppOptions) => {
        const { dappId, dappName, onSuccess, onError } = options;

        // Clear any existing timers
        if (undoTimer) clearTimeout(undoTimer);
        if (countdownTimer) clearInterval(countdownTimer);

        // Start undo period (30 seconds)
        setState({
            isDeleting: false,
            isPending: true,
            error: null,
            timeRemaining: 30,
        });

        // Countdown timer (update every second)
        const countdown = setInterval(() => {
            setState(prev => {
                const newTime = prev.timeRemaining - 1;
                if (newTime <= 0) {
                    clearInterval(countdown);
                }
                return { ...prev, timeRemaining: newTime };
            });
        }, 1000);
        setCountdownTimer(countdown);

        // Undo timer (execute after 30 seconds)
        const timer = setTimeout(() => {
            clearInterval(countdown);
            executeDelete(dappId, dappName, onSuccess, onError);
        }, 30000);
        setUndoTimer(timer);
    };

    const undoDelete = () => {
        if (undoTimer) clearTimeout(undoTimer);
        if (countdownTimer) clearInterval(countdownTimer);

        setState({
            isDeleting: false,
            isPending: false,
            error: null,
            timeRemaining: 0,
        });

        setUndoTimer(null);
        setCountdownTimer(null);
    };

    const executeDelete = (
        dappId: string,
        dappName: string,
        onSuccess?: () => void,
        onError?: (error: Error) => void
    ) => {
        setState(prev => ({
            ...prev,
            isDeleting: true,
            isPending: false,
        }));

        try {
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::delete_dapp`,
                arguments: [
                    tx.object(REGISTRY_ID),
                    tx.pure.id(dappId),
                ],
            });

            signAndExecute(
                {
                    transaction: tx,
                },
                {
                    onSuccess: async (result) => {
                        console.log(`✅ Deleted dApp: ${dappName}`, result);

                        // Wait for transaction to be indexed
                        await client.waitForTransaction({
                            digest: result.digest,
                        });

                        // Invalidate cache
                        queryClient.invalidateQueries({ queryKey: ['dapps'] });

                        setState({
                            isDeleting: false,
                            isPending: false,
                            error: null,
                            timeRemaining: 0,
                        });

                        onSuccess?.();
                    },
                    onError: (error) => {
                        console.error('Delete transaction failed:', error);
                        const err = error as Error;

                        setState({
                            isDeleting: false,
                            isPending: false,
                            error: err,
                            timeRemaining: 0,
                        });

                        onError?.(err);
                    },
                }
            );
        } catch (error) {
            console.error('Failed to build delete transaction:', error);
            const err = error as Error;

            setState({
                isDeleting: false,
                isPending: false,
                error: err,
                timeRemaining: 0,
            });

            onError?.(err);
        }
    };

    return {
        ...state,
        deleteDApp,
        undoDelete,
    };
}
