import { SuiClient } from "@mysten/sui/client";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fetch real dApp statistics from Sui blockchain
 * Based on research: https://docs.sui.io/references/sui-api
 */
export async function getDAppStats(
    client: SuiClient,
    packageId: string,
    timeWindowMs: number = ONE_DAY_MS
): Promise<{
    users: number;
    transactions: number;
    volume: number;
}> {
    try {
        // Step 1: Auto-detect module name
        console.log(`🔍 Detecting modules for package: ${packageId.slice(0, 10)}...`);
        const modules = await client.getNormalizedMoveModulesByPackage({ package: packageId });
        const moduleNames = Object.keys(modules);

        if (moduleNames.length === 0) {
            console.warn(`⚠️  No modules found for package ${packageId}`);
            return { users: 0, transactions: 0, volume: 0 };
        }

        // Use the first module (or iterate through all for comprehensive stats)
        const mainModule = moduleNames[0];
        console.log(`📦 Using module: ${mainModule}`);

        // Step 2: Fetch transaction history
        const now = Date.now();
        const startTime = now - timeWindowMs;

        let hasMore = true;
        let cursor: string | null = null;
        let allTxs: any[] = [];

        // Pagination loop - fetch all transactions in time window
        while (hasMore && allTxs.length < 500) { // Safety limit: max 500 txs
            const response = await client.queryTransactionBlocks({
                filter: {
                    MoveFunction: {
                        package: packageId,
                        module: mainModule,
                    },
                },
                options: {
                    showBalanceChanges: true, // For volume calculation
                    showInput: true,          // For sender (users)
                    showEffects: true,        // For timestamp
                },
                cursor: cursor,
                limit: 50,
                order: 'descending', // Newest first
            });

            // Filter transactions within time window
            for (const tx of response.data) {
                const txTime = Number(tx.timestampMs || 0);
                if (txTime >= startTime) {
                    allTxs.push(tx);
                } else {
                    // Found transaction older than time window, stop
                    hasMore = false;
                    break;
                }
            }

            if (!response.hasNextPage || !hasMore) break;
            cursor = response.nextCursor || null;
        }

        console.log(`📊 Found ${allTxs.length} transactions in last ${timeWindowMs / (60 * 60 * 1000)}h`);

        // Step 3: Calculate statistics
        const uniqueUsers = new Set<string>();
        let totalVolumeMist = 0;

        for (const tx of allTxs) {
            // Count unique users (senders)
            if (tx.transaction?.data?.sender) {
                uniqueUsers.add(tx.transaction.data.sender);
            }

            // Calculate volume (sum of SUI spent)
            if (tx.balanceChanges) {
                for (const change of tx.balanceChanges) {
                    // Only count SUI (0x2::sui::SUI)
                    if (change.coinType === '0x2::sui::SUI') {
                        const amount = BigInt(change.amount);
                        // Sum negative changes (SUI leaving wallets = volume)
                        if (amount < 0) {
                            totalVolumeMist += Math.abs(Number(amount));
                        }
                    }
                }
            }
        }

        // Convert MIST to SUI (1 SUI = 1,000,000,000 MIST)
        const volumeInSui = totalVolumeMist / 1_000_000_000;

        return {
            users: uniqueUsers.size,
            transactions: allTxs.length,
            volume: volumeInSui,
        };
    } catch (error) {
        console.error(`❌ Failed to fetch stats for ${packageId}:`, error);
        return { users: 0, transactions: 0, volume: 0 };
    }
}

/**
 * Fetch stats for all time windows (24h, 7d, 30d)
 * WARNING: This is expensive! Use sparingly or move to backend.
 */
export async function getAllDAppStats(
    client: SuiClient,
    packageId: string
): Promise<{
    users24h: number;
    users7d: number;
    users30d: number;
    transactions24h: number;
    transactions7d: number;
    transactions30d: number;
    volume24h: number;
    volume7d: number;
    volume30d: number;
}> {
    console.log(`⏳ Fetching comprehensive stats for ${packageId.slice(0, 10)}... (this may take a while)`);

    // Fetch all time windows in parallel
    const [stats24h, stats7d, stats30d] = await Promise.all([
        getDAppStats(client, packageId, ONE_DAY_MS),
        getDAppStats(client, packageId, SEVEN_DAYS_MS),
        getDAppStats(client, packageId, THIRTY_DAYS_MS),
    ]);

    return {
        users24h: stats24h.users,
        users7d: stats7d.users,
        users30d: stats30d.users,
        transactions24h: stats24h.transactions,
        transactions7d: stats7d.transactions,
        transactions30d: stats30d.transactions,
        volume24h: stats24h.volume,
        volume7d: stats7d.volume,
        volume30d: stats30d.volume,
    };
}
