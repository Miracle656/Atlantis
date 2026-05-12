import { ArrowRight, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DApp } from '../types';
import { formatNumber } from '../utils';

interface TrendingDashboardProps {
    dapps: DApp[];
}

export default function TrendingDashboard({ dapps }: TrendingDashboardProps) {
    // Top UAW: Sort by users24h
    const topUAW = [...dapps]
        .sort((a, b) => b.metrics.users24h - a.metrics.users24h)
        .slice(0, 3);

    // Top Growth: Sort by rank_change (positive first) or volume as a proxy
    // For now, let's use volume as a proxy for "Growth" / Value
    const topGrowth = [...dapps]
        .sort((a, b) => b.metrics.volume24h - a.metrics.volume24h)
        .slice(0, 3);

    // Chains: Keep static for now as it represents market overview, 
    // or we could replace with "Top Categories" later.
    // REMOVED - Only dealing with Sui

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
            {/* Top UAW */}
            <div className="neo-box p-4 sm:p-6 bg-white">
                <div className="flex items-center justify-between mb-4 sm:mb-6 border-b-2 sm:border-b-3 border-neo-black pb-2">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <h3 className="font-black text-base sm:text-lg md:text-xl uppercase">Top UAW</h3>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-neo-black" />
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] sm:text-xs font-bold uppercase bg-neo-yellow px-1.5 sm:px-2 py-0.5 sm:py-1 border-2 border-neo-black">
                        <span className="hidden sm:inline">Users (24h)</span>
                        <span className="sm:hidden">Users</span>
                        <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                    {topUAW.length > 0 ? topUAW.map((dapp) => (
                        <Link to={`/dapp/${dapp.id}`} key={dapp.id} className="flex items-center justify-between group cursor-pointer hover:bg-neo-pink hover:text-white p-2 sm:p-3 border-2 border-transparent hover:border-neo-black hover:shadow-neo-sm transition-all">
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neo-white border-2 border-neo-black flex items-center justify-center text-lg sm:text-xl shadow-neo-sm group-hover:shadow-none transition-all overflow-hidden flex-shrink-0">
                                    {dapp.iconUrl ? <img src={dapp.iconUrl} alt={dapp.name} className="w-full h-full object-cover" /> : '💧'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-neo-black group-hover:text-white uppercase text-sm sm:text-base truncate">{dapp.name}</div>
                                    <div className="text-[10px] sm:text-xs font-medium text-gray-500 group-hover:text-neo-black truncate">{dapp.category}</div>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <div className="text-neo-green font-black group-hover:text-white text-shadow-sm text-xs sm:text-sm">{formatNumber(dapp.metrics.users24h)}</div>
                                <div className="text-[10px] sm:text-xs font-bold text-gray-500 group-hover:text-neo-black">Users</div>
                            </div>
                        </Link>
                    )) : (
                        <div className="text-center py-4 text-gray-500 font-bold text-sm">No data available</div>
                    )}
                </div>
            </div>

            {/* Top Volume (formerly Growth) */}
            <div className="neo-box p-4 sm:p-6 bg-white">
                <div className="flex items-center justify-between mb-4 sm:mb-6 border-b-2 sm:border-b-3 border-neo-black pb-2">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <h3 className="font-black text-base sm:text-lg md:text-xl uppercase">Top Volume</h3>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-neo-black" />
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] sm:text-xs font-bold uppercase bg-neo-green px-1.5 sm:px-2 py-0.5 sm:py-1 border-2 border-neo-black">
                        <span className="hidden sm:inline">Volume (24h)</span>
                        <span className="sm:hidden">Volume</span>
                        <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                    {topGrowth.length > 0 ? topGrowth.map((dapp) => (
                        <Link to={`/dapp/${dapp.id}`} key={dapp.id} className="flex items-center justify-between group cursor-pointer hover:bg-neo-cyan hover:text-white p-2 sm:p-3 border-2 border-transparent hover:border-neo-black hover:shadow-neo-sm transition-all">
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neo-white border-2 border-neo-black flex items-center justify-center text-lg sm:text-xl shadow-neo-sm group-hover:shadow-none transition-all overflow-hidden flex-shrink-0">
                                    {dapp.iconUrl ? <img src={dapp.iconUrl} alt={dapp.name} className="w-full h-full object-cover" /> : '💧'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-neo-black group-hover:text-white uppercase text-sm sm:text-base truncate">{dapp.name}</div>
                                    <div className="text-[10px] sm:text-xs font-medium text-gray-500 group-hover:text-neo-black truncate">{dapp.category}</div>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <div className="text-neo-green font-black group-hover:text-white text-shadow-sm text-xs sm:text-sm">${formatNumber(dapp.metrics.volume24h)}</div>
                                <div className="text-[10px] sm:text-xs font-bold text-gray-500 group-hover:text-neo-black">Vol</div>
                            </div>
                        </Link>
                    )) : (
                        <div className="text-center py-4 text-gray-500 font-bold text-sm">No data available</div>
                    )}
                </div>
            </div>
        </div>
    );
}
