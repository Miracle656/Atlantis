import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { PACKAGE_ID, MODULE_NAME } from "../constants";
import { useDApps } from "./useDApps";
import { fetchFromWalrus } from "../walrus";

export interface TrendingDiscussion {
    id: string;
    dappId: string;
    dappName: string;
    title: string;
    commentCount: number;
    upvotes: number;
    author: string;
    authorName: string;
    timeAgo: string;
    timestamp: number;
    type: 'review' | 'comment';
}

export const useTrendingDiscussions = () => {
    const client = useSuiClient();
    const { data: dapps } = useDApps();

    return useQuery({
        queryKey: ["trending-discussions"],
        queryFn: async (): Promise<TrendingDiscussion[]> => {
            console.log("Fetching trending discussions...");

            try {
                // Fetch both ReviewAdded and CommentAdded events
                const [reviewEvents, commentEvents] = await Promise.all([
                    client.queryEvents({
                        query: {
                            MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::ReviewAdded`
                        },
                        limit: 20, // Reduced to avoid too many Walrus requests
                        order: "descending"
                    }),
                    client.queryEvents({
                        query: {
                            MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::CommentAdded`
                        },
                        limit: 20,
                        order: "descending"
                    })
                ]);

                console.log("Review events:", reviewEvents.data.length);
                console.log("Comment events:", commentEvents.data.length);

                // Create dApp name lookup map
                const dappNameMap = new Map<string, string>();
                if (dapps) {
                    dapps.forEach(dapp => {
                        dappNameMap.set(dapp.id, dapp.name);
                    });
                }

                // Process reviews - fetch content from Walrus in parallel
                const reviewPromises = reviewEvents.data.map(async (event) => {
                    const data = event.parsedJson as any;
                    const timestamp = parseInt(event.timestampMs || '0');
                    const dappName = dappNameMap.get(data.dapp_id) || 'Unknown dApp';

                    // Fetch review content from Walrus
                    let title = `⭐ ${data.rating}/5 Review`;
                    if (data.content_blob_id) {
                        try {
                            const content = await fetchFromWalrus(data.content_blob_id);
                            if (content) {
                                title = content.length > 60 ? content.slice(0, 60) + '...' : content;
                            }
                        } catch (error) {
                            console.warn(`Failed to fetch review content`);
                        }
                    }

                    return {
                        id: event.id.txDigest,
                        dappId: data.dapp_id,
                        dappName: dappName,
                        title: title,
                        commentCount: 0,
                        upvotes: parseInt(data.helpful_count || '0'),
                        author: data.user,
                        authorName: data.user_name || data.user.slice(0, 8),
                        timeAgo: getTimeAgo(timestamp),
                        timestamp: timestamp,
                        type: 'review' as const
                    };
                });

                // Process comments - fetch content from Walrus in parallel
                const commentPromises = commentEvents.data.map(async (event) => {
                    const data = event.parsedJson as any;
                    const timestamp = parseInt(event.timestampMs || '0');
                    const dappName = dappNameMap.get(data.dapp_id) || 'Unknown dApp';

                    // Fetch comment content from Walrus
                    let title = '💬 New Comment';
                    if (data.content_blob_id) {
                        try {
                            const content = await fetchFromWalrus(data.content_blob_id);
                            if (content) {
                                title = content.length > 60 ? content.slice(0, 60) + '...' : content;
                            }
                        } catch (error) {
                            console.warn(`Failed to fetch comment content`);
                        }
                    }

                    return {
                        id: event.id.txDigest,
                        dappId: data.dapp_id,
                        dappName: dappName,
                        title: title,
                        commentCount: 0,
                        upvotes: parseInt(data.upvotes || '0'),
                        author: data.user,
                        authorName: data.user_name || data.user.slice(0, 8),
                        timeAgo: getTimeAgo(timestamp),
                        timestamp: timestamp,
                        type: 'comment' as const
                    };
                });

                // Wait for all content to be fetched in parallel
                const [reviews, comments] = await Promise.all([
                    Promise.all(reviewPromises),
                    Promise.all(commentPromises)
                ]);

                const discussions: TrendingDiscussion[] = [...reviews, ...comments];

                // Calculate comment counts for reviews
                const reviewCommentCounts = new Map<string, number>();
                for (const event of commentEvents.data) {
                    const data = event.parsedJson as any;
                    const reviewId = data.review_id;
                    if (reviewId) {
                        reviewCommentCounts.set(reviewId, (reviewCommentCounts.get(reviewId) || 0) + 1);
                    }
                }

                // Update comment counts
                discussions.forEach(d => {
                    if (d.type === 'review') {
                        d.commentCount = reviewCommentCounts.get(d.id) || 0;
                    }
                });

                // Sort by engagement score (upvotes + comments * 2) and recency
                const now = Date.now();
                discussions.sort((a, b) => {
                    const scoreA = a.upvotes + (a.commentCount * 2) + (1 / ((now - a.timestamp) / 3600000 + 1));
                    const scoreB = b.upvotes + (b.commentCount * 2) + (1 / ((now - b.timestamp) / 3600000 + 1));
                    return scoreB - scoreA;
                });

                console.log("Trending discussions:", discussions.slice(0, 5));

                return discussions.slice(0, 10);

            } catch (error) {
                console.error("Failed to fetch trending discussions:", error);
                return [];
            }
        },
        enabled: !!dapps,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes (longer since Walrus fetching is slow)
        refetchInterval: 1000 * 60 * 5,
    });
};

// Helper function to calculate time ago
function getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}
