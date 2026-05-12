import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useState } from "react";
import { useDApps } from "./useDApps";
import { createRegisterDAppTransaction } from "../utils/autoRegisterDApps";
import type { DApp } from "../types";

export const useAutoRegisterDApps = () => {
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const { data: dapps } = useDApps();
    const [isRegistering, setIsRegistering] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    /**
     * Register a single dApp
     */
    const registerSingleDApp = async (
        dapp: DApp,
        onSuccess?: () => void,
        onError?: (error: any) => void
    ) => {
        try {
            setIsRegistering(true);
            const tx = createRegisterDAppTransaction(dapp);

            signAndExecuteTransaction(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        console.log(`✓ Registered ${dapp.name}:`, result);
                        setIsRegistering(false);
                        if (onSuccess) onSuccess();
                    },
                    onError: (err) => {
                        console.error(`✗ Failed to register ${dapp.name}:`, err);
                        setIsRegistering(false);
                        if (onError) onError(err);
                    },
                }
            );
        } catch (error) {
            console.error("Registration failed:", error);
            setIsRegistering(false);
            if (onError) onError(error);
        }
    };

    /**
     * Register multiple dApps one by one (safer than batch)
     */
    const registerMultipleDApps = async (
        dappsToRegister: DApp[],
        onComplete?: (successful: number, failed: number) => void
    ) => {
        setIsRegistering(true);
        setProgress({ current: 0, total: dappsToRegister.length });

        let successful = 0;
        let failed = 0;

        for (let i = 0; i < dappsToRegister.length; i++) {
            const dapp = dappsToRegister[i];
            setProgress({ current: i + 1, total: dappsToRegister.length });

            try {
                await new Promise<void>((resolve) => {
                    registerSingleDApp(
                        dapp,
                        () => {
                            successful++;
                            resolve();
                        },
                        (error) => {
                            failed++;
                            console.warn(`Skipping ${dapp.name} due to error:`, error);
                            resolve(); // Continue even if one fails
                        }
                    );
                });

                // Wait a bit between transactions to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                failed++;
                console.error(`Error registering ${dapp.name}:`, error);
            }
        }

        setIsRegistering(false);
        setProgress({ current: 0, total: 0 });

        if (onComplete) {
            onComplete(successful, failed);
        }
    };

    /**
     * Register all Blockberry dApps
     */
    const registerAllDApps = async (
        onComplete?: (successful: number, failed: number) => void
    ) => {
        if (!dapps || dapps.length === 0) {
            console.warn("No dApps to register");
            return;
        }

        await registerMultipleDApps(dapps, onComplete);
    };

    return {
        registerSingleDApp,
        registerMultipleDApps,
        registerAllDApps,
        isRegistering,
        progress,
        availableDApps: dapps || [],
    };
};
