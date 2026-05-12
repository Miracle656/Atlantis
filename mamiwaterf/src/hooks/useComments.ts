import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { PACKAGE_ID, MODULE_NAME } from "../constants";
import type { Comment } from "../types";
import { fetchFromWalrus } from "../walrus";

export const useComments = (dappId: string) => {
    const client = useSuiClient();

    return useQuery({
        queryKey: ["comments", dappId],
        queryFn: async (): Promise<Comment[]> => {
            if (!dappId) return [];

            console.log(`Fetching comments for dApp ${dappId}`);

            // Fetch CommentAdded events
            const events = await client.queryEvents({
                query: {
                    MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::CommentAdded`
                },
                limit: 50,
                order: "descending"
            });

            console.log("CommentAdded events:", events);

            // Filter events for this dApp and map to Comment interface
            const commentPromises = events.data
                .filter((e: any) => e.parsedJson.dapp_id === dappId)
                .map(async (e: any) => {
                    const data = e.parsedJson;

                    // Fetch content from Walrus
                    let content = "";
                    try {
                        if (data.content_blob_id) {
                            const fetchedContent = await fetchFromWalrus(data.content_blob_id);
                            content = fetchedContent || "[Content unavailable]";
                        }
                    } catch (err) {
                        console.error(`Failed to fetch comment content for ${data.comment_id}:`, err);
                        content = "[Failed to load content]";
                    }

                    // Handle parent_id safely
                    // In Move Option<ID> is often represented as { type: ..., fields: { vec: [] } } or null or array
                    // But parsedJson usually simplifies it. Let's assume it's either null or the ID.
                    // If it's an object with 'fields', we might need to extract it.
                    let parentId = data.parent_id;
                    if (parentId && typeof parentId === 'object' && 'fields' in parentId) {
                        // Handle Move Option struct representation if needed
                        // But usually parsedJson flattens it or uses array
                    }
                    // If it's an array (Option representation)
                    if (Array.isArray(parentId)) {
                        parentId = parentId.length > 0 ? parentId[0] : null;
                    }

                    return {
                        id: data.comment_id,
                        userId: data.user,
                        userName: data.user_name,
                        userAvatar: "👤",
                        content,
                        contentBlobId: data.content_blob_id,
                        date: new Date(Number(data.timestamp)).toISOString(),
                        upvotes: 0,
                        isMaker: data.is_maker,
                        parentId: parentId,
                        replies: []
                    } as Comment;
                });

            const allComments = await Promise.all(commentPromises);

            // Reconstruct Tree
            const commentMap = new Map<string, Comment>();
            allComments.forEach(c => commentMap.set(c.id, c));

            const roots: Comment[] = [];

            // We need to process oldest to newest to ensure parents exist before children? 
            // Actually map is already populated. Order doesn't matter for map population.

            allComments.forEach(comment => {
                if (comment.parentId && commentMap.has(comment.parentId)) {
                    const parent = commentMap.get(comment.parentId)!;
                    parent.replies = parent.replies || [];
                    parent.replies.push(comment);
                    // Sort replies oldest first
                    parent.replies.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                } else {
                    roots.push(comment);
                }
            });

            // Sort roots newest first
            roots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return roots;
        },
        enabled: !!dappId,
        refetchInterval: 10000
    });
};
