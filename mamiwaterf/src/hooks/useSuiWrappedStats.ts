import { fetchAccountStats, fetchWalletCoins } from "../utils/suiWrappedService";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { determinePersona, PERSONAS } from "../utils/personas";

export interface WrappedStats {
    totalTxns: number;
    gasBurned: number; // in SUI
    firstTxDate: Date | null;
    daysActive: number;
    uniqueInteractions: number;
    topDAppId: string | null;
    persona: keyof typeof PERSONAS;
    coins: { symbol: string; amount: number; decimals: number; valueUsd: number }[];
    monthlyStats: {
        highestInflowMonth: { month: string; txCount: number };
        lowestInflowMonth: { month: string };
        mostActiveMonth: { month: string; txCount: number };
    };
    contractStats: {
        uniqueContracts: number;
        mostInteracted: { address: string; count: number };
    };
    coinFlows: Array<{
        coinType: string;
        inflow: number;
        outflow: number;
        monthlyInflows: Record<string, number>;
    }>;
    isLoading: boolean;
}

export const useSuiWrappedStats = (network: 'mainnet' | 'testnet' = 'mainnet', addressOverride?: string) => {
    const account = useCurrentAccount();
    const targetAddress = addressOverride || account?.address;

    return useQuery({
        queryKey: ['sui-wrapped', targetAddress, network],
        queryFn: async (): Promise<WrappedStats> => {
            if (!targetAddress) throw new Error("No account connected");

            // Only use Blockberry for Mainnet stats as it indexes Mainnet primarily
            if (network === 'testnet') {
                console.warn("Blockberry stats are mainly for Mainnet. Switching network might fail or show mainnet data.");
            }

            const [accountStats, walletCoins] = await Promise.all([
                fetchAccountStats(targetAddress, network),
                fetchWalletCoins(targetAddress)
            ]);

            // Fallback object if Blockberry fails or returns null
            if (!accountStats) {
                // In a real scenario, could fallback to RPC, but let's throw to show error UI
                throw new Error("Failed to fetch Blockberry stats");
            }

            const totalTxns = accountStats.transactionCount;
            const gasBurned = accountStats.totalGasSpent;
            const firstDate = accountStats.firstTransactionBlock?.timestampMs
                ? new Date(accountStats.firstTransactionBlock.timestampMs)
                : new Date();

            // Days Active Calculation
            const now = new Date();
            const daysActive = Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

            // Determine Persona
            const persona = determinePersona(totalTxns, gasBurned, totalTxns, daysActive);

            return {
                totalTxns,
                gasBurned,
                firstTxDate: firstDate,
                daysActive,
                uniqueInteractions: totalTxns, // Proxy using total txs
                topDAppId: null,
                persona: persona.type,
                coins: walletCoins.map(c => {
                    console.log('Coin data:', c); // Debug: see actual coin structure
                    const balance = c.balance || 0;
                    const price = c.derivedPriceInUSD || c.priceInUSD || 0;
                    // Calculate USD value: (balance / 10^decimals) * price
                    const normalizedBalance = balance / Math.pow(10, c.decimals || 0);
                    const valueUsd = normalizedBalance * price;

                    return {
                        symbol: c.coinSymbol || c.symbol || 'Unknown',
                        amount: balance,
                        decimals: c.decimals || 9,
                        valueUsd: valueUsd
                    };
                }),
                monthlyStats: accountStats.monthlyStats || {
                    highestInflowMonth: { month: 'N/A', txCount: 0 },
                    lowestInflowMonth: { month: 'N/A' },
                    mostActiveMonth: { month: 'N/A', txCount: 0 }
                },
                contractStats: accountStats.contractStats || {
                    uniqueContracts: 0,
                    mostInteracted: { address: 'N/A', count: 0 }
                },
                coinFlows: accountStats.coinFlows || [],
                isLoading: false
            };
        },
        enabled: !!targetAddress, // Only run query if targetAddress is available
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: 1, // Only retry once to avoid 429 loops
        refetchOnWindowFocus: false, // Stop refetching when you click back on the tab
    });
};
