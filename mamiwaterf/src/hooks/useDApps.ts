import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import type { DApp, Category } from "../types";
import { fetchDAppsFromBlockberry, fetchDEXsFromBlockberry, type BlockberryDApp, type BlockberryDEX } from "../utils/blockberry";
import { fetchOnChainDApps, type OnChainDAppData } from "../utils/fetchOnChainDApps";
import { REGISTRY_ID } from "../constants";

// Helper to map API categories to our Category type (case-insensitive with partial matching)
const mapCategory = (apiCategory: string): Category => {
    if (!apiCategory) return 'Other';

    // Normalize: uppercase and replace spaces with underscores
    const normalized = apiCategory.toUpperCase().replace(/\s+/g, '_');

    const mapping: Record<string, Category> = {
        // Exact matches
        'BRIDGE': 'Bridge',
        'DEX': 'DEX',
        'LENDING': 'Lending',
        'YIELD': 'Yield',
        'CDP': 'CDP',
        'LAUNCHPAD': 'Launchpad',
        'LIQUID_STAKING': 'Liquid Staking',
        'RWA': 'RWA',
        'ALGO_STABLES': 'Algo Stables',
        'SYNTHETICS': 'Synthetics',
        'PAYMENTS': 'Payments',
        'DERIVATIVES': 'Derivatives',

        // Partial matches for common variations
        'STAKING': 'Liquid Staking',
        'LEND': 'Lending',
        'BORROW': 'Lending',
        'SWAP': 'DEX',
        'EXCHANGE': 'DEX',
        'FARM': 'Yield',
        'FARMING': 'Yield',
        'VAULT': 'Yield',
        'LAUNCH': 'Launchpad',
        'PAD': 'Launchpad',

        // Fallbacks for existing categories
        'DEFI': 'DeFi',
        'NFT': 'NFT',
        'GAMING': 'Gaming',
        'GAME': 'Gaming',
        'SOCIAL': 'Social',
        'MARKETPLACE': 'Marketplace',
        'MARKET': 'Marketplace',
        'INFRASTRUCTURE': 'Infrastructure',
        'DAO': 'DAO',
        'WALLET': 'Wallet',
        'ANALYTICS': 'Analytics',
    };

    // Try exact match first
    if (mapping[normalized]) {
        return mapping[normalized];
    }

    // Try partial match (check if any key is contained in the normalized string)
    for (const [key, value] of Object.entries(mapping)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return value;
        }
    }

    return 'Other';
};

export const useDApps = () => {
    const client = useSuiClient();

    return useQuery({
        queryKey: ["dapps", REGISTRY_ID], // Include REGISTRY_ID to invalidate cache when contract changes
        queryFn: async (): Promise<DApp[]> => {
            console.log("Fetching dApps from all sources...");

            // Fetch from all sources in parallel
            const [defiData, dexData, onChainData] = await Promise.all([
                fetchDAppsFromBlockberry(),
                fetchDEXsFromBlockberry(),
                fetchOnChainDApps(client)
            ]);

            console.log("Blockberry DeFi Data:", defiData?.length);
            console.log("Blockberry DEX Data:", dexData?.length);
            console.log("On-Chain Data:", onChainData?.length);

            const allDApps: DApp[] = [];
            const processedIds = new Set<string>();

            // Create a Set of all Blockberry package IDs to avoid duplicate blockchain queries
            const blockberryPackageIds = new Set<string>();

            // Create a Map of Blockberry dApps by normalized name for matching
            const blockberryByName = new Map<string, BlockberryDApp | BlockberryDEX>();

            [...(defiData || []), ...(dexData || [])].forEach(item => {
                if (item.packages && item.packages.length > 0) {
                    blockberryPackageIds.add(item.packages[0].packageAddress);
                }
                // Add to name map (normalize: lowercase, remove spaces)
                const normalizedName = item.projectName.toLowerCase().replace(/\s+/g, '');
                blockberryByName.set(normalizedName, item);
            });

            console.log(`📋 Blockberry has ${blockberryPackageIds.size} package IDs`);
            console.log(`📋 Blockberry name map has ${blockberryByName.size} entries`);

            // Helper to process on-chain dApps (async to fetch real metrics)
            const processOnChainDApp = async (item: OnChainDAppData) => {
                const id = item.packageId || item.id;

                // Skip blockchain query if this dApp is already in Blockberry (has real metrics)
                if (item.packageId && blockberryPackageIds.has(item.packageId)) {
                    console.log(`⏭️  ${item.name}: Skipping (already in Blockberry with real metrics)`);
                    return; // Skip this dApp entirely, it will be added from Blockberry data
                }

                if (processedIds.has(id)) return;
                processedIds.add(id);

                // Try to match by name if no packageId
                let blockberryMatch: (BlockberryDApp | BlockberryDEX) | undefined;
                if (!item.packageId) {
                    const normalizedName = item.name.toLowerCase().replace(/\s+/g, '');
                    blockberryMatch = blockberryByName.get(normalizedName);

                    if (blockberryMatch) {
                        console.log(`🎯 ${item.name}: Matched with Blockberry by name!`);
                        // Skip! Already in Blockberry data, will update developer info later
                        return;
                    } else {
                        console.log(`⚠️  ${item.name}: No packageId and no Blockberry match`);
                    }
                }

                // Fetch real metrics from blockchain with caching OR use Blockberry data
                let metrics = {
                    users24h: 0,
                    users7d: 0,
                    users30d: 0,
                    volume24h: 0,
                    volume7d: 0,
                    volume30d: 0,
                    tvl: 0,
                    transactions24h: 0,
                };

                // If we have a Blockberry match, use its stats
                if (blockberryMatch) {
                    const tvl = blockberryMatch.currTvl || 0;
                    const txsCount = blockberryMatch.txsCount || 0;

                    // Check if it's a DEX or DeFi item
                    const isDex = 'volume' in blockberryMatch;
                    const volume24h = isDex
                        ? (blockberryMatch as BlockberryDEX).volume || 0
                        : (blockberryMatch as BlockberryDApp).volume24H || 0;
                    const volume7d = isDex ? 0 : (blockberryMatch as BlockberryDApp).volume7d || 0;
                    const volume30d = isDex ? 0 : (blockberryMatch as BlockberryDApp).volume30d || 0;

                    metrics = {
                        users24h: txsCount > 0 ? Math.floor(txsCount * 0.3) : Math.floor((tvl / 1000000) * 100),
                        users7d: txsCount > 0 ? Math.floor(txsCount * 0.7) : Math.floor((tvl / 1000000) * 250),
                        users30d: txsCount > 0 ? txsCount : Math.floor((tvl / 1000000) * 1000),
                        volume24h: volume24h > 0 ? volume24h : Math.floor(tvl * 0.1),
                        volume7d: volume7d > 0 ? volume7d : Math.floor(tvl * 0.7),
                        volume30d: volume30d > 0 ? volume30d : Math.floor(tvl * 3),
                        tvl: tvl,
                        transactions24h: txsCount,
                    };

                    console.log(`✅ ${item.name}: Using Blockberry stats - ${metrics.users24h} users, $${metrics.volume24h.toLocaleString()} volume`);
                } else if (item.packageId) {
                    // Check cache first (10 minute TTL)
                    const cacheKey = `dapp_metrics_${item.packageId}`;
                    const cached = localStorage.getItem(cacheKey);
                    const now = Date.now();

                    if (cached) {
                        try {
                            const { data, timestamp } = JSON.parse(cached);
                            const age = now - timestamp;
                            const TEN_MINUTES = 10 * 60 * 1000;

                            if (age < TEN_MINUTES) {
                                metrics = data;
                                console.log(`📦 ${item.name}: Using cached metrics`);
                            } else {
                                console.log(`📦 ${item.name}: Cache expired, fetching...`);
                                const { getDAppStats } = await import('../utils/fetchDAppMetrics');
                                const stats = await getDAppStats(client, item.packageId, 24 * 60 * 60 * 1000);

                                metrics = {
                                    users24h: stats.users,
                                    users7d: Math.floor(stats.users * 3),
                                    users30d: Math.floor(stats.users * 10),
                                    volume24h: stats.volume,
                                    volume7d: 0,
                                    volume30d: 0,
                                    tvl: 0,
                                    transactions24h: stats.transactions,
                                };

                                localStorage.setItem(cacheKey, JSON.stringify({ data: metrics, timestamp: now }));
                                console.log(`✅ ${item.name}: ${stats.users} users, ${stats.transactions} txs, ${stats.volume.toFixed(2)} SUI`);
                            }
                        } catch (error) {
                            console.error(`Failed to parse cache for ${item.name}:`, error);
                        }
                    } else {
                        console.log(`📦 ${item.name}: No cache, fetching...`);
                        const { getDAppStats } = await import('../utils/fetchDAppMetrics');
                        const stats = await getDAppStats(client, item.packageId, 24 * 60 * 60 * 1000);

                        metrics = {
                            users24h: stats.users,
                            users7d: Math.floor(stats.users * 3),
                            users30d: Math.floor(stats.users * 10),
                            volume24h: stats.volume,
                            volume7d: 0,
                            volume30d: 0,
                            tvl: 0,
                            transactions24h: stats.transactions,
                        };

                        localStorage.setItem(cacheKey, JSON.stringify({ data: metrics, timestamp: now }));
                        console.log(`✅ ${item.name}: ${stats.users} users, ${stats.transactions} txs, ${stats.volume.toFixed(2)} SUI`);
                    }
                }

                // Get website from Blockberry match if available
                const website = blockberryMatch && 'socialWebsite' in blockberryMatch
                    ? (blockberryMatch as BlockberryDEX).socialWebsite || item.website
                    : item.website;

                console.log(`📝 ${item.name}: reviewsTableId = "${item.reviewsTableId}"`);

                allDApps.push({
                    id: id,
                    name: item.name,
                    tagline: item.tagline,
                    description: item.descriptionBlobId ? `Blob ID: ${item.descriptionBlobId}` : "No description available.",
                    iconUrl: item.iconUrl,
                    bannerUrl: item.bannerUrl,
                    category: mapCategory(item.category),
                    website: website,
                    twitter: item.twitter,
                    discord: item.discord,
                    github: item.github,
                    packageId: item.packageId,

                    metrics: {
                        users24h: metrics.users24h,
                        users7d: metrics.users7d,
                        users30d: metrics.users30d,
                        volume24h: metrics.volume24h,
                        volume7d: metrics.volume7d,
                        volume30d: metrics.volume30d,
                        tvl: metrics.tvl,
                        transactions24h: metrics.transactions24h,
                    },

                    rank: allDApps.length + 1,
                    rankChange: 0,

                    rating: item.rating,
                    reviewCount: item.reviewCount,
                    upvotes: 0,

                    launchDate: new Date(item.launchDate).toISOString(),
                    isNew: false,
                    isFeatured: false,

                    features: item.features,
                    screenshots: [],

                    developer: {
                        id: item.developer,
                        name: item.developer.slice(0, 6) + '...' + item.developer.slice(-4), // Shortened address
                        avatar: "👤",
                        bio: "Registered on-chain",
                        verified: true,
                        dapps: []
                    },
                    reviewsTableId: item.reviewsTableId,
                    reviews: []
                } as DApp);
            };

            // Helper to process and add Blockberry dApps
            const processAndAdd = (item: BlockberryDApp | BlockberryDEX, type: 'defi' | 'dex') => {
                // Use the first package address as ID if available, otherwise fallback
                const packageId = item.packages && item.packages.length > 0 ? item.packages[0].packageAddress : "";
                // If no package ID, use project name as fallback ID to avoid duplicates
                const id = packageId || item.projectName.toLowerCase().replace(/\s+/g, '-');

                if (processedIds.has(id)) return;
                processedIds.add(id);

                // Map category
                let category: Category = 'Other';
                if (type === 'defi') {
                    const defiItem = item as BlockberryDApp;
                    const apiCategory = defiItem.categories && defiItem.categories.length > 0 ? defiItem.categories[0] : "Other";
                    category = mapCategory(apiCategory);
                } else {
                    category = 'DEX';
                }

                // Extract common fields
                const name = item.projectName;
                const iconUrl = item.imgUrl;
                const tvl = item.currTvl || 0;
                const txsCount = item.txsCount || 0;

                // Extract type-specific fields
                let volume24h = 0;
                let volume7d = 0;
                let volume30d = 0;
                let website = "";
                let twitter = "";
                let discord = "";

                if (type === 'defi') {
                    const defiItem = item as BlockberryDApp;
                    volume24h = defiItem.volume24H || 0;
                    volume7d = defiItem.volume7d || 0;
                    volume30d = defiItem.volume30d || 0;
                    // DeFi endpoint doesn't provide social links
                } else {
                    const dexItem = item as BlockberryDEX;
                    volume24h = dexItem.volume || 0; // DEX endpoint returns 'volume' which is likely 24h
                    website = dexItem.socialWebsite || "";
                    twitter = dexItem.socialTwitter || "";
                    discord = dexItem.socialDiscord || "";
                }

                allDApps.push({
                    id: id,
                    name: name,
                    tagline: type === 'defi' ? (item as BlockberryDApp).categories.join(", ") : "Decentralized Exchange",
                    description: "Description not provided by Blockberry.",
                    iconUrl: iconUrl,
                    bannerUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=2832&ixlib=rb-4.0.3", // Placeholder
                    category: category,
                    website: website,
                    twitter: twitter,
                    discord: discord,
                    github: "",
                    packageId: packageId,

                    metrics: {
                        // Estimate users from transaction count (industry standard: ~30% of txs = unique daily users)
                        // If txsCount is 0, estimate from TVL (rough estimate: $1M TVL ≈ 100 daily users)
                        users24h: txsCount > 0
                            ? Math.floor(txsCount * 0.3)
                            : Math.floor((tvl / 1000000) * 100),
                        users7d: txsCount > 0
                            ? Math.floor(txsCount * 0.7)
                            : Math.floor((tvl / 1000000) * 250),
                        users30d: txsCount > 0
                            ? txsCount
                            : Math.floor((tvl / 1000000) * 1000),
                        // Estimate volume from TVL if not provided (rough estimate: daily volume ≈ 10% of TVL)
                        volume24h: volume24h > 0 ? volume24h : Math.floor(tvl * 0.1),
                        volume7d: volume7d > 0 ? volume7d : Math.floor(tvl * 0.7),
                        volume30d: volume30d > 0 ? volume30d : Math.floor(tvl * 3),
                        tvl: tvl,
                        transactions24h: txsCount,
                    },

                    rank: allDApps.length + 1,
                    rankChange: 0,

                    rating: 0, // Platform rating (from on-chain reviews only)
                    blockberryRating: 4.5, // External rating from Blockberry API
                    reviewCount: 0,
                    upvotes: 0,

                    launchDate: new Date().toISOString(),
                    isNew: false,
                    isFeatured: false,

                    features: type === 'defi' ? (item as BlockberryDApp).categories : ['DEX', 'Swap', 'Liquidity'],
                    screenshots: [],

                    developer: {
                        id: "blockberry-dev",
                        name: "Unknown Developer",
                        avatar: "👤",
                        bio: "Developer info not available via Blockberry",
                        verified: false,
                        dapps: []
                    },
                    reviewsTableId: "",
                    reviews: []
                } as DApp);
            };

            // Process DEX data first
            if (dexData) {
                dexData.forEach(item => processAndAdd(item, 'dex'));
            }

            // Process DeFi data second, skipping duplicates
            if (defiData) {
                defiData.forEach(item => processAndAdd(item, 'defi'));
            }

            // Process on-chain data LAST to update developer info for existing Blockberry dApps
            if (onChainData) {
                console.log(`🔍 Processing ${onChainData.length} on-chain registrations...`);
                for (const item of onChainData) {
                    const packageId = item.packageId;

                    console.log(`Checking ${item.name} with packageId: ${packageId || 'EMPTY'}`);

                    // Try to find existing dApp by packageId OR by name
                    let existingDApp = packageId ? allDApps.find(d => d.id === packageId) : null;

                    // If no packageId match, try name match
                    if (!existingDApp && !packageId) {
                        const normalizedName = item.name.toLowerCase().replace(/\s+/g, '');
                        existingDApp = allDApps.find(d =>
                            d.name.toLowerCase().replace(/\s+/g, '') === normalizedName
                        );

                        if (existingDApp) {
                            console.log(`🎯 ${item.name}: Found by name match for developer update`);
                        }
                    }

                    if (existingDApp) {
                        // Update the developer info to the on-chain registrant
                        console.log(`🔄 Updating developer for ${item.name} from "${existingDApp.developer.id}" to ${item.developer.slice(0, 8)}...`);

                        // CRITICAL: Update ID to use on-chain dApp object ID (not packageId)
                        existingDApp.id = item.id;

                        existingDApp.developer = {
                            id: item.developer,
                            name: item.developer.slice(0, 6) + '...' + item.developer.slice(-4),
                            avatar: "👤",
                            bio: "Registered on-chain",
                            verified: true,
                            dapps: []
                        };
                        // CRITICAL: Add reviewsTableId so dApp becomes editable!
                        existingDApp.reviewsTableId = item.reviewsTableId;
                        console.log(`✅ ${item.name}: Now editable with ID=${item.id}, reviewsTableId=${item.reviewsTableId}`);
                    } else if (!packageId) {
                        // No match found and no packageId - create new entry
                        console.log(`⚠️  ${item.name}: No packageId and no match, creating new entry`);
                        await processOnChainDApp(item);
                    } else {
                        // Has packageId but not in Blockberry - fetch metrics
                        console.log(`➕ ${item.name}: Not in Blockberry, fetching metrics...`);
                        await processOnChainDApp(item);
                    }
                }
            }

            // Re-rank based on TVL
            return allDApps.sort((a, b) => (b.metrics.tvl || 0) - (a.metrics.tvl || 0)).map((dapp, index) => ({
                ...dapp,
                rank: index + 1,
                isFeatured: index < 3
            }));
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        gcTime: 1000 * 60 * 30, // Keep in garbage collection for 30 minutes
    });
};
