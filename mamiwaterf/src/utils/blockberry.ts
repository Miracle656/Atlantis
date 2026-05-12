import { BLOCKBERRY_API_KEY } from "../constants";

export const BLOCKBERRY_BASE_URL = 'https://api.blockberry.one/sui/v1';

export interface BlockberryDApp {
    projectName: string;
    imgUrl: string;
    currTvl: number;
    tvlChange24H: number;
    tvlChange7d: number;
    tvlChange30d: number;
    volume24H: number | null;
    volume7d: number | null;
    volume30d: number | null;
    volumeChange24H: number | null;
    volumeChange7d: number | null;
    volumeChange30d: number | null;
    txsCount: number;
    categories: string[];
    packages: {
        packageAddress: string;
        packageImg: string;
        packageName: string;
    }[];
    isIndexed: boolean;
}

export interface BlockberryDEX {
    projectName: string;
    imgUrl: string;
    socialWebsite: string | null;
    socialDiscord: string | null;
    socialTwitter: string | null;
    socialTelegram: string | null;
    currTvl: number;
    volume: number;
    volumeChange: number;
    txsCount: number;
    poolsCount: number;
    packages: {
        packageAddress: string;
        packageImg: string;
        packageName: string;
    }[];
    isIndexed: boolean;
}

export interface BlockberryResponse {
    content: BlockberryDApp[] | BlockberryDEX[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export async function fetchDAppsFromBlockberry(): Promise<BlockberryDApp[]> {
    try {
        const allDApps: BlockberryDApp[] = [];
        let currentPage = 0;
        let totalPages = 1;

        // Fetch all pages
        while (currentPage < totalPages) {
            console.log(`Fetching DeFi page ${currentPage + 1}/${totalPages}...`);

            const response = await fetch(`${BLOCKBERRY_BASE_URL}/defi?page=${currentPage}&size=50&orderBy=DESC&sortBy=CURRENT_TVL`, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'content-type': 'application/json',
                    'x-api-key': BLOCKBERRY_API_KEY
                },
                body: JSON.stringify({
                    categories: [
                        "BRIDGE",
                        "DEX",
                        "LENDING",
                        "YIELD",
                        "CDP",
                        "LAUNCHPAD",
                        "LIQUID_STAKING",
                        "RWA",
                        "ALGO_STABLES",
                        "SYNTHETICS",
                        "PAYMENTS",
                        "DERIVATIVES"
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Blockberry API error on page ${currentPage}:`, errorText);
                break; // Stop fetching if we hit an error
            }

            const data: BlockberryResponse = await response.json();
            allDApps.push(...(data.content as BlockberryDApp[]));

            totalPages = data.totalPages;
            currentPage++;

            // Add delay between requests to avoid rate limiting (500ms)
            if (currentPage < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`Fetched ${allDApps.length} DeFi dApps from ${currentPage} pages`);
        return allDApps;
    } catch (error) {
        console.error("Failed to fetch from Blockberry:", error);
        return [];
    }
}

export async function fetchDEXsFromBlockberry(): Promise<BlockberryDEX[]> {
    try {
        const allDEXs: BlockberryDEX[] = [];
        let currentPage = 0;
        let totalPages = 1;

        // Fetch all pages
        while (currentPage < totalPages) {
            console.log(`Fetching DEX page ${currentPage + 1}/${totalPages}...`);

            const response = await fetch(`${BLOCKBERRY_BASE_URL}/dex?page=${currentPage}&size=50&orderBy=DESC&period=DAY&sortBy=CURRENT_TVL`, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'content-type': 'application/json',
                    'x-api-key': BLOCKBERRY_API_KEY
                },
                body: JSON.stringify({
                    withTvlOnly: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Blockberry API error (DEX) on page ${currentPage}:`, errorText);
                break; // Stop fetching if we hit an error
            }

            const data: BlockberryResponse = await response.json();
            allDEXs.push(...(data.content as BlockberryDEX[]));

            totalPages = data.totalPages;
            currentPage++;

            // Add delay between requests to avoid rate limiting (500ms)
            if (currentPage < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`Fetched ${allDEXs.length} DEXs from ${currentPage} pages`);
        return allDEXs;
    } catch (error) {
        console.error("Failed to fetch DEXs from Blockberry:", error);
        return [];
    }
}
