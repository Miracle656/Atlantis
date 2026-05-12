import { useState, useEffect } from 'react';
import { Star, CheckCircle2, MoreVertical, Loader2 } from 'lucide-react';
import type { Review } from '../types';
import DisplayName from './DisplayName';
import { fetchFromWalrus } from '../walrus';

interface ReviewItemProps {
    review: Review;
}

export default function ReviewItem({ review }: ReviewItemProps) {
    const [content, setContent] = useState(review.content);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If content is empty but we have a blob ID, fetch it
        if (!content && review.contentBlobId) {
            const fetchContent = async () => {
                try {
                    setIsLoading(true);
                    const text = await fetchFromWalrus(review.contentBlobId!);
                    if (text) {
                        setContent(text);
                    } else {
                        setError("Content unavailable");
                    }
                } catch (err) {
                    console.error("Failed to fetch review content:", err);
                    setError("Failed to load review content.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchContent();
        }
    }, [review.contentBlobId, content]);

    return (
        <div className="neo-box p-6 bg-white">
            <div className="flex items-center justify-between mb-4 border-b-2 border-neo-black pb-2">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-neo-yellow border-2 border-neo-black flex items-center justify-center text-sm font-bold">
                        {review.userAvatar}
                    </div>
                    <DisplayName name={review.userName} className="font-bold text-neo-black uppercase" />
                    {review.verified && (
                        <div className="flex items-center space-x-1 bg-neo-green px-2 py-0.5 border-2 border-neo-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">Verified</span>
                        </div>
                    )}
                </div>
                <button className="text-neo-black hover:bg-neo-pink border-2 border-transparent hover:border-neo-black p-1 transition-all">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>

            <div className="flex items-center space-x-2 mb-3">
                <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? 'text-neo-black fill-neo-black' : 'text-gray-300'}`}
                        />
                    ))}
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase">{new Date(review.date).toLocaleDateString()}</span>
            </div>

            {isLoading ? (
                <div className="flex items-center space-x-2 text-gray-500 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-bold uppercase">Loading review content...</span>
                </div>
            ) : error ? (
                <p className="text-red-500 font-bold text-sm mb-4">{error}</p>
            ) : (
                <p className="text-neo-black font-medium text-sm leading-relaxed mb-4 border-l-4 border-neo-pink pl-4">
                    {content || "No content provided."}
                </p>
            )}

            <div className="flex items-center space-x-4">
                <div className="text-xs font-bold text-gray-500 uppercase">
                    {review.helpful} people found this helpful
                </div>
                <div className="flex space-x-2">
                    <button className="px-4 py-1 border-2 border-neo-black text-xs font-bold uppercase hover:bg-neo-green hover:shadow-neo-sm transition-all">
                        Yes
                    </button>
                    <button className="px-4 py-1 border-2 border-neo-black text-xs font-bold uppercase hover:bg-neo-red hover:text-white hover:shadow-neo-sm transition-all">
                        No
                    </button>
                </div>
            </div>
        </div>
    );
}
