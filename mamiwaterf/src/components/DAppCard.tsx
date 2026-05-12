import { useNavigate } from 'react-router-dom';
import type { DApp } from '../types';
import { formatNumber, formatCurrency } from '../utils';
import { TrendingUp, TrendingDown, Users, DollarSign, ArrowUpRight, Sparkles, Info } from 'lucide-react';
import { useMiniApp } from '../context/MiniAppContext';

interface DAppCardProps {
    dapp: DApp;
    rank?: number;
}

export default function DAppCard({ dapp, rank }: DAppCardProps) {
    const { openMiniApp } = useMiniApp();
    const navigate = useNavigate();

    const handleCardClick = (e: React.MouseEvent) => {
        e.preventDefault();
        openMiniApp(dapp);
    };

    const handleInfoClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/dapp/${dapp.id}`);
    };

    return (
        <div
            onClick={handleCardClick}
            className="block neo-box neo-box-hover group cursor-pointer relative bg-white w-full"
        >
            {/* Banner Image */}
            <div className="relative h-24 sm:h-32 overflow-hidden border-b-2 sm:border-b-3 border-neo-black bg-neo-white">
                {dapp.bannerUrl && (
                    <img
                        src={dapp.bannerUrl}
                        alt={dapp.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    />
                )}
                {dapp.isNew && (
                    <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-neo-green border-2 border-neo-black shadow-neo-sm text-[10px] sm:text-xs font-bold flex items-center space-x-0.5 sm:space-x-1 uppercase">
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>NEW</span>
                    </div>
                )}
                {rank && (
                    <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 w-7 h-7 sm:w-8 sm:h-8 bg-neo-yellow border-2 border-neo-black shadow-neo-sm flex items-center justify-center font-bold text-neo-black text-xs sm:text-sm">
                        #{rank}
                    </div>
                )}

                {/* Info Button (Go to Detail Page) */}
                <button
                    onClick={handleInfoClick}
                    className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 p-1 sm:p-1.5 bg-white border-2 border-neo-black shadow-neo-sm text-neo-black hover:bg-neo-pink transition-colors z-10"
                    title="View Details"
                >
                    <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
            </div>

            <div className="p-3 sm:p-4">
                {/* Icon and Title */}
                <div className="flex items-start space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neo-white border-2 border-neo-black flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-neo-sm overflow-hidden">
                        {dapp.iconUrl ? (
                            <img src={dapp.iconUrl} alt={dapp.name} className="w-full h-full object-cover" />
                        ) : (
                            <span>💧</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-base sm:text-lg truncate uppercase group-hover:text-neo-purple transition-colors">
                            {dapp.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate font-medium">{dapp.tagline}</p>
                    </div>
                </div>

                {/* Category Badge */}
                <div className="mb-2 sm:mb-3">
                    <span className="inline-block px-2 py-1 bg-neo-cyan border-2 border-neo-black text-neo-black text-xs font-bold uppercase shadow-neo-sm">
                        {dapp.category}
                    </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="flex items-start space-x-1 sm:space-x-2 text-sm">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-neo-black flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <div className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase">Users 24h</div>
                            <div className="font-bold text-neo-black text-xs sm:text-sm truncate">{formatNumber(dapp.metrics.users24h)}</div>
                        </div>
                    </div>
                    <div className="flex items-start space-x-1 sm:space-x-2 text-sm">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-neo-black flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <div className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase">Volume 24h</div>
                            <div className="font-bold text-neo-black text-xs sm:text-sm truncate">{formatCurrency(dapp.metrics.volume24h)}</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t-2 sm:border-t-3 border-neo-black">
                    <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
                        {/* Platform Rating (On-chain reviews) */}
                        <div className="flex flex-col">
                            <div className="flex items-center space-x-1">
                                <span className="text-neo-black text-sm">⭐</span>
                                <span className="font-bold text-neo-black text-xs sm:text-sm">
                                    {dapp.rating > 0 ? dapp.rating.toFixed(1) : 'N/A'}
                                </span>
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium">Platform</span>
                        </div>

                        {/* Blockberry Rating (External) */}
                        {dapp.blockberryRating && (
                            <div className="flex flex-col">
                                <div className="flex items-center space-x-1">
                                    <span className="text-neo-black text-sm">🌐</span>
                                    <span className="font-bold text-neo-black text-xs sm:text-sm">
                                        {dapp.blockberryRating.toFixed(1)}
                                    </span>
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium">External</span>
                            </div>
                        )}

                        {/* Upvotes */}
                        <div className="flex items-center space-x-1">
                            <span className="text-neo-black text-sm">🔼</span>
                            <span className="font-bold text-neo-black text-xs sm:text-sm">{formatNumber(dapp.upvotes)}</span>
                        </div>
                    </div>
                    <div className={`flex items-center space-x-1 text-xs sm:text-sm font-bold ${dapp.rankChange > 0 ? 'text-green-600' : dapp.rankChange < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                        {dapp.rankChange > 0 && <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />}
                        {dapp.rankChange < 0 && <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                        {dapp.rankChange !== 0 && <span>{Math.abs(dapp.rankChange)}</span>}
                    </div>
                </div>

                {/* Hover Effect */}
                <div className="mt-2 sm:mt-3 flex items-center justify-center bg-neo-black text-neo-white py-1 sm:py-1.5 font-bold uppercase text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-opacity border-2 border-neo-black">
                    <span>Open App</span>
                    <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </div>
            </div>
        </div>
    );
}
