import { useQuery } from "@tanstack/react-query";
import {
    fetchTrendingCollections,
    searchCollections,
    fetchCollectionInfo,
    fetchCollectionById,
    fetchCollectionNfts,
    fetchCollectionActivity,
    fetchWalletNftHoldings,
    summariseHoldingsByCollection,
    type TrendingPeriod,
    type TrendingBy,
} from "../utils/tradeport";

/** Top trending Sui NFT collections from TradePort. */
export const useTrendingNftCollections = (opts: {
    period?: TrendingPeriod;
    trendingBy?: TrendingBy;
    limit?: number;
} = {}) =>
    useQuery({
        queryKey: ["nftTrending", opts.period ?? "days_1", opts.trendingBy ?? "usd_volume", opts.limit ?? 12],
        queryFn: () => fetchTrendingCollections(opts),
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 1,
    });

/** Free-text NFT collection search. */
export const useNftCollectionSearch = (text: string) =>
    useQuery({
        queryKey: ["nftSearch", text],
        queryFn: () => searchCollections(text),
        enabled: text.trim().length > 1,
        staleTime: 1000 * 60 * 2,
    });

/** Single collection info by slug. */
export const useNftCollection = (slug: string | undefined) =>
    useQuery({
        queryKey: ["nftCollection", slug],
        queryFn: () => fetchCollectionInfo(slug as string),
        enabled: !!slug,
        staleTime: 1000 * 60 * 5,
    });

/** Single collection by its TradePort uuid (detail page). */
export const useNftCollectionById = (id: string | undefined) =>
    useQuery({
        queryKey: ["nftCollectionById", id],
        queryFn: () => fetchCollectionById(id as string),
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
    });

/** Items inside a collection (rarest-first), keyed by the TradePort collection id. */
export const useCollectionNfts = (collectionId: string | undefined, limit = 18) =>
    useQuery({
        queryKey: ["nftItems", collectionId, limit],
        queryFn: () => fetchCollectionNfts(collectionId as string, { limit }),
        enabled: !!collectionId,
        staleTime: 1000 * 60 * 2,
    });

/** Recent marketplace activity for a collection. */
export const useCollectionActivity = (collectionId: string | undefined, limit = 20) =>
    useQuery({
        queryKey: ["nftActivity", collectionId, limit],
        queryFn: () => fetchCollectionActivity(collectionId as string, { limit }),
        enabled: !!collectionId,
        staleTime: 1000 * 60,
        refetchInterval: 1000 * 60,
    });

/** A wallet's NFT holdings, aggregated per collection (count + sample image). */
export const useWalletNfts = (owner: string | undefined, limit = 25) =>
    useQuery({
        queryKey: ["walletNfts", owner, limit],
        queryFn: async () => {
            const nfts = await fetchWalletNftHoldings(owner as string, { limit });
            return { nfts, collections: summariseHoldingsByCollection(nfts) };
        },
        enabled: !!owner,
        staleTime: 1000 * 60 * 5,
    });
