import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNumber, formatCurrency } from '../utils';
import type { DApp } from '../types';

interface FeaturedDAppsProps {
    dapps: DApp[];
}

export default function FeaturedDApps({ dapps }: FeaturedDAppsProps) {
    // Filter featured dApps from real data
    const featured = dapps.filter(dapp => dapp.isFeatured).slice(0, 3);

    if (featured.length === 0) return null;

    return (
        <section className="mb-8 sm:mb-12">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="bg-neo-orange p-1.5 sm:p-2 border-2 border-neo-black shadow-neo-sm flex-shrink-0">
                    <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter">Featured dApps</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {featured.map((dapp) => (
                    <Link
                        key={dapp.id}
                        to={`/dapp/${dapp.id}`}
                        className="group relative neo-box neo-box-hover overflow-hidden block bg-white"
                    >
                        {/* Background Image */}
                        <div className="absolute inset-0 h-24 sm:h-32 bg-neo-black border-b-2 sm:border-b-3 border-neo-black">
                            {dapp.bannerUrl && (
                                <img
                                    src={dapp.bannerUrl}
                                    alt={dapp.name}
                                    className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-300"
                                />
                            )}
                        </div>

                        {/* Content */}
                        <div className="relative pt-16 sm:pt-20 px-4 sm:px-6 pb-4 sm:pb-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-neo-white border-2 sm:border-3 border-neo-black shadow-neo mb-3 sm:mb-4 flex items-center justify-center text-2xl sm:text-3xl relative z-10 overflow-hidden">
                                {dapp.iconUrl ? (
                                    <img src={dapp.iconUrl} alt={dapp.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span>💧</span>
                                )}
                            </div>

                            <h3 className="text-lg sm:text-xl md:text-2xl font-black mb-2 uppercase group-hover:text-neo-purple transition-colors">
                                {dapp.name}
                            </h3>
                            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-4 sm:mb-6 line-clamp-2 border-l-2 border-neo-black pl-2 sm:pl-3">
                                {dapp.tagline}
                            </p>

                            <div className="flex items-center justify-between text-sm bg-neo-white border-2 border-neo-black p-2 sm:p-3 shadow-neo-sm">
                                <div>
                                    <div className="text-gray-500 font-bold uppercase text-[10px] sm:text-xs">Users</div>
                                    <div className="font-black text-xs sm:text-sm">{formatNumber(dapp.metrics.users24h)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-gray-500 font-bold uppercase text-[10px] sm:text-xs">Volume</div>
                                    <div className="font-black text-xs sm:text-sm">{formatCurrency(dapp.metrics.volume24h)}</div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
