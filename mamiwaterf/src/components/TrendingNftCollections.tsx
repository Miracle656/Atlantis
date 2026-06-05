import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Loader2, BadgeCheck, TrendingUp } from 'lucide-react';
import { useTrendingNftCollections } from '../hooks/useNftCollections';
import { collectionCover, mistToSui, type TrendingPeriod } from '../utils/tradeport';
import { formatNumber } from '../utils';

const PERIODS: { label: string; value: TrendingPeriod }[] = [
    { label: '24H', value: 'days_1' },
    { label: '7D', value: 'days_7' },
    { label: '30D', value: 'days_30' },
];

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

export default function TrendingNftCollections() {
    const [period, setPeriod] = useState<TrendingPeriod>('days_1');
    const { data, isLoading, isError } = useTrendingNftCollections({ period, trendingBy: 'usd_volume', limit: 12 });

    const rows = data ?? [];

    return (
        <div className="mb-8 sm:mb-12">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neo-violet border-2 sm:border-3 border-neo-black rounded-xl shadow-neo flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter text-neo-black leading-none">
                            Trending NFTs
                        </h2>
                        <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Top Sui collections by volume · via TradePort
                        </p>
                    </div>
                </div>

                {/* Period toggle */}
                <div className="flex items-center gap-0 border-2 border-neo-black rounded-lg overflow-hidden shadow-neo-sm">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3 py-1.5 text-xs font-black uppercase transition-colors ${period === p.value ? 'bg-neo-lime text-neo-black' : 'bg-white text-gray-500 hover:bg-neo-lime-soft'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 justify-center py-12 text-gray-500 font-bold">
                    <Loader2 className="w-6 h-6 animate-spin" /> Loading collections…
                </div>
            )}

            {isError && (
                <div className="neo-box bg-white p-6 text-center font-bold text-gray-500">
                    Couldn't load NFT collections right now.
                </div>
            )}

            {!isLoading && !isError && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {rows.map((row, i) => {
                        const c = row.collection;
                        const cover = collectionCover(c);
                        return (
                            <Link
                                key={c.id}
                                to={`/nft/${c.id}`}
                                className="neo-box neo-box-hover bg-white overflow-hidden group cursor-pointer"
                            >
                                {/* Cover */}
                                <div className="relative h-32 sm:h-40 border-b-2 border-neo-black bg-neo-white overflow-hidden">
                                    {cover ? (
                                        <img
                                            src={cover}
                                            alt={c.title}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => { (e.currentTarget.style.display = 'none'); }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl">🖼️</div>
                                    )}
                                    <div className="absolute top-2 left-2 w-7 h-7 bg-neo-lime-soft border-2 border-neo-black rounded-lg flex items-center justify-center font-black text-xs shadow-neo-sm">
                                        #{i + 1}
                                    </div>
                                    {c.verified && (
                                        <div className="absolute top-2 right-2 bg-neo-violet border-2 border-neo-black rounded-md p-1 shadow-neo-sm" title="Verified">
                                            <BadgeCheck className="w-4 h-4 text-neo-black" />
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="p-3 sm:p-4">
                                    <h3 className="font-black uppercase text-sm sm:text-base truncate group-hover:text-neo-violet transition-colors">
                                        {c.title}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase mb-3">
                                        {c.supply ? `${formatNumber(c.supply)} items` : 'Sui collection'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="border-2 border-neo-black rounded-lg px-2 py-1.5 bg-neo-white">
                                            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500">Floor</div>
                                            <div className="font-black text-xs sm:text-sm truncate">{fmtSui(c.floor)}</div>
                                        </div>
                                        <div className="border-2 border-neo-black rounded-lg px-2 py-1.5 bg-neo-white">
                                            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500 flex items-center gap-0.5">
                                                <TrendingUp className="w-2.5 h-2.5" /> Vol
                                            </div>
                                            <div className="font-black text-xs sm:text-sm truncate">{fmtUsd(row.current_usd_volume)}</div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    {rows.length === 0 && (
                        <div className="col-span-full neo-box bg-white p-8 text-center font-bold text-gray-500">
                            No trending collections for this period.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
