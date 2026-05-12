import { MessageSquare, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrendingDiscussions } from '../hooks/useTrendingDiscussions';

export const TrendingDiscussions = () => {
    const { data: discussions, isLoading, error } = useTrendingDiscussions();
    return (
        <div className="bg-white border-4 border-black p-6 sticky top-24">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary p-2">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-black">TRENDING DISCUSSIONS</h2>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="text-sm text-red-600 py-4">
                    Failed to load discussions
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && (!discussions || discussions.length === 0) && (
                <div className="text-sm text-gray-500 py-4">
                    No discussions yet. Be the first to review a dApp!
                </div>
            )}

            {/* Discussions List */}
            {!isLoading && !error && discussions && discussions.length > 0 && (
                <div className="space-y-4">
                    {discussions.slice(0, 5).map((discussion, index) => (
                        <Link
                            key={discussion.id}
                            to={`/dapp/${discussion.dappId}#discussions`}
                            className="block group"
                        >
                            <div className="border-l-4 border-primary pl-3 hover:border-secondary transition-colors">
                                {/* Discussion Number */}
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl font-black text-gray-300 group-hover:text-primary transition-colors">
                                        {index + 1}
                                    </span>
                                    <div className="flex-1">
                                        {/* dApp Name */}
                                        <div className="text-xs font-bold text-primary mb-1">
                                            p/{discussion.dappName.toLowerCase().replace(/\s+/g, '')}
                                        </div>

                                        {/* Discussion Title */}
                                        <h3 className="font-bold text-sm leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                            {discussion.title}
                                        </h3>

                                        {/* Meta Info */}
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                <span className="font-bold">{discussion.upvotes}</span>
                                            </div>
                                            {discussion.commentCount > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span>{discussion.commentCount}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{discussion.timeAgo}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* View All Link */}
            <Link
                to="/discussions"
                className="block mt-6 text-center py-2 px-4 bg-black text-white font-bold hover:bg-primary transition-colors border-2 border-black"
            >
                VIEW ALL DISCUSSIONS →
            </Link>
        </div>
    );
};
