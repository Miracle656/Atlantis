import { useQuery } from '@tanstack/react-query';
import { SuiClient } from '@mysten/sui/client';
import { CONTRACT_CONFIG, NETWORK_CONFIG } from '../constants';
import { fetchFromWalrus } from '../walrus';
import type { NewsArticle, ArticleEngagement, WalrusArticleContent } from '../types';

const suiClient = new SuiClient({ url: NETWORK_CONFIG.RPC_URL });

/**
 * Fetch latest news articles from the registry
 */
export function useLatestNews(limit: number = 20) {
    return useQuery({
        queryKey: ['latestNews', limit],
        queryFn: async (): Promise<NewsArticle[]> => {
            // Get the registry object
            const registry = await suiClient.getObject({
                id: CONTRACT_CONFIG.REGISTRY_ID,
                options: { showContent: true },
            });

            if (!registry.data?.content || registry.data.content.dataType !== 'moveObject') {
                throw new Error('Invalid registry object');
            }

            const fields = registry.data.content.fields as any;
            const latestBlobs = fields.latest_blobs as string[];

            // Take only the requested number of articles
            const blobsToFetch = latestBlobs.slice(0, Math.min(limit, latestBlobs.length));

            // Fetch metadata and engagement for each article
            const articles = await Promise.all(
                blobsToFetch.map(async (blobId) => {
                    try {
                        // Fetch full content from Walrus
                        // Note: fetchFromWalrus in mamiwater return string | null, so we parse it
                        const walrusContentRaw = await fetchFromWalrus(blobId);

                        if (!walrusContentRaw) return null;

                        const walrusContent: WalrusArticleContent = JSON.parse(walrusContentRaw);

                        // Get engagement data
                        const engagement = await getArticleEngagement(blobId);

                        return {
                            id: blobId,
                            blob_id: blobId,
                            title: walrusContent.title,
                            category: 'General',
                            source: walrusContent.source as 'twitter' | 'rss' | 'onchain',
                            timestamp: walrusContent.timestamp,
                            content: walrusContent.content,
                            summary: walrusContent.summary,
                            url: walrusContent.url,
                            image: walrusContent.image,
                            author: walrusContent.author,
                            ...engagement,
                        };
                    } catch (error) {
                        console.error(`Error fetching article ${blobId}:`, error);
                        return null;
                    }
                })
            );

            return articles.filter(article => article !== null) as NewsArticle[];
        },
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Get engagement data for an article
 */
async function getArticleEngagement(blobId: string): Promise<ArticleEngagement> {
    try {
        const registry = await suiClient.getObject({
            id: CONTRACT_CONFIG.REGISTRY_ID,
            options: { showContent: true },
        });

        if (!registry.data?.content || registry.data.content.dataType !== 'moveObject') {
            return { totalTips: 0, tipCount: 0, commentCount: 0 };
        }

        const fields = registry.data.content.fields as any;
        const engagementMap = fields.engagement_map as any;

        // Find engagement for this blob_id
        // The engagement_map is a VecMap, so it has a contents array with key/value pairs
        const engagement = engagementMap.fields?.contents?.find((item: any) => item.fields?.key === blobId);

        if (!engagement) {
            return { totalTips: 0, tipCount: 0, commentCount: 0 };
        }

        const value = engagement.fields?.value?.fields;

        if (!value) {
            return { totalTips: 0, tipCount: 0, commentCount: 0 };
        }

        return {
            totalTips: parseInt(value.total_tips || '0'),
            tipCount: parseInt(value.tip_count || '0'),
            commentCount: parseInt(value.comment_count || '0'),
        };
    } catch (error) {
        console.error('Error fetching engagement:', error);
        return { totalTips: 0, tipCount: 0, commentCount: 0 };
    }
}
