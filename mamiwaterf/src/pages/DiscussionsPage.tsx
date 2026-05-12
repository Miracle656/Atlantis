import { useTrendingDiscussions } from '../hooks/useTrendingDiscussions';
import { Link } from 'react-router-dom';
import { MessageSquare, TrendingUp, Clock, Loader2, ArrowLeft } from 'lucide-react';

export default function DiscussionsPage() {
    const { data: discussions, isLoading, error } = useTrendingDiscussions();

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-primary hover:text-secondary mb-4 font-bold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary p-3 border-3 border-black">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-4xl font-black uppercase">All Discussions</h1>
                </div>
                <p className="text-gray-600 font-medium">
                    Browse all reviews and comments from the community
                </p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-100 border-4 border-red-500 text-red-700 p-6 font-bold">
                    Failed to load discussions. Please try again later.
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && (!discussions || discussions.length === 0) && (
                <div className="text-center py-12 bg-white border-4 border-black p-8">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-xl font-bold text-gray-600">No discussions yet</p>
                    <p className="text-gray-500 mt-2">Be the first to review a dApp!</p>
                </div>
            )}

            {/* Discussions List */}
            {!isLoading && !error && discussions && discussions.length > 0 && (
                <div className="space-y-4">
                    {discussions.map((discussion, index) => (
                        <Link
                            key={discussion.id}
                            to={`/dapp/${discussion.dappId}#discussions`}
                            className="block bg-white border-4 border-black p-6 hover:shadow-neo transition-all group"
                        >
                            <div className="flex gap-4">
                                {/* Rank */}
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-primary border-3 border-black flex items-center justify-center">
                                        <span className="text-2xl font-black text-white">
                                            {index + 1}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* dApp Name */}
                                    <div className="text-sm font-bold text-primary mb-2">
                                        p/{discussion.dappName.toLowerCase().replace(/\s+/g, '')}
                                    </div>

                                    {/* Discussion Title */}
                                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                                        {discussion.title}
                                    </h3>

                                    {/* Meta Info */}
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold">by</span>
                                            <span className="font-mono">{discussion.authorName}</span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="font-bold">{discussion.upvotes}</span>
                                        </div>

                                        {discussion.commentCount > 0 && (
                                            <div className="flex items-center gap-1">
                                                <MessageSquare className="w-4 h-4" />
                                                <span>{discussion.commentCount}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{discussion.timeAgo}</span>
                                        </div>

                                        {/* Type Badge */}
                                        <div className={`px-2 py-1 text-xs font-bold border-2 border-black ${discussion.type === 'review'
                                                ? 'bg-yellow-300'
                                                : 'bg-blue-300'
                                            }`}>
                                            {discussion.type.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
