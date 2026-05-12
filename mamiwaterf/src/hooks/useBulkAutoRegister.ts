import { useSuiClient } from "@mysten/dapp-kit";
import { useState } from "react";
import { useDApps } from "./useDApps";
import { bulkRegisterDApps, type RegistrationResult } from "../utils/bulkRegisterDApps";
import { fetchDAppsFromBlockberry, fetchDEXsFromBlockberry } from "../utils/blockberry";

export const useBulkAutoRegister = () => {
    const client = useSuiClient();
    const { data: allDApps } = useDApps();
    const [isRegistering, setIsRegistering] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [results, setResults] = useState<RegistrationResult[]>([]);

    /**
     * Automated bulk registration using private key
     */
    const registerAllWithPrivateKey = async (privateKey: string) => {
        try {
            setIsRegistering(true);
            setResults([]);

            // Fetch fresh data from Blockberry
            console.log("Fetching latest dApps from Blockberry...");
            const [defiData, dexData] = await Promise.all([
                fetchDAppsFromBlockberry(),
                fetchDEXsFromBlockberry()
            ]);

            // Combine and deduplicate
            const allBlockberryDApps = [...dexData, ...defiData];
            const uniqueDApps = Array.from(
                new Map(allBlockberryDApps.map(d => [d.projectName, d])).values()
            );

            console.log(`Found ${uniqueDApps.length} unique dApps to register`);
            setProgress({ current: 0, total: uniqueDApps.length });

            // Register all dApps
            const registrationResults = await bulkRegisterDApps(
                client,
                privateKey,
                uniqueDApps,
                (current, total, result) => {
                    setProgress({ current, total });
                    setResults(prev => [...prev, result]);
                }
            );

            setIsRegistering(false);
            return registrationResults;
        } catch (error) {
            console.error("Bulk registration failed:", error);
            setIsRegistering(false);
            throw error;
        }
    };

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
        registerAllWithPrivateKey,
        isRegistering,
        progress,
        results,
        successCount,
        failureCount,
        totalDApps: allDApps?.length || 0
    };
};
