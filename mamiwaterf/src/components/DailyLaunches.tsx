import DAppCard from './DAppCard';
import { Sparkles } from 'lucide-react';
import type { DApp } from '../types';

interface DailyLaunchesProps {
    dapps: DApp[];
}

export default function DailyLaunches({ dapps }: DailyLaunchesProps) {
    const newDApps = dapps
        .filter(dapp => dapp.isNew)
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, 5);

    if (newDApps.length === 0) return null;

    return (
        <section className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-neo-cyan p-2 border-2 border-neo-black shadow-neo-sm">
                    <Sparkles className="w-6 h-6 text-neo-black" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Launched This Week</h2>
            </div>

            <div className="space-y-6">
                {newDApps.map((dapp, index) => (
                    <div key={dapp.id} className="flex items-center space-x-4 group">
                        <div className="flex-shrink-0 w-12 h-12 bg-neo-yellow border-2 border-neo-black shadow-neo-sm flex items-center justify-center font-black text-xl transform group-hover:rotate-12 transition-transform">
                            {index + 1}
                        </div>
                        <div className="flex-1">
                            <DAppCard dapp={dapp} />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
