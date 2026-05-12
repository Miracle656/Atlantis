import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatNumber, formatCurrency, formatRelativeTime } from '../utils';
import type { Review, Comment } from '../types';
import ReviewSection from '../components/ReviewSection';
import CommentSection from '../components/CommentSection';
import { useDApps } from '../hooks/useDApps';
import {
    ExternalLink,
    Twitter,
    Github,
    Users,
    DollarSign,
    TrendingUp,
    Star,
    ArrowLeft,
    Sparkles,
    Loader2
} from 'lucide-react';
import DAppCard from '../components/DAppCard';
import { useMiniApp } from '../context/MiniAppContext';
import { useCurrentAccount } from '@mysten/dapp-kit';

import { useReviews } from '../hooks/useReviews';
import { useComments } from '../hooks/useComments';
import { useSubmitComment } from '../hooks/useSubmitComment';
import { useOnChainDApp } from '../hooks/useOnChainDApp';
import { useFetchFromWalrus } from '../hooks/useFetchFromWalrus';
import { extractBlobId } from '../utils/extractBlobId';
import { WALRUS_AGGREGATORS } from '../constants';

export default function DAppDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: dapps, isLoading, error } = useDApps();

    // Find the dApp from the fetched list
    const dapp = dapps?.find(d => d.id === id);

    // Fetch on-chain dApp details (Object ID, reviews table ID, and ALL editable fields)
    const { data: onChainDApp } = useOnChainDApp(dapp?.packageId || '', dapp?.name);

    // Extract blob IDs from URLs
    const descriptionBlobId = onChainDApp?.descriptionBlobId;
    const bannerBlobId = extractBlobId(onChainDApp?.bannerUrl);

    // Fetch description from Walrus if we have a blob ID
    const { data: walrusDescription } = useFetchFromWalrus(descriptionBlobId);

    // Construct banner URL using first aggregator + blob ID if available, otherwise fallback
    const bannerUrl = bannerBlobId ? `${WALRUS_AGGREGATORS[0]}/${bannerBlobId}` : onChainDApp?.bannerUrl;

    // Merge dApp data: Use on-chain data for editable fields if available, otherwise use Blockberry data
    const displayDApp = dapp && onChainDApp ? {
        ...dapp,
        // Override with on-chain data for editable fields
        name: onChainDApp.name,
        tagline: onChainDApp.tagline,
        // Use Walrus description if available, otherwise fall back to Blockberry
        description: walrusDescription || dapp.description,
        iconUrl: onChainDApp.iconUrl,
        bannerUrl: bannerUrl || '',
        category: onChainDApp.category as any,
        website: onChainDApp.website,
        twitter: onChainDApp.twitter,
        discord: onChainDApp.discord,
        github: onChainDApp.github,
        features: onChainDApp.features,
        rating: onChainDApp.rating,
        reviewCount: onChainDApp.reviewCount,
    } : dapp;

    // Debug logging
    console.log('🔍 displayDApp:', displayDApp);
    console.log('🔍 Twitter:', displayDApp?.twitter);
    console.log('🔍 Discord:', displayDApp?.discord);
    console.log('🔍 GitHub:', displayDApp?.github);

    // Fetch reviews and comments from blockchain using the correct on-chain IDs
    const { data: fetchedReviews } = useReviews(onChainDApp?.id || '', onChainDApp?.reviewsTableId || '');
    const { data: fetchedComments } = useComments(onChainDApp?.id || '');

    // Local state for optimistic updates (newly added items)
    const [localReviews, setLocalReviews] = useState<Review[]>([]);
    const [localComments, setLocalComments] = useState<Comment[]>([]);

    // Merge fetched and local data
    // We filter out local items if they appear in fetched data (by ID) to avoid duplicates
    const reviews = [
        ...(fetchedReviews || []),
        ...localReviews.filter(lr => !(fetchedReviews || []).some(fr => fr.id === lr.id))
    ];

    const comments = [
        ...(fetchedComments || []),
        ...localComments.filter(lc => !(fetchedComments || []).some(fc => fc.id === lc.id))
    ];


    // ... inside component ...
    const { openMiniApp } = useMiniApp();
    const account = useCurrentAccount();
    const { submitComment } = useSubmitComment();

    const handleAddReview = (newReview: { rating: number; title: string; content: string; verified: boolean }) => {
        const review: Review = {
            id: `r${Date.now()}`,
            userId: account?.address || 'guest',
            // Use full address so DisplayName can resolve SuiNS
            userName: account?.address || 'Guest',
            userAvatar: '👤',
            rating: newReview.rating,
            title: newReview.title,
            content: newReview.content,
            date: new Date().toISOString(),
            helpful: 0,
            verified: newReview.verified
        };
        setLocalReviews([review, ...localReviews]);
    };



    const handleAddComment = (content: string, parentId?: string): Promise<void> => {
        if (!displayDApp) return Promise.reject("DApp not found");

        return new Promise((resolve, reject) => {
            // Submit to blockchain with Walrus upload
            submitComment(
                displayDApp.id,
                content,
                displayDApp.name, // Pass dApp name for lookup
                parentId,
                () => {
                    console.log("Comment submitted successfully!");
                    // Optimistically add to local state for immediate feedback
                    const newComment: Comment = {
                        id: `c${Date.now()}`,
                        userId: account?.address || 'guest',
                        userName: account?.address || 'Guest',
                        userAvatar: '👤',
                        content,
                        contentBlobId: "pending",
                        date: new Date().toISOString(),
                        upvotes: 0,
                        isMaker: false,
                        parentId: parentId,
                        replies: []
                    };

                    if (parentId) {
                        setLocalComments(prev => {
                            // Helper to recursively find and update parent
                            const updateReplies = (comments: Comment[]): Comment[] => {
                                return comments.map(c => {
                                    if (c.id === parentId) {
                                        return { ...c, replies: [...(c.replies || []), newComment] };
                                    }
                                    if (c.replies && c.replies.length > 0) {
                                        return { ...c, replies: updateReplies(c.replies) };
                                    }
                                    return c;
                                });
                            };
                            return updateReplies(prev);
                        });
                    } else {
                        setLocalComments(prev => [newComment, ...prev]);
                    }
                    resolve();
                },
                (error) => {
                    console.error("Failed to submit comment:", error);
                    reject(error);
                }
            );
        });
    };

    const handleOpenApp = (e: React.MouseEvent) => {
        e.preventDefault();
        if (displayDApp) {
            openMiniApp(displayDApp);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-neo-black" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 font-bold">
                    Error loading dApp: {error.message}
                </div>
            </div>
        );
    }

    if (!displayDApp) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-12 neo-box bg-white">
                    <h1 className="text-3xl font-black uppercase mb-4">dApp Not Found</h1>
                    <Link to="/" className="text-neo-blue hover:underline font-bold uppercase">
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    const similarDApps = (dapps || [])
        .filter(d => d.category === displayDApp.category && d.id !== displayDApp.id)
        .slice(0, 3);

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
            {/* Back Button */}
            <Link
                to="/"
                className="inline-flex items-center space-x-1 sm:space-x-2 text-gray-500 hover:text-neo-black mb-4 sm:mb-6 transition-colors font-bold uppercase text-sm sm:text-base"
            >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Back to dApps</span>
            </Link>

            {/* Hero Section */}
            <div className="neo-box bg-white mb-6 sm:mb-8 overflow-hidden">
                {/* Banner */}
                <div className="relative h-40 sm:h-48 md:h-64 bg-neo-black border-b-2 sm:border-b-3 border-neo-black">
                    {displayDApp.bannerUrl && (
                        <img
                            src={displayDApp.bannerUrl}
                            alt={displayDApp.name}
                            className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
                        />
                    )}
                    {displayDApp.isNew && (
                        <div className="absolute top-4 right-4 px-4 py-2 bg-neo-green border-2 border-neo-black shadow-neo-sm text-sm font-black uppercase flex items-center space-x-2">
                            <Sparkles className="w-4 h-4" />
                            <span>NEW</span>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-neo-white border-2 sm:border-3 border-neo-black shadow-neo flex items-center justify-center text-3xl sm:text-4xl md:text-5xl flex-shrink-0 -mt-8 sm:-mt-12 md:-mt-16 relative z-10 overflow-hidden">
                            {displayDApp.iconUrl ? (
                                <img src={displayDApp.iconUrl} alt={displayDApp.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>💧</span>
                            )}
                        </div>

                        <div className="flex-1 w-full">
                            <div className="flex flex-col lg:flex-row items-start justify-between mb-4 gap-4">
                                <div className="w-full lg:flex-1">
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-2 tracking-tighter break-words">{displayDApp.name}</h1>
                                    <p className="text-base sm:text-lg md:text-xl font-medium text-gray-600 mb-4 border-l-2 sm:border-l-4 border-neo-yellow pl-3 sm:pl-4">{displayDApp.tagline}</p>
                                    <div className="flex items-center space-x-4">
                                        <span className="px-3 py-1 bg-neo-cyan border-2 border-neo-black text-neo-black text-sm font-bold uppercase shadow-neo-sm">
                                            {displayDApp.category}
                                        </span>
                                        <div className="flex items-center space-x-1 bg-neo-white px-2 py-1 border-2 border-neo-black shadow-neo-sm">
                                            <Star className="w-5 h-5 text-neo-black fill-neo-black" />
                                            <span className="font-black">{displayDApp.rating.toFixed(1)}</span>
                                            <span className="text-gray-500 font-bold text-xs uppercase">({displayDApp.reviewCount} reviews)</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleOpenApp}
                                    className="w-full lg:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-neo-pink text-neo-black border-2 sm:border-3 border-neo-black shadow-neo font-black uppercase text-sm sm:text-base hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000000] transition-all flex items-center justify-center space-x-2"
                                >
                                    <span>Open dApp</span>
                                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>

                            {/* Social Links */}
                            <div className="flex items-center space-x-3">
                                {displayDApp.twitter && (
                                    <a
                                        href={`https://twitter.com/${displayDApp.twitter}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white border-2 border-neo-black hover:bg-neo-blue hover:text-white transition-colors shadow-neo-sm"
                                    >
                                        <Twitter className="w-5 h-5" />
                                    </a>
                                )}
                                {displayDApp.github && (
                                    <a
                                        href={displayDApp.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white border-2 border-neo-black hover:bg-neo-black hover:text-white transition-colors shadow-neo-sm"
                                    >
                                        <Github className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                <div className="neo-box p-3 sm:p-4 md:p-6 bg-white hover:bg-neo-yellow transition-colors">
                    <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 mb-1 sm:mb-2 font-bold uppercase text-[10px] sm:text-xs">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Users (24h)</span>
                        <span className="sm:hidden">Users</span>
                    </div>
                    <div className="text-lg sm:text-2xl md:text-3xl font-black truncate">{formatNumber(displayDApp.metrics.users24h)}</div>
                </div>

                <div className="neo-box p-6 bg-white hover:bg-neo-green transition-colors">
                    <div className="flex items-center space-x-2 text-gray-500 mb-2 font-bold uppercase text-xs">
                        <DollarSign className="w-4 h-4" />
                        <span>Volume (24h)</span>
                    </div>
                    <div className="text-3xl font-black">{formatCurrency(displayDApp.metrics.volume24h)}</div>
                </div>

                <div className="neo-box p-6 bg-white hover:bg-neo-cyan transition-colors">
                    <div className="flex items-center space-x-2 text-gray-500 mb-2 font-bold uppercase text-xs">
                        <TrendingUp className="w-4 h-4" />
                        <span>Transactions (24h)</span>
                    </div>
                    <div className="text-3xl font-black">{formatNumber(displayDApp.metrics.transactions24h)}</div>
                </div>

                {displayDApp.metrics.tvl && (
                    <div className="neo-box p-6 bg-white hover:bg-neo-purple hover:text-white transition-colors group">
                        <div className="flex items-center space-x-2 text-gray-500 group-hover:text-white mb-2 font-bold uppercase text-xs">
                            <DollarSign className="w-4 h-4" />
                            <span>TVL</span>
                        </div>
                        <div className="text-3xl font-black">{formatCurrency(displayDApp.metrics.tvl)}</div>
                    </div>
                )}
            </div>

            {/* Description and Features */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                <div className="lg:col-span-2 neo-box p-4 sm:p-6 md:p-8 bg-white">
                    <h2 className="text-2xl font-black uppercase mb-4 border-b-3 border-neo-black pb-2 inline-block">About</h2>
                    <p className="text-neo-black font-medium mb-8 leading-relaxed">{displayDApp.description}</p>

                    <h3 className="text-xl font-black uppercase mb-4">Features</h3>
                    <ul className="space-y-3">
                        {displayDApp.features.map((feature, index) => (
                            <li key={index} className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-neo-black" />
                                <span className="text-neo-black font-bold">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="neo-box p-8 bg-white h-fit">
                    <h2 className="text-2xl font-black uppercase mb-6 border-b-3 border-neo-black pb-2">Developer</h2>
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-neo-white border-2 border-neo-black flex items-center justify-center text-2xl shadow-neo-sm overflow-hidden">
                            {displayDApp.developer.avatar.startsWith('http') ? (
                                <img
                                    src={displayDApp.developer.avatar}
                                    alt={displayDApp.developer.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                displayDApp.developer.avatar
                            )}
                        </div>
                        <div>
                            <div className="font-black text-lg uppercase">{displayDApp.developer.name}</div>
                            {displayDApp.developer.verified && (
                                <div className="text-xs font-bold text-white bg-neo-blue px-2 py-0.5 border border-neo-black inline-block mt-1">
                                    ✓ Verified
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-6 border-l-2 border-gray-300 pl-3">{displayDApp.developer.bio}</p>

                    <div className="text-sm font-bold text-gray-500 uppercase space-y-2 bg-neo-white p-4 border-2 border-neo-black">
                        <div className="flex justify-between">
                            <span>Launched:</span>
                            <span className="text-neo-black">{formatRelativeTime(displayDApp.launchDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Rank:</span>
                            <span className="text-neo-black">#{displayDApp.rank}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews & Comments Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
                <div className="neo-box p-8 bg-white">
                    <ReviewSection
                        dapp={displayDApp}
                        isRegistered={!!onChainDApp}
                        reviews={reviews}
                        rating={displayDApp.rating}
                        reviewCount={displayDApp.reviewCount}
                        onReviewSubmitted={(review: { rating: number; title: string; content: string; verified: boolean }) => handleAddReview(review)}
                        onRegisterSuccess={() => {
                            // Force refresh or just let the user know
                            console.log("Registered!");
                            window.location.reload();
                        }}
                    />
                </div>
                <div className="neo-box p-8 bg-white">
                    <CommentSection
                        comments={comments}
                        onAddComment={handleAddComment}
                    />
                </div>
            </div>

            {/* Similar dApps */}
            {similarDApps.length > 0 && (
                <div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase mb-4 sm:mb-6 md:mb-8 tracking-tighter">Similar dApps</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {similarDApps.map(similar => (
                            <DAppCard key={similar.id} dapp={similar} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
