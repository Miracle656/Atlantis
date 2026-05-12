import { BLOCKBERRY_API_KEY } from "../constants";
import { GraphQLClient, gql } from 'graphql-request';

const BLOCKBERRY_BASE_URL = 'https://api.blockberry.one/sui/v1';
const GRAPHQL_MAINNET = 'https://graphql.mainnet.sui.io/graphql';
const GRAPHQL_TESTNET = 'https://graphql.testnet.sui.io/graphql';

type Network = 'mainnet' | 'testnet';

interface CoinFlowData {
    coinType: string;
    inflow: number;
    outflow: number;
    monthlyInflows: Record<string, number>; // month -> amount
}

// Fetch comprehensive transaction data using Sui GraphQL with pagination
async function fetchTransactionsFromGraphQL(address: string, network: Network = 'mainnet'): Promise<{
    transactions: any[];
    totalCount: number;
}> {
    const endpoint = network === 'mainnet' ? GRAPHQL_MAINNET : GRAPHQL_TESTNET;
    const client = new GraphQLClient(endpoint);

    const allTransactions: any[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let pageCount = 0;
    const MAX_PAGES = 50; // Fetch up to 50 pages (2500 transactions max)

    while (hasNextPage && pageCount < MAX_PAGES) {
        // GraphQL query with pagination support
        const query = gql`
            query GetTransactions($address: SuiAddress!, $after: String) {
                address(address: $address) {
                    transactions(first: 50, after: $after) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        nodes {
                            digest
                            sender {
                                address
                            }
                            effects {
                                timestamp
                                gasEffects {
                                    gasSummary {
                                        computationCost
                                        storageCost
                                        storageRebate
                                        nonRefundableStorageFee
                                    }
                                }
                                balanceChanges {
                                    nodes {
                                        coinType {
                                            repr
                                        }
                                        amount
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        try {
            const data: any = await client.request(query, { address, after: cursor });
            const pageInfo = data.address?.transactions?.pageInfo;
            const transactions = data.address?.transactions?.nodes || [];

            allTransactions.push(...transactions);
            hasNextPage = pageInfo?.hasNextPage || false;
            cursor = pageInfo?.endCursor || null;
            pageCount++;

            console.log(`GraphQL page ${pageCount}: fetched ${transactions.length} transactions (total: ${allTransactions.length})`);
        } catch (error) {
            console.error(`Failed to fetch transaction page ${pageCount}:`, error);
            break;
        }
    }

    console.log(`GraphQL pagination complete: ${allTransactions.length} total transactions fetched`);

    return {
        transactions: allTransactions,
        totalCount: allTransactions.length
    };
}



export interface BlockberryAccountStats {
    accountAddress: string;
    transactionCount: number;
    totalGasSpent: number;
    firstTransactionBlock?: {
        timestampMs: number;
    };
    activity?: {
        firstActive: number;
        lastActive: number;
    };
    monthlyStats?: {
        highestInflowMonth: { month: string; txCount: number };
        lowestInflowMonth: { month: string };
        mostActiveMonth: { month: string; txCount: number };
    };
    contractStats?: {
        uniqueContracts: number;
        mostInteracted: { address: string; count: number };
    };
    coinFlows?: CoinFlowData[]; // Coin inflow/outflow data from GraphQL
}

export interface BlockberryCoin {
    balance: number;
    decimals: number;
    coinType: string;
    symbol: string;
    coinSymbol?: string; // API uses this field
    name: string;
    derivedPriceInUSD?: number;
    priceInUSD?: number; // Alternative price field
    totalValueInUSD?: number;
    iconUrl?: string;
}

export async function fetchAccountStats(address: string, network: Network = 'mainnet'): Promise<BlockberryAccountStats | null> {
    try {
        console.log(`Fetching comprehensive transaction data from GraphQL for ${address}`);

        // Fetch all transaction data from GraphQL
        const { transactions, totalCount } = await fetchTransactionsFromGraphQL(address, network);

        if (transactions.length === 0) {
            console.warn('No transactions found for address');
            return null;
        }

        // Process all transactions to extract needed data
        let totalGasSpent = 0;
        const monthlyData: Record<string, { txCount: number }> = {};
        const coinFlows: Record<string, CoinFlowData> = {};
        let firstActive = 0;
        let lastActive = 0;

        transactions.forEach((tx: any) => {
            const timestamp = tx.effects?.timestamp;

            // Calculate gas (computationCost + storageCost - storageRebate) / 1e9 for SUI
            const gasSummary = tx.effects?.gasEffects?.gasSummary;
            if (gasSummary) {
                const computation = parseInt(gasSummary.computationCost || '0');
                const storage = parseInt(gasSummary.storageCost || '0');
                const rebate = parseInt(gasSummary.storageRebate || '0');
                const gasCost = (computation + storage - rebate) / 1_000_000_000;
                totalGasSpent += gasCost;
            }

            // Track timestamps
            if (timestamp) {
                const ts = new Date(timestamp).getTime();
                if (!firstActive || ts < firstActive) firstActive = ts;
                if (ts > lastActive) lastActive = ts;

                // Monthly activity
                const date = new Date(timestamp);
                const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { txCount: 0 };
                }
                monthlyData[monthKey].txCount += 1;
            }

            // Coin flows (balance changes)
            const balanceChanges = tx.effects?.balanceChanges?.nodes || [];
            balanceChanges.forEach((change: any) => {
                const coinType = change.coinType?.repr || 'Unknown';
                const amount = parseInt(change.amount || '0');

                if (!coinFlows[coinType]) {
                    coinFlows[coinType] = {
                        coinType,
                        inflow: 0,
                        outflow: 0,
                        monthlyInflows: {}
                    };
                }

                if (amount > 0) {
                    coinFlows[coinType].inflow += amount;
                    if (timestamp) {
                        const date = new Date(timestamp);
                        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                        coinFlows[coinType].monthlyInflows[monthKey] =
                            (coinFlows[coinType].monthlyInflows[monthKey] || 0) + amount;
                    }
                } else {
                    coinFlows[coinType].outflow += Math.abs(amount);
                }
            });
        });

        // Analyze monthly activity
        const months = Object.entries(monthlyData);
        const highestActivity = months.length > 0
            ? months.reduce((max, curr) => curr[1].txCount > max[1].txCount ? curr : max)
            : ['N/A', { txCount: 0 }] as [string, { txCount: number }];
        const lowestActivity = months.length > 0
            ? months.reduce((min, curr) => curr[1].txCount < min[1].txCount ? curr : min)
            : ['N/A', { txCount: 0 }] as [string, { txCount: number }];

        // Contract interactions: Fetch from Blockberry activity endpoint
        let contractStats = {
            uniqueContracts: 0,
            mostInteracted: { address: 'N/A', count: 0 }
        };

        try {
            const blockberryUrl = `${BLOCKBERRY_BASE_URL}/accounts/${address}/activity?actionType=ALL&size=50&orderBy=DESC`;
            const blockberryResponse = await fetch(blockberryUrl, {
                headers: {
                    'accept': '*/*',
                    'x-api-key': BLOCKBERRY_API_KEY
                }
            });

            if (blockberryResponse.ok) {
                const blockberryData = await blockberryResponse.json();
                const activities = blockberryData.content || [];

                // Extract contract addresses from activityWith
                // IMPORTANT: Filter out regular wallet addresses, only count actual contracts/packages
                const contractCounts: Record<string, number> = {};
                activities.forEach((activity: any) => {
                    const activityWith = activity.activityWith || [];
                    activityWith.forEach((item: any) => {
                        // Only count if it's a PACKAGE (smart contract) or has a project name (indexed contract)
                        // Exclude plain ACCOUNT types as those are just wallet addresses
                        const isContract = (
                            (item.objectType === 'PACKAGE' || item.projectName) &&
                            item.id &&
                            item.id.startsWith('0x')
                        );

                        if (isContract) {
                            contractCounts[item.id] = (contractCounts[item.id] || 0) + 1;
                        }
                    });
                });

                const contracts = Object.entries(contractCounts);
                if (contracts.length > 0) {
                    const mostInteracted = contracts.reduce((max, curr) =>
                        curr[1] > max[1] ? curr : max
                    );
                    contractStats = {
                        uniqueContracts: contracts.length,
                        mostInteracted: { address: mostInteracted[0], count: mostInteracted[1] }
                    };
                }

                console.log(`  - Contracts from Blockberry: ${contractStats.uniqueContracts} unique`);
            }
        } catch (error) {
            console.warn('Failed to fetch contract data from Blockberry:', error);
        }

        console.log(`Processed ${transactions.length} transactions:`);
        console.log(`  - Total gas: ${totalGasSpent.toFixed(4)} SUI`);
        console.log(`  - Coins tracked: ${Object.keys(coinFlows).length}`);

        return {
            accountAddress: address,
            transactionCount: totalCount,
            totalGasSpent,
            coinFlows: Object.values(coinFlows),
            firstTransactionBlock: firstActive ? { timestampMs: firstActive } : undefined,
            activity: {
                firstActive,
                lastActive
            },
            monthlyStats: {
                highestInflowMonth: { month: highestActivity[0], txCount: highestActivity[1].txCount },
                lowestInflowMonth: { month: lowestActivity[0] },
                mostActiveMonth: { month: highestActivity[0], txCount: highestActivity[1].txCount }
            },
            contractStats: contractStats
        };
    } catch (error) {
        console.error('Failed to fetch account stats:', error);
        return null;
    }
}

export async function fetchWalletCoins(address: string): Promise<BlockberryCoin[]> {
    try {
        const url = `${BLOCKBERRY_BASE_URL}/coins/wallet/${address}?size=5&orderBy=DESC&sortBy=USD_VALUE`;
        console.log("Fetching Wallet Coins from:", url);
        const response = await fetch(url, {
            headers: {
                'accept': '*/*',
                'x-api-key': BLOCKBERRY_API_KEY
            }
        });

        if (!response.ok) {
            console.error(`Blockberry API Error (Coins) ${response.status}: ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        console.log("Wallet Coins Data:", data);
        return data.content || [];
    } catch (error) {
        console.error("Failed to fetch wallet coins from Blockberry:", error);
        return [];
    }
}
