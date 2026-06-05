/**
 * TradePort (indexer.xyz) NFT Data API client.
 *
 * GraphQL endpoint, auth via x-api-key / x-api-user headers. We query the
 * `sui` root for collections + NFTs. Demo key limits: 10k calls, 100 rpm,
 * max 25 objects per request.
 *
 * NOTE: the key is currently exposed client-side (same pattern as the
 * Blockberry key). Fine for the demo trial key; proxy through the backend
 * before production.
 */

import { GraphQLClient } from 'graphql-request';
import {
    TRADEPORT_ENDPOINT,
    TRADEPORT_API_KEY,
    TRADEPORT_API_USER,
    WALRUS_MAINNET_AGGREGATOR,
    IPFS_GATEWAY,
} from '../constants';

export const tradeportClient = new GraphQLClient(TRADEPORT_ENDPOINT, {
    headers: {
        'x-api-key': TRADEPORT_API_KEY,
        'x-api-user': TRADEPORT_API_USER,
    },
});

// ============================================================
// Types
// ============================================================

export interface NftCollection {
    id: string;
    slug: string;
    semantic_slug: string | null;
    title: string;
    supply: number | null;
    cover_url: string | null;
    /** Floor price in MIST (1 SUI = 1e9 MIST). */
    floor: number | null;
    /** All-time crypto volume in MIST. */
    volume: number | null;
    usd_volume: number | null;
    verified: boolean;
    description?: string | null;
    website?: string | null;
    twitter?: string | null;
    discord?: string | null;
    /** One sample item — used as a cover fallback when cover_url is stale. */
    nfts?: Array<{ media_url: string | null }>;
}

export interface TrendingCollection {
    collection_id: string;
    current_usd_volume: number | string | null;
    current_volume: number | string | null;
    current_trades_count: number | null;
    collection: NftCollection;
}

export type TrendingPeriod = 'days_1' | 'days_7' | 'days_14' | 'days_30' | 'days_60' | 'days_90' | 'all_time';
export type TrendingBy = 'trades_count' | 'average_trade' | 'usd_volume' | 'crypto_volume';

/** A single NFT item inside a collection. */
export interface NftItem {
    id: string;
    token_id: string | null;
    name: string | null;
    media_url: string | null;
    owner: string | null;
    /** Rarity rank within the collection (lower = rarer). */
    ranking: number | null;
    /** Active listings; price is in MIST. */
    listings?: Array<{ price: number | string | null }>;
}

/** A marketplace action (sale/listing/bid/transfer) for a collection or NFT. */
export interface NftActivity {
    /** e.g. "buy", "list", "unlist", "bid", "accept-bid", "unlist-bid", "transfer", "mint". */
    type: string;
    /** Price in MIST (null for non-priced actions like transfers). */
    price: number | string | null;
    block_time: string;
    sender: string | null;
    receiver: string | null;
    nft: { name: string | null; media_url: string | null } | null;
}

/** An NFT owned by a wallet, with its collection summary. */
export interface WalletNft {
    id: string;
    name: string | null;
    media_url: string | null;
    collection: {
        title: string;
        slug: string;
        semantic_slug?: string | null;
        /** Floor in MIST. */
        floor: number | null;
        verified: boolean;
    } | null;
}

// ============================================================
// Media + value helpers
// ============================================================

/** Resolve a collection/NFT media URL (walrus:// or ipfs://) to HTTP. */
export function resolveMediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('walrus://')) {
        return `${WALRUS_MAINNET_AGGREGATOR}/v1/blobs/${url.slice('walrus://'.length)}`;
    }
    if (url.startsWith('ipfs://')) {
        return `${IPFS_GATEWAY}${url.slice('ipfs://'.length)}`;
    }
    return url; // already http(s) or data URI
}

/**
 * Best cover image for a collection. Many collections store cover_url as a
 * `walrus://` blob that no longer resolves, so prefer an http/ipfs cover and
 * otherwise fall back to a sample item's media_url (always a clean URL).
 */
export function collectionCover(c: NftCollection): string {
    const cover = c.cover_url ?? '';
    const sample = c.nfts?.find((n) => n.media_url)?.media_url ?? '';
    if (cover && !cover.startsWith('walrus://')) return resolveMediaUrl(cover);
    if (sample) return resolveMediaUrl(sample);
    return resolveMediaUrl(cover); // last resort (may be a stale walrus blob)
}

const MIST_PER_SUI = 1_000_000_000;

/** Convert a MIST amount (number or numeric string) to SUI. */
export function mistToSui(mist: number | string | null | undefined): number {
    const n = typeof mist === 'string' ? Number(mist) : mist ?? 0;
    if (!Number.isFinite(n)) return 0;
    return n / MIST_PER_SUI;
}

// ============================================================
// Queries
// ============================================================

const TRENDING_QUERY = /* GraphQL */ `
  query fetchTrendingCollections($period: TrendingPeriod!, $trending_by: TrendingBy!, $offset: Int = 0, $limit: Int!) {
    sui {
      collections_trending(period: $period, trending_by: $trending_by, offset: $offset, limit: $limit) {
        collection_id
        current_usd_volume
        current_volume
        current_trades_count
        collection {
          id
          slug
          semantic_slug
          title
          supply
          cover_url
          floor
          volume
          usd_volume
          verified
          nfts(limit: 1, where: { media_url: { _is_null: false } }) {
            media_url
          }
        }
      }
    }
  }
`;

/** Top trending Sui NFT collections. limit capped at 25 (API object limit). */
export async function fetchTrendingCollections(opts: {
    period?: TrendingPeriod;
    trendingBy?: TrendingBy;
    limit?: number;
    offset?: number;
} = {}): Promise<TrendingCollection[]> {
    const data = await tradeportClient.request<{ sui: { collections_trending: TrendingCollection[] } }>(
        TRENDING_QUERY,
        {
            period: opts.period ?? 'days_1',
            trending_by: opts.trendingBy ?? 'usd_volume',
            limit: Math.min(opts.limit ?? 12, 25),
            offset: opts.offset ?? 0,
        }
    );
    return data.sui.collections_trending ?? [];
}

const SEARCH_QUERY = /* GraphQL */ `
  query collectionSearch($text: String, $offset: Int, $limit: Int) {
    sui {
      collections_search(args: { text: $text }, offset: $offset, limit: $limit) {
        id
        supply
        floor
        slug
        semantic_slug
        title
        usd_volume
        volume
        cover_url
        verified
      }
    }
  }
`;

/** Free-text collection search. */
export async function searchCollections(text: string, limit = 12): Promise<NftCollection[]> {
    if (!text.trim()) return [];
    const data = await tradeportClient.request<{ sui: { collections_search: NftCollection[] } }>(
        SEARCH_QUERY,
        { text, limit: Math.min(limit, 25), offset: 0 }
    );
    return data.sui.collections_search ?? [];
}

const COLLECTION_INFO_QUERY = /* GraphQL */ `
  query fetchCollectionInfo($slug: String) {
    sui {
      collections(where: { _or: [{ semantic_slug: { _eq: $slug } }, { slug: { _eq: $slug } }] }) {
        id
        title
        slug
        semantic_slug
        description
        floor
        volume
        usd_volume
        cover_url
        supply
        verified
        discord
        twitter
        website
      }
    }
  }
`;

/** Full info for one collection by slug or semantic_slug. */
export async function fetchCollectionInfo(slug: string): Promise<NftCollection | null> {
    const data = await tradeportClient.request<{ sui: { collections: NftCollection[] } }>(
        COLLECTION_INFO_QUERY,
        { slug }
    );
    return data.sui.collections?.[0] ?? null;
}

const COLLECTION_BY_ID_QUERY = /* GraphQL */ `
  query collectionById($id: uuid!) {
    sui {
      collections(where: { id: { _eq: $id } }) {
        id
        title
        slug
        semantic_slug
        description
        floor
        volume
        usd_volume
        cover_url
        supply
        verified
        discord
        twitter
        website
        nfts(limit: 1, where: { media_url: { _is_null: false } }) {
          media_url
        }
      }
    }
  }
`;

/** Full info for one collection by its TradePort uuid (used by the detail page). */
export async function fetchCollectionById(id: string): Promise<NftCollection | null> {
    if (!id) return null;
    const data = await tradeportClient.request<{ sui: { collections: NftCollection[] } }>(
        COLLECTION_BY_ID_QUERY,
        { id }
    );
    return data.sui.collections?.[0] ?? null;
}

const COLLECTION_NFTS_QUERY = /* GraphQL */ `
  query collectionNfts($collectionId: uuid!, $offset: Int = 0, $limit: Int!) {
    sui {
      nfts(where: { collection_id: { _eq: $collectionId } }, offset: $offset, limit: $limit, order_by: { ranking: asc }) {
        id
        token_id
        name
        media_url
        owner
        ranking
        listings(where: { price: { _is_null: false } }, limit: 1, order_by: { price: asc }) {
          price
        }
      }
    }
  }
`;

/** Items inside a collection, rarest-first. limit capped at 25 (API object limit). */
export async function fetchCollectionNfts(
    collectionId: string,
    opts: { limit?: number; offset?: number } = {}
): Promise<NftItem[]> {
    if (!collectionId) return [];
    const data = await tradeportClient.request<{ sui: { nfts: NftItem[] } }>(COLLECTION_NFTS_QUERY, {
        collectionId,
        limit: Math.min(opts.limit ?? 18, 25),
        offset: opts.offset ?? 0,
    });
    return data.sui.nfts ?? [];
}

const COLLECTION_ACTIVITY_QUERY = /* GraphQL */ `
  query collectionActivity($collectionId: uuid!, $offset: Int = 0, $limit: Int!) {
    sui {
      actions(where: { collection_id: { _eq: $collectionId } }, offset: $offset, limit: $limit, order_by: { block_time: desc }) {
        type
        price
        block_time
        sender
        receiver
        nft {
          name
          media_url
        }
      }
    }
  }
`;

/** Recent marketplace activity (sales/listings/bids) for a collection. */
export async function fetchCollectionActivity(
    collectionId: string,
    opts: { limit?: number; offset?: number } = {}
): Promise<NftActivity[]> {
    if (!collectionId) return [];
    const data = await tradeportClient.request<{ sui: { actions: NftActivity[] } }>(COLLECTION_ACTIVITY_QUERY, {
        collectionId,
        limit: Math.min(opts.limit ?? 20, 25),
        offset: opts.offset ?? 0,
    });
    return data.sui.actions ?? [];
}

const WALLET_NFTS_QUERY = /* GraphQL */ `
  query walletNfts($owner: String!, $offset: Int = 0, $limit: Int!) {
    sui {
      nfts(where: { owner: { _eq: $owner } }, offset: $offset, limit: $limit) {
        id
        name
        media_url
        collection {
          title
          slug
          semantic_slug
          floor
          verified
        }
      }
    }
  }
`;

/** NFTs owned by a wallet (with collection summary). limit capped at 25. */
export async function fetchWalletNftHoldings(
    owner: string,
    opts: { limit?: number; offset?: number } = {}
): Promise<WalletNft[]> {
    if (!owner) return [];
    const data = await tradeportClient.request<{ sui: { nfts: WalletNft[] } }>(WALLET_NFTS_QUERY, {
        owner,
        limit: Math.min(opts.limit ?? 25, 25),
        offset: opts.offset ?? 0,
    });
    return data.sui.nfts ?? [];
}

/**
 * Aggregate a wallet's NFTs into per-collection holdings (count + sample image),
 * sorted by how many the wallet holds. Useful for profiles and the personal agent.
 */
export function summariseHoldingsByCollection(nfts: WalletNft[]): Array<{
    title: string;
    slug: string;
    count: number;
    floor: number | null;
    verified: boolean;
    sampleMedia: string;
}> {
    const byCollection = new Map<string, { title: string; slug: string; count: number; floor: number | null; verified: boolean; sampleMedia: string }>();
    for (const n of nfts) {
        const c = n.collection;
        if (!c) continue;
        const key = c.slug || c.title;
        const existing = byCollection.get(key);
        if (existing) {
            existing.count += 1;
            if (!existing.sampleMedia && n.media_url) existing.sampleMedia = resolveMediaUrl(n.media_url);
        } else {
            byCollection.set(key, {
                title: c.title,
                slug: c.semantic_slug || c.slug,
                count: 1,
                floor: c.floor,
                verified: c.verified,
                sampleMedia: n.media_url ? resolveMediaUrl(n.media_url) : '',
            });
        }
    }
    return [...byCollection.values()].sort((a, b) => b.count - a.count);
}
