import { useQuery } from "@tanstack/react-query";
import { WALRUS_AGGREGATORS } from "../constants";

export const useFetchFromWalrus = (blobId: string | undefined) => {
    return useQuery({
        queryKey: ["walrus-blob", blobId],
        queryFn: async (): Promise<string> => {
            if (!blobId) return "";

            // Try each aggregator until one works
            for (const aggregator of WALRUS_AGGREGATORS) {
                try {
                    // Walrus HTTP API: GET /v1/blobs/{id}
                    const url = `${aggregator}/v1/blobs/${blobId}`;
                    console.log(`🔍 Trying to fetch blob from: ${url}`);

                    const response = await fetch(url);

                    if (response.ok) {
                        const text = await response.text();
                        console.log(`✅ Successfully fetched blob from ${aggregator}`);
                        return text;
                    }

                    console.log(`❌ Failed to fetch from ${aggregator}: ${response.status}`);
                } catch (error) {
                    console.log(`❌ Error fetching from ${aggregator}:`, error);
                }
            }

            // If all aggregators fail, return a fallback message
            console.error(`❌ Failed to fetch blob ${blobId} from all aggregators`);
            return "Description not available (Walrus blob not found)";
        },
        enabled: !!blobId,
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes
        retry: false, // Don't retry, we're already trying multiple aggregators
    });
};
