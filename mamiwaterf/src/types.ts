export interface DApp {
    id: string;
    name: string;
    tagline: string;
    description: string;
    iconUrl: string;
    bannerUrl: string;
    category: Category;
    website: string;
    twitter?: string;
    discord?: string;
    github?: string;
    packageId?: string; // Smart contract package ID for verification

    // Metrics
    metrics: {
        users24h: number;
        users7d: number;
        users30d: number;
        volume24h: number;
        volume7d: number;
        volume30d: number;
        tvl?: number;
        transactions24h: number;
    };

    // Rankings
    rank: number;
    rankChange: number; // positive = up, negative = down

    // Community
    rating: number; // 0-5 (Platform rating from on-chain reviews)
    blockberryRating?: number; // 0-5 (External rating from Blockberry API)
    reviewCount: number;
    upvotes: number;

    // Launch info
    launchDate: string;
    isNew: boolean;
    isFeatured: boolean;

    // Details
    screenshots: string[];
    features: string[];
    developer: Developer;
    reviewsTableId: string; // Table ID for fetching reviews
    reviews: Review[]; // Placeholder for UI
}

export type Category =
    | 'DeFi'
    | 'NFT'
    | 'Gaming'
    | 'Social'
    | 'Marketplace'
    | 'Infrastructure'
    | 'DAO'
    | 'Wallet'
    | 'Analytics'
    | 'Other'
    | 'Bridge'
    | 'DEX'
    | 'Lending'
    | 'Yield'
    | 'CDP'
    | 'Launchpad'
    | 'Liquid Staking'
    | 'RWA'
    | 'Algo Stables'
    | 'Synthetics'
    | 'Payments'
    | 'Derivatives';

export interface Developer {
    id: string;
    name: string;
    avatar: string;
    bio: string;
    website?: string;
    twitter?: string;
    verified: boolean;
    dapps: string[]; // dApp IDs
}

export interface Review {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    rating: number;
    title: string;
    content: string;
    contentBlobId?: string; // Walrus blob ID
    date: string;
    helpful: number;
    verified: boolean;
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    content: string;
    contentBlobId?: string; // Walrus blob ID
    date: string;
    upvotes: number;
    isMaker?: boolean;
    parentId?: string | null;
    replies?: Comment[];
}

export interface MetricDataPoint {
    date: string;
    value: number;
}

export interface ChartData {
    users: MetricDataPoint[];
    volume: MetricDataPoint[];
    tvl?: MetricDataPoint[];
}

export type SortOption =
    | 'rank'
    | 'users'
    | 'volume'
    | 'tvl'
    | 'rating'
    | 'new';

export type TimeFilter = '24h' | '7d' | '30d' | 'all';

export interface NewsArticle {
    id: string;
    blob_id: string;
    title: string;
    category: string;
    source: 'twitter' | 'rss' | 'onchain';
    timestamp: number;

    // Full content (fetched from Walrus)
    content?: string;
    summary?: string;
    url?: string;
    image?: string;
    author?: string;

    // Engagement
    totalTips: number;
    tipCount: number;
    commentCount: number;
}

export interface WalrusArticleContent {
    title: string;
    content: string;
    summary?: string;
    source: string;
    url?: string;
    image?: string;
    author?: string;
    timestamp: number;
}

export interface ArticleEngagement {
    totalTips: number;
    tipCount: number;
    commentCount: number;
}
