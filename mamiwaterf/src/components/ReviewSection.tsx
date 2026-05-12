import { useState } from 'react';
import type { Review, DApp } from '../types';
import ReviewForm from './ReviewForm';
import ReviewItem from './ReviewItem';
import { Star, Database, Loader2 } from 'lucide-react';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { createRegisterDAppTransaction } from '../utils/autoRegisterDApps';
import { useToast } from './Toast';
import { ADMIN_ADDRESS } from '../constants';

interface ReviewSectionProps {
    dapp: DApp;
    isRegistered: boolean;
    reviews: Review[];
    rating: number;
    reviewCount: number;
    onReviewSubmitted?: (review: { rating: number; title: string; content: string; verified: boolean }) => void;
    onRegisterSuccess?: () => void;
}

export default function ReviewSection({ dapp, isRegistered, reviews, rating, reviewCount, onReviewSubmitted, onRegisterSuccess }: ReviewSectionProps) {
    const [sortBy] = useState<'recent' | 'helpful'>('recent');
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const account = useCurrentAccount();
    const [isRegistering, setIsRegistering] = useState(false);
    const { success, error } = useToast();

    // Calculate rating distribution
    const distribution = [5, 4, 3, 2, 1].map(star => {
        const count = reviews.filter(r => Math.round(r.rating) === star).length;
        const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
        return { star, count, percentage };
    });

    const sortedReviews = [...reviews].sort((a, b) => {
        if (sortBy === 'recent') {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return b.helpful - a.helpful;
    });

    const handleRegister = () => {
        setIsRegistering(true);
        try {
            const tx = createRegisterDAppTransaction(dapp);

            signAndExecuteTransaction(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        console.log("dApp registered:", result);
                        success("dApp registered successfully! You can now leave a review.");
                        setIsRegistering(false);
                        if (onRegisterSuccess) onRegisterSuccess();
                    },
                    onError: (err) => {
                        console.error("Registration failed:", err);
                        error("Failed to register dApp. Please try again.");
                        setIsRegistering(false);
                    }
                }
            );
        } catch (err) {
            console.error("Error creating transaction:", err);
            error("Failed to create registration transaction.");
            setIsRegistering(false);
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-neo-black">Ratings and reviews</h2>

            <div className="flex flex-col gap-8 items-start">
                {/* Rating Summary */}
                <div className="w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 neo-box p-6 bg-white">
                        <div className="text-center sm:text-left flex-shrink-0">
                            <div className="text-6xl font-black text-neo-black mb-1">{rating.toFixed(1)}</div>
                            <div className="flex justify-center sm:justify-start mb-1 space-x-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`w-4 h-4 ${i < Math.round(rating) ? 'text-neo-black fill-neo-black' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                            <div className="text-sm font-bold uppercase text-gray-500">{reviewCount} reviews</div>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                            {distribution.map(({ star, percentage }) => (
                                <div key={star} className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-neo-black w-3">{star}</span>
                                    <div className="flex-1 h-4 bg-neo-white border-2 border-neo-black">
                                        <div
                                            className="h-full bg-neo-green border-r-2 border-neo-black"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Review Form & List */}
                <div className="w-full space-y-6">
                    {!isRegistered ? (
                        <div className="neo-box p-6 bg-neo-yellow border-3 border-neo-black text-center">
                            <Database className="w-12 h-12 mx-auto mb-4 text-neo-black" />
                            <h3 className="text-xl font-black uppercase mb-2">Registration Required</h3>

                            {account && account.address === ADMIN_ADDRESS ? (
                                <>
                                    <p className="text-neo-black font-medium mb-6">
                                        This dApp needs to be registered on-chain before users can leave reviews.
                                        As an admin, you can register it now.
                                    </p>
                                    <button
                                        onClick={handleRegister}
                                        disabled={isRegistering}
                                        className="px-8 py-3 bg-neo-black text-white border-3 border-neo-black shadow-neo font-black uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#888888] transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                                    >
                                        {isRegistering ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Registering...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Register {dapp.name}</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <p className="text-neo-black font-medium">
                                    This dApp has not been registered for reviews yet.
                                    Please check back later or contact the platform administrator.
                                </p>
                            )}
                        </div>
                    ) : (
                        <ReviewForm
                            dappId={dapp.id}
                            dappName={dapp.name}
                            packageId={dapp.packageId}
                            onReviewSubmitted={onReviewSubmitted}
                        />
                    )}

                    <div className="space-y-6">
                        {sortedReviews.map((review) => (
                            <ReviewItem key={review.id} review={review} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
