import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { PACKAGE_ID, MODULE_NAME } from "../constants";
import type { Review } from "../types";
import { fetchFromWalrus } from "../walrus";

export const useReviews = (dappId: string, reviewsTableId: string) => {
    const client = useSuiClient();

    return useQuery({
        queryKey: ["reviews", dappId],
        queryFn: async (): Promise<Review[]> => {
            if (!dappId || !reviewsTableId) return [];

            console.log(`Fetching reviews for dApp ${dappId} from table ${reviewsTableId}`);

            // 1. Fetch ReviewAdded events to get the list of reviewers
            const events = await client.queryEvents({
                query: {
                    MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::ReviewAdded`
                },
                limit: 50,
                order: "descending"
            });

            console.log("ReviewAdded events:", events);

            // Filter events for this dApp
            const relevantEvents = events.data.filter((e: any) => e.parsedJson.dapp_id === dappId);

            // Get unique users to avoid duplicate fetches
            const users = Array.from(new Set(relevantEvents.map((e: any) => e.parsedJson.user)));

            if (users.length === 0) return [];

            console.log("Found reviewers:", users);

            // 2. Fetch Review objects from the Table
            const reviewPromises = users.map(async (userAddress) => {
                try {
                    const reviewObj = await client.getDynamicFieldObject({
                        parentId: reviewsTableId,
                        name: {
                            type: "address",
                            value: userAddress as string
                        }
                    });

                    if (!reviewObj.data || !reviewObj.data.content) return null;

                    // The dynamic field has a wrapper structure
                    const fields = (reviewObj.data.content as any).fields.value.fields;

                    // Convert timestamp - handle both number and string formats
                    let timestamp: number;
                    if (typeof fields.date === 'string') {
                        timestamp = parseInt(fields.date);
                    } else {
                        timestamp = Number(fields.date);
                    }

                    // Fetch content from Walrus if blob ID exists
                    let content = "";
                    if (fields.content_blob_id) {
                        try {
                            const fetchedContent = await fetchFromWalrus(fields.content_blob_id);
                            content = fetchedContent || "";
                        } catch (err) {
                            console.error(`Failed to fetch review content for blob ${fields.content_blob_id}:`, err);
                        }
                    }

                    // Map to Review interface
                    return {
                        id: reviewObj.data.objectId,
                        userId: fields.user,
                        userName: fields.user_name,
                        userAvatar: "👤",
                        rating: Number(fields.rating),
                        title: fields.title,
                        content: content,
                        contentBlobId: fields.content_blob_id,
                        date: new Date(timestamp).toISOString(),
                        helpful: Number(fields.helpful_count),
                        verified: fields.verified
                    } as Review;

                } catch (e) {
                    console.error(`Failed to fetch review for user ${userAddress}`, e);
                    return null;
                }
            });

            const reviews = (await Promise.all(reviewPromises)).filter((r): r is Review => r !== null);

            return reviews;
        },
        enabled: !!dappId && !!reviewsTableId,
        refetchInterval: 10000
    });
};
