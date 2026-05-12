import { useState } from 'react';
import { useDApps } from '../hooks/useDApps';
import { formatNumber, formatCurrency } from '../utils';
import { TrendingUp, TrendingDown, Star, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SortOption, TimeFilter } from '../types';

export default function RankingsPage() {
    const [sortBy, setSortBy] = useState<SortOption>('rank');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');

    const { data: dapps, isLoading, error } = useDApps();

    const sortedDApps = [...(dapps || [])].sort((a, b) => {
        switch (sortBy) {
            case 'users':
                return b.metrics.users24h - a.metrics.users24h;
            case 'volume':
                return b.metrics.volume24h - a.metrics.volume24h;
            case 'tvl':
                return (b.metrics.tvl || 0) - (a.metrics.tvl || 0);
            case 'rating':
                return b.rating - a.rating;
            case 'new':
                return new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime();
            default:
                return a.rank - b.rank;
        }
    });

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
                <div className="bg-red-100 border-2 border-red-500 text-red-700 p-6 font-bold flex items-center space-x-3">
                    <AlertTriangle className="w-6 h-6" />
                    <span>Error loading rankings: {error.message}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-2 tracking-tighter">dApp Rankings</h1>
                <p className="text-base sm:text-lg md:text-xl font-medium text-gray-600 border-l-2 sm:border-l-4 border-neo-pink pl-3 sm:pl-4">Discover the top performing dApps on Sui</p>
            </div>

            {/* Filters */}
            <div className="neo-box p-4 sm:p-6 bg-white mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                        <span className="text-xs sm:text-sm font-black uppercase text-gray-500 whitespace-nowrap">Sort by:</span>
                        <div className="flex flex-wrap gap-2">
                            {(['rank', 'users', 'volume', 'tvl', 'rating'] as SortOption[]).map((option) => (
                                <button
                                    key={option}
                                    onClick={() => setSortBy(option)}
                                    className={`px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-neo-black text-xs sm:text-sm font-bold uppercase transition-all shadow-neo-sm ${sortBy === option
                                        ? 'bg-neo-black text-white'
                                        : 'bg-white hover:bg-neo-yellow text-neo-black'
                                        }`}
                                >
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <span className="text-xs sm:text-sm font-black uppercase text-gray-500 whitespace-nowrap">Time:</span>
                        <div className="flex gap-2">
                            {(['24h', '7d', '30d', 'all'] as TimeFilter[]).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setTimeFilter(filter)}
                                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 border-2 border-neo-black text-xs sm:text-sm font-bold uppercase transition-all shadow-neo-sm ${timeFilter === filter
                                        ? 'bg-neo-green text-neo-black'
                                        : 'bg-white hover:bg-neo-cyan text-neo-black'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Rankings Table */}
            <div className="neo-box bg-white overflow-hidden">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-neo-yellow border-b-2 sm:border-b-3 border-neo-black">
                            <tr>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-black uppercase text-neo-black">Rank</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-black uppercase text-neo-black">dApp</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-black uppercase text-neo-black hidden md:table-cell">Category</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm font-black uppercase text-neo-black">Users</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm font-black uppercase text-neo-black hidden sm:table-cell">Volume</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm font-black uppercase text-neo-black hidden lg:table-cell">TVL</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm font-black uppercase text-neo-black hidden md:table-cell">Rating</th>
                                <th className="px-3 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm font-black uppercase text-neo-black">Change</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-neo-black">
                            {sortedDApps.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-bold uppercase">
                                        No dApps found
                                    </td>
                                </tr>
                            ) : (
                                sortedDApps.map((dapp, index) => (
                                    <tr key={dapp.id} className="hover:bg-neo-white transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-black text-xl">#{index + 1}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link to={`/dapp/${dapp.id}`} className="flex items-center space-x-3">
                                                <div className="w-12 h-12 bg-white border-2 border-neo-black flex items-center justify-center text-2xl shadow-neo-sm group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all overflow-hidden">
                                                    {dapp.iconUrl ? (
                                                        <img src={dapp.iconUrl} alt={dapp.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>💧</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg uppercase text-neo-black group-hover:text-neo-blue transition-colors">
                                                        {dapp.name}
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-500">{dapp.tagline}</div>
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-neo-cyan border-2 border-neo-black text-neo-black text-xs font-bold uppercase shadow-neo-sm">
                                                {dapp.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-neo-black">
                                            {formatNumber(dapp.metrics.users24h)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-neo-black">
                                            {formatCurrency(dapp.metrics.volume24h)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-neo-black">
                                            {dapp.metrics.tvl ? formatCurrency(dapp.metrics.tvl) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                <Star className="w-4 h-4 text-neo-black fill-neo-black" />
                                                <span className="font-black">{dapp.rating.toFixed(1)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`flex items-center justify-end space-x-1 font-black ${dapp.rankChange > 0 ? 'text-green-600' : dapp.rankChange < 0 ? 'text-red-600' : 'text-gray-400'
                                                }`}>
                                                {dapp.rankChange > 0 && <TrendingUp className="w-5 h-5" />}
                                                {dapp.rankChange < 0 && <TrendingDown className="w-5 h-5" />}
                                                {dapp.rankChange !== 0 && <span>{Math.abs(dapp.rankChange)}</span>}
                                                {dapp.rankChange === 0 && <span>-</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
