import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    BadgeCheck,
    ExternalLink,
    Twitter,
    Globe,
    Loader2,
    Image as ImageIcon,
    TrendingUp,
    Boxes,
    Activity,
} from 'lucide-react';
import type { DApp, Review, Comment } from '../types';
import ReviewSection from '../components/ReviewSection';
import CommentSection from '../components/CommentSection';
import AgentReportPanel from '../components/AgentReportPanel';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNftCollectionById, useCollectionNfts, useCollectionActivity } from '../hooks/useNftCollections';
import { useOnChainDApp } from '../hooks/useOnChainDApp';
import { useReviews } from '../hooks/useReviews';
import { useComments } from '../hooks/useComments';
import { useSubmitComment } from '../hooks/useSubmitComment';
import { collectionCover, resolveMediaUrl, mistToSui, type NftCollection } from '../utils/tradeport';
import { formatNumber } from '../utils';

function fmtSui(mist: number | string | null | undefined): string {
    const sui = mistToSui(mist);
    if (sui <= 0) return '—';
    return `${formatNumber(sui)} SUI`;
}

function fmtUsd(v: number | string | null | undefined): string {
    const n = typeof v === 'string' ? Number(v) : v ?? 0;
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `$${formatNumber(n)}`;
}

/** TradePort stores twitter as a full URL (sometimes a bare handle). Normalise both. */
function twitterUrl(t?: string | null): string | undefined {
    if (!t) return undefined;
    const v = t.trim();
    if (!v) return undefined;
    if (v.startsWith('http')) return v;
    return `https://x.com/${v.replace(/^@/, '')}`;
}

const ACTION_STYLE: Record<string, string> = {
    buy: 'bg-neo-green text-neo-black',
    'accept-bid': 'bg-neo-green text-neo-black',
    sale: 'bg-neo-green text-neo-black',
    list: 'bg-neo-violet text-neo-black',
    bid: 'bg-neo-cyan text-neo-black',
    mint: 'bg-neo-lime text-neo-black',
    transfer: 'bg-white text-neo-black',
};

function actionStyle(type: string): string {
    return ACTION_STYLE[type] ?? 'bg-neo-white text-gray-600';
}

function shortAddr(a?: string | null): string {
    if (!a) return '—';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Map a TradePort collection onto the DApp shape so it can reuse the
 *  registry-backed review / comment / agent-audit components unchanged. */
function collectionToDApp(c: NftCollection, onChain?: { rating?: number; reviewCount?: number; reviewsTableId?: string }): DApp {
    const cover = collectionCover(c);
    const tradeportSlug = c.semantic_slug || c.slug;
    const tradeportUrl = `https://www.tradeport.xyz/sui/collection/${tradeportSlug}`;
    return {
        id: c.id,
        name: c.title,
        tagline: c.supply ? `${formatNumber(c.supply)}-item Sui NFT collection` : 'Sui NFT collection',
        description: c.description || 'A Sui NFT collection indexed via TradePort.',
        iconUrl: cover,
        bannerUrl: cover,
        category: 'NFT',
        categories: ['NFT'],
        website: c.website || tradeportUrl,
        twitter: c.twitter || undefined,
        discord: c.discord || undefined,
        github: undefined,
        packageId: undefined,
        metrics: {
            users24h: 0,
            users7d: 0,
            users30d: 0,
            volume24h: 0,
            volume7d: 0,
            volume30d: 0,
            transactions24h: 0,
        },
        rank: 0,
        rankChange: 0,
        rating: onChain?.rating ?? 0,
        reviewCount: onChain?.reviewCount ?? 0,
        upvotes: 0,
        launchDate: new Date().toISOString(),
        isNew: false,
        isFeatured: false,
        screenshots: [],
        features: [],
        developer: {
            id: '',
            name: 'TradePort',
            avatar: '🛒',
            bio: 'NFT collection data indexed via TradePort (indexer.xyz).',
            verified: c.verified,
            dapps: [],
        },
        reviewsTableId: onChain?.reviewsTableId ?? '',
        reviews: [],
    };
}

export default function NftCollectionPage() {
    const { id } = useParams<{ id: string }>();
    const account = useCurrentAccount();
    const { submitComment } = useSubmitComment();

    const { data: collection, isLoading, isError } = useNftCollectionById(id);
    const { data: items, isLoading: itemsLoading } = useCollectionNfts(id, 18);
    const { data: activity, isLoading: activityLoading } = useCollectionActivity(id, 20);

    // On-chain registration is matched by collection title (same path as dApps).
    const { data: onChainDApp } = useOnChainDApp('', collection?.title);
    const { data: fetchedReviews } = useReviews(onChainDApp?.id || '', onChainDApp?.reviewsTableId || '');
    const { data: fetchedComments } = useComments(onChainDApp?.id || '');

    const [localReviews, setLocalReviews] = useState<Review[]>([]);
    const [localComments, setLocalComments] = useState<Comment[]>([]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-neo-black" />
            </div>
        );
    }

    if (isError || !collection) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-12 neo-box bg-white">
                    <h1 className="text-3xl font-black uppercase mb-4">Collection Not Found</h1>
                    <Link to="/" className="text-neo-violet hover:underline font-bold uppercase">
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    const dapp = collectionToDApp(collection, onChainDApp ?? undefined);
    const cover = collectionCover(collection);
    const tradeportUrl = `https://www.tradeport.xyz/sui/collection/${collection.semantic_slug || collection.slug}`;
    const tw = twitterUrl(collection.twitter);

    const reviews = [
        ...(fetchedReviews || []),
        ...localReviews.filter((lr) => !(fetchedReviews || []).some((fr) => fr.id === lr.id)),
    ];
    const comments = [
        ...(fetchedComments || []),
        ...localComments.filter((lc) => !(fetchedComments || []).some((fc) => fc.id === lc.id)),
    ];

    const handleAddReview = (r: { rating: number; title: string; content: string; verified: boolean }) => {
        setLocalReviews((prev) => [
            {
                id: `r${Date.now()}`,
                userId: account?.address || 'guest',
                userName: account?.address || 'Guest',
                userAvatar: '👤',
                rating: r.rating,
                title: r.title,
                content: r.content,
                date: new Date().toISOString(),
                helpful: 0,
                verified: r.verified,
            },
            ...prev,
        ]);
    };

    const handleAddComment = (content: string, parentId?: string): Promise<void> =>
        new Promise((resolve, reject) => {
            submitComment(
                dapp.id,
                content,
                dapp.name, // matched by collection title on-chain
                parentId,
                () => {
                    const newComment: Comment = {
                        id: `c${Date.now()}`,
                        userId: account?.address || 'guest',
                        userName: account?.address || 'Guest',
                        userAvatar: '👤',
                        content,
                        contentBlobId: 'pending',
                        date: new Date().toISOString(),
                        upvotes: 0,
                        isMaker: false,
                        parentId,
                        replies: [],
                    };
                    setLocalComments((prev) => [newComment, ...prev]);
                    resolve();
                },
                (err) => reject(err)
            );
        });

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
            {/* Back */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-neo-black mb-4 sm:mb-6 transition-colors font-bold uppercase text-sm sm:text-base"
            >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Back to dApps</span>
            </Link>

            {/* Hero */}
            <div className="neo-box bg-white mb-6 sm:mb-8 overflow-hidden">
                <div className="relative h-40 sm:h-56 md:h-64 bg-neo-black border-b-2 sm:border-b-3 border-neo-black overflow-hidden">
                    {cover && (
                        <img
                            src={cover}
                            alt={collection.title}
                            className="w-full h-full object-cover opacity-70"
                            onError={(e) => { (e.currentTarget.style.display = 'none'); }}
                        />
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-neo-violet border-2 border-neo-black rounded-lg px-3 py-1 shadow-neo-sm">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">NFT Collection</span>
                    </div>
                </div>

                <div className="p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-neo-white border-2 sm:border-3 border-neo-black shadow-neo rounded-xl flex items-center justify-center text-3xl flex-shrink-0 -mt-8 sm:-mt-12 md:-mt-16 relative z-10 overflow-hidden">
                            {cover ? (
                                <img src={cover} alt={collection.title} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                            ) : (
                                <span>🖼️</span>
                            )}
                        </div>

                        <div className="flex-1 w-full">
                            <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-4">
                                <div className="w-full lg:flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter break-words">
                                            {collection.title}
                                        </h1>
                                        {collection.verified && (
                                            <span className="inline-flex items-center gap-1 bg-neo-violet border-2 border-neo-black rounded-md px-2 py-0.5 text-xs font-black uppercase shadow-neo-sm">
                                                <BadgeCheck className="w-4 h-4" /> Verified
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-base sm:text-lg font-medium text-gray-600 mb-3 border-l-2 sm:border-l-4 border-neo-lime pl-3 sm:pl-4">
                                        {dapp.tagline}
                                    </p>
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-neo-lime border-2 border-neo-black text-neo-black text-sm font-bold uppercase shadow-neo-sm rounded-md">
                                            NFT
                                        </span>
                                        {tw && (
                                            <a href={tw} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border-2 border-neo-black rounded-md hover:bg-neo-cyan transition-colors shadow-neo-sm">
                                                <Twitter className="w-4 h-4" />
                                            </a>
                                        )}
                                        {collection.website && (
                                            <a href={collection.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border-2 border-neo-black rounded-md hover:bg-neo-lime transition-colors shadow-neo-sm">
                                                <Globe className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <a
                                    href={tradeportUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full lg:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-neo-violet text-neo-black border-2 sm:border-3 border-neo-black shadow-neo rounded-xl font-black uppercase text-sm sm:text-base hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000000] transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Trade on TradePort</span>
                                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                <div className="neo-box p-3 sm:p-4 md:p-6 bg-white hover:bg-neo-lime-soft transition-colors">
                    <div className="flex items-center gap-1 text-gray-500 mb-1 sm:mb-2 font-bold uppercase text-[10px] sm:text-xs">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> Floor
                    </div>
                    <div className="text-lg sm:text-2xl md:text-3xl font-black truncate">{fmtSui(collection.floor)}</div>
                </div>
                <div className="neo-box p-3 sm:p-4 md:p-6 bg-white hover:bg-neo-lime-soft transition-colors">
                    <div className="flex items-center gap-1 text-gray-500 mb-1 sm:mb-2 font-bold uppercase text-[10px] sm:text-xs">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> Volume
                    </div>
                    <div className="text-lg sm:text-2xl md:text-3xl font-black truncate">{fmtUsd(collection.usd_volume)}</div>
                </div>
                <div className="neo-box p-3 sm:p-4 md:p-6 bg-white hover:bg-neo-lime-soft transition-colors">
                    <div className="flex items-center gap-1 text-gray-500 mb-1 sm:mb-2 font-bold uppercase text-[10px] sm:text-xs">
                        <Boxes className="w-3 h-3 sm:w-4 sm:h-4" /> Supply
                    </div>
                    <div className="text-lg sm:text-2xl md:text-3xl font-black truncate">{collection.supply ? formatNumber(collection.supply) : '—'}</div>
                </div>
                <div className="neo-box p-3 sm:p-4 md:p-6 bg-white hover:bg-neo-lime-soft transition-colors">
                    <div className="flex items-center gap-1 text-gray-500 mb-1 sm:mb-2 font-bold uppercase text-[10px] sm:text-xs">
                        <Activity className="w-3 h-3 sm:w-4 sm:h-4" /> Reviews
                    </div>
                    <div className="text-lg sm:text-2xl md:text-3xl font-black truncate">{dapp.reviewCount}</div>
                </div>
            </div>

            {/* About */}
            {collection.description && (
                <div className="neo-box p-4 sm:p-6 md:p-8 bg-white mb-6 sm:mb-8">
                    <h2 className="text-2xl font-black uppercase mb-4 border-b-3 border-neo-black pb-2 inline-block">About</h2>
                    <p className="text-neo-black font-medium leading-relaxed">{collection.description}</p>
                </div>
            )}

            {/* Items + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                {/* Items grid */}
                <div className="lg:col-span-2 neo-box p-4 sm:p-6 bg-white">
                    <h2 className="text-2xl font-black uppercase mb-4 border-b-3 border-neo-black pb-2 inline-flex items-center gap-2">
                        <Boxes className="w-6 h-6" /> Items
                    </h2>
                    {itemsLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-neo-black" /></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                            {(items ?? []).map((it) => {
                                const media = resolveMediaUrl(it.media_url);
                                const price = it.listings?.find((l) => l.price)?.price;
                                return (
                                    <div key={it.id} className="border-2 border-neo-black rounded-lg overflow-hidden bg-neo-white">
                                        <div className="relative aspect-square bg-neo-black overflow-hidden">
                                            {media ? (
                                                <img src={media} alt={it.name || ''} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                                            )}
                                            {it.ranking != null && (
                                                <span className="absolute top-1 left-1 bg-neo-lime border border-neo-black rounded px-1 text-[9px] font-black">#{it.ranking}</span>
                                            )}
                                        </div>
                                        <div className="p-2">
                                            <div className="text-[11px] font-black uppercase truncate">{it.name || 'NFT'}</div>
                                            <div className="text-[10px] font-bold text-gray-500">{price ? fmtSui(price) : 'Not listed'}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {(items ?? []).length === 0 && (
                                <div className="col-span-full text-center py-8 font-bold text-gray-500">No items found.</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Activity */}
                <div className="neo-box p-4 sm:p-6 bg-white h-fit">
                    <h2 className="text-2xl font-black uppercase mb-4 border-b-3 border-neo-black pb-2 inline-flex items-center gap-2">
                        <Activity className="w-6 h-6" /> Activity
                    </h2>
                    {activityLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-neo-black" /></div>
                    ) : (
                        <div className="space-y-2 max-h-[28rem] overflow-y-auto custom-scrollbar pr-1">
                            {(activity ?? []).map((a, i) => (
                                <div key={i} className="flex items-center gap-2 border-2 border-neo-black rounded-lg p-2 bg-neo-white">
                                    <div className="w-9 h-9 flex-shrink-0 border-2 border-neo-black rounded-md overflow-hidden bg-neo-black">
                                        {a.nft?.media_url ? (
                                            <img src={resolveMediaUrl(a.nft.media_url)} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                                        ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border border-neo-black rounded ${actionStyle(a.type)}`}>{a.type}</span>
                                            <span className="text-[11px] font-black truncate">{a.nft?.name || '—'}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-500 truncate">
                                            {a.price ? fmtSui(a.price) : ''} {a.receiver ? `→ ${shortAddr(a.receiver)}` : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(activity ?? []).length === 0 && (
                                <div className="text-center py-8 font-bold text-gray-500">No recent activity.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* AI Agent Audit (reuses the on-chain registry) */}
            <AgentReportPanel
                dappId={onChainDApp?.id}
                metadata={{
                    name: dapp.name,
                    tagline: dapp.tagline,
                    category: 'NFT',
                    website: dapp.website || '',
                    twitter: dapp.twitter,
                    discord: dapp.discord,
                }}
            />

            {/* Reviews & Comments (reuses the on-chain registry) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
                <div className="neo-box p-8 bg-white">
                    <ReviewSection
                        dapp={dapp}
                        isRegistered={!!onChainDApp}
                        reviews={reviews}
                        rating={dapp.rating}
                        reviewCount={dapp.reviewCount}
                        onReviewSubmitted={handleAddReview}
                        onRegisterSuccess={() => window.location.reload()}
                    />
                </div>
                <div className="neo-box p-8 bg-white">
                    <CommentSection comments={comments} onAddComment={handleAddComment} />
                </div>
            </div>
        </div>
    );
}
