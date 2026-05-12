import { useState, useEffect, useRef } from 'react';
import { Star, Send, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSubmitReview } from '../hooks/useSubmitReview';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';

interface ReviewFormProps {
    dappId: string;
    dappName?: string;
    packageId?: string | null;
    onReviewSubmitted?: (review: { rating: number; title: string; content: string; verified: boolean }) => void;
}

export default function ReviewForm({ dappId, dappName, packageId, onReviewSubmitted }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // Interaction check state
    const [hasInteracted, setHasInteracted] = useState<boolean | null>(null);
    const [isCheckingInteraction, setIsCheckingInteraction] = useState(false);
    const verificationAttempted = useRef<string | null>(null);

    const account = useCurrentAccount();
    const client = useSuiClient();
    const { submitReview, isUploading } = useSubmitReview();

    // Check for user interactions when account or packageId changes
    useEffect(() => {
        const checkInteraction = async () => {
            if (!account || !packageId) {
                setHasInteracted(null);
                return;
            }

            setIsCheckingInteraction(true);
            try {
                // Query transactions where the user is the sender and the package is involved
                const result = await client.queryTransactionBlocks({
                    filter: {
                        FromAddress: account.address,
                    },
                    options: {
                        showInput: true,
                        showEffects: true,
                    },
                    limit: 50, // Check last 50 transactions
                });

                // Check if any transaction interacts with the package
                // This is a simplified check - in production you'd want a more robust indexer
                const interacted = result.data.some(tx => {
                    // Check if package ID appears in inputs or effects
                    const txString = JSON.stringify(tx);
                    return txString.includes(packageId);
                });

                setHasInteracted(interacted);

                // --- NEW: If interacted, call backend to verify on-chain ---
                if (interacted) {
                    if (verificationAttempted.current === packageId) {
                        return; // Already attempted for this package
                    }
                    verificationAttempted.current = packageId;

                    console.log("Interaction detected! Requesting backend verification...");
                    // We don't await this to keep UI responsive, it happens in background
                    import('../services/api').then(({ verifyUser }) => {
                        verifyUser(account.address, dappId, packageId)
                            .then((res: any) => {
                                console.log("Verification result:", res);
                                if (res.verified) {
                                    // Could trigger a refetch or toast here if needed
                                    console.log("User successfully verified on-chain!");
                                }
                            })
                            .catch((err: any) => console.error("Verification call failed:", err));
                    });
                }
            } catch (error) {
                console.error("Failed to check interactions:", error);
                setHasInteracted(null);
            } finally {
                setIsCheckingInteraction(false);
            }
        };

        checkInteraction();
    }, [account, packageId, client]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0 || !account) return;

        // Use FULL wallet address as username so DisplayName can resolve SuiNS
        const userName = account.address;

        submitReview(
            dappId,
            rating,
            title,
            content,
            userName,
            dappName,
            () => {
                // On Success
                if (onReviewSubmitted) {
                    onReviewSubmitted({
                        rating,
                        title,
                        content,
                        verified: hasInteracted === true
                    });
                }
                setRating(0);
                setTitle('');
                setContent('');
            }
        );
    };

    if (!account) {
        return (
            <div className="neo-box p-6 bg-white text-center">
                <p className="font-bold text-neo-black mb-4">Connect your wallet to leave a review</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="neo-box p-6 bg-white space-y-4">
            <h3 className="text-xl font-black uppercase text-neo-black">Write a Review</h3>

            {/* Interaction Status Banner */}
            {packageId && (
                <div className={`p-3 border-2 ${hasInteracted ? 'bg-neo-green/10 border-neo-green' : 'bg-neo-yellow/10 border-neo-yellow'} flex items-start gap-3`}>
                    {isCheckingInteraction ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    ) : hasInteracted ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-neo-green flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-neo-green uppercase">Verified User</p>
                                <p className="text-xs text-gray-600 font-medium">We found your on-chain interactions with this dApp.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="w-5 h-5 text-neo-yellow flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-neo-yellow uppercase">Unverified User</p>
                                <p className="text-xs text-gray-600 font-medium">
                                    We couldn't find recent interactions with this dApp. Your review will be marked as unverified.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <label className="block text-sm font-bold uppercase text-gray-500">Rating</label>
                <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="focus:outline-none transition-transform hover:scale-110"
                        >
                            <Star
                                className={`w-8 h-8 ${star <= (hoverRating || rating)
                                    ? 'text-neo-black fill-neo-black'
                                    : 'text-gray-300'
                                    }`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-bold uppercase text-gray-500">Title</label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-neo-white border-2 border-neo-black p-3 text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                    placeholder="Summarize your experience"
                    required
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="content" className="block text-sm font-bold uppercase text-gray-500">Review</label>
                <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-neo-white border-2 border-neo-black p-3 text-neo-black focus:outline-none focus:shadow-neo transition-all h-32 resize-none font-medium placeholder-gray-500"
                    placeholder="Tell us more about your experience..."
                    required
                />
            </div>

            <button
                type="submit"
                disabled={rating === 0 || !title || !content || isUploading}
                className="w-full bg-neo-black hover:bg-neo-white hover:text-neo-black border-2 border-neo-black hover:shadow-neo disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase py-3 px-4 transition-all flex items-center justify-center space-x-2"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        <span>Submit Review</span>
                    </>
                )}
            </button>
        </form>
    );
}
