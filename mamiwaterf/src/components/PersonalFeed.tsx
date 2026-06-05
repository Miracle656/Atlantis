import { useEffect, useMemo, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Link } from 'react-router-dom';
import { Brain, AlertTriangle, Loader2, ArrowUpRight, Sparkles } from 'lucide-react';
import type { DApp } from '../types';
import {
    useSyncProfile,
    usePersonalFeed,
    useUserMemory,
    type FeedCandidate,
} from '../hooks/usePersonalAgent';
import { useTrendingNftCollections } from '../hooks/useNftCollections';
import { collectionCover } from '../utils/tradeport';

/** Collapse long on-chain hashes (wallet/object ids) to 0x1234…abcd so memory
 *  facts stay readable and don't overflow the card. */
function shortenHashes(text: string): string {
    return text.replace(/0x[0-9a-fA-F]{12,}/g, (h) => `${h.slice(0, 6)}…${h.slice(-4)}`);
}

interface PersonalFeedProps {
    dapps: DApp[];
}

/**
 * The user-facing personal agent surface. On connect it syncs the wallet's
 * behaviour into MemWal, then asks the backend personal agent to rank the
 * top dApps for this user (with a "why this" per pick + risk warnings), and
 * shows what the agent currently remembers about them.
 */
export default function PersonalFeed({ dapps }: PersonalFeedProps) {
    const account = useCurrentAccount();
    const address = account?.address;
    const sync = useSyncProfile();
    const syncedFor = useRef<string | null>(null);

    // NFT collections are candidates too — the agent ranks them alongside dApps
    // using what it remembers about the user's NFT holdings.
    const { data: nftCollections } = useTrendingNftCollections({ limit: 8 });

    // Candidate set: top dApps by recent users + trending NFT collections.
    // The agent re-orders these for the specific user.
    const candidates: FeedCandidate[] = useMemo(() => {
        const dappCandidates: FeedCandidate[] = [...dapps]
            .sort((a, b) => b.metrics.users24h - a.metrics.users24h)
            .slice(0, 10)
            .map((d) => ({
                dappId: d.id,
                name: d.name,
                category: d.category,
                tagline: d.tagline,
            }));
        const nftCandidates: FeedCandidate[] = (nftCollections ?? []).slice(0, 6).map((row) => ({
            dappId: row.collection.id,
            name: row.collection.title,
            category: 'NFT',
            tagline: row.collection.supply ? `${row.collection.supply}-item Sui NFT collection` : 'Sui NFT collection',
        }));
        return [...dappCandidates, ...nftCandidates];
    }, [dapps, nftCollections]);

    const byId = useMemo(() => new Map(dapps.map((d) => [d.id, d])), [dapps]);

    // Resolve an NFT-collection candidate id → its display data + internal link.
    const nftById = useMemo(
        () => new Map((nftCollections ?? []).map((row) => [row.collection.id, row.collection])),
        [nftCollections]
    );

    /** Resolve a ranked pick id to a renderable target (dApp or NFT collection). */
    const resolvePick = (id: string): { to: string; name: string; iconUrl: string } | null => {
        const d = byId.get(id);
        if (d) return { to: `/dapp/${d.id}`, name: d.name, iconUrl: d.iconUrl };
        const c = nftById.get(id);
        if (c) return { to: `/nft/${c.id}`, name: c.title, iconUrl: collectionCover(c) };
        return null;
    };

    // Sync wallet behaviour into MemWal once per connected address.
    useEffect(() => {
        if (address && syncedFor.current !== address) {
            syncedFor.current = address;
            sync.mutate(address);
        }
    }, [address, sync]);

    const feed = usePersonalFeed(address, candidates);
    const memory = useUserMemory(address);

    if (!address) return null;

    const ranked = feed.data?.ranked ?? [];
    const warnings = feed.data?.warnings ?? [];
    const memories = memory.data ?? [];

    return (
        <div className="mb-8 sm:mb-12">
            {/* Header */}
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neo-violet border-2 sm:border-3 border-neo-black rounded-xl shadow-neo flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter text-neo-black leading-none">
                        Your Agent
                    </h2>
                    <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Picks ranked for you · remembers your on-chain behaviour
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Ranked picks */}
                <div className="lg:col-span-2 neo-box bg-white p-4 sm:p-6">
                    <h3 className="font-black uppercase text-sm sm:text-base mb-3 sm:mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Recommended for you
                    </h3>

                    {feed.isLoading && (
                        <div className="flex items-center gap-2 text-gray-500 font-bold py-6 justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" /> Your agent is thinking…
                        </div>
                    )}

                    {feed.isError && (
                        <div className="text-sm font-bold text-gray-500 py-4">
                            Agent is offline right now. Showing the standard feed below.
                        </div>
                    )}

                    {!feed.isLoading && !feed.isError && (
                        <ol className="space-y-2 sm:space-y-3">
                            {ranked.slice(0, 8).map((pick, i) => {
                                const target = resolvePick(pick.dappId);
                                if (!target) return null;
                                return (
                                    <li key={pick.dappId}>
                                        <Link
                                            to={target.to}
                                            className="flex items-start gap-3 p-2 sm:p-3 border-2 border-transparent rounded-lg hover:border-neo-black hover:bg-neo-lime-soft hover:shadow-neo-sm transition-all group"
                                        >
                                            <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-neo-lime border-2 border-neo-black rounded-md flex items-center justify-center font-black text-xs sm:text-sm">
                                                {i + 1}
                                            </span>
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-neo-black rounded-lg overflow-hidden flex-shrink-0 bg-neo-white">
                                                {target.iconUrl ? (
                                                    <img src={target.iconUrl} alt={target.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">💧</div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-black uppercase text-sm sm:text-base truncate flex items-center gap-1">
                                                    {target.name}
                                                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <p className="text-xs sm:text-sm text-gray-600 font-medium leading-snug">{pick.reason}</p>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                            {ranked.length === 0 && (
                                <li className="text-sm font-bold text-gray-500 py-4 text-center">
                                    No recommendations yet.
                                </li>
                            )}
                        </ol>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <div className="mt-4 pt-4 border-t-2 border-neo-black">
                            <h4 className="font-black uppercase text-xs sm:text-sm mb-2 flex items-center gap-1.5 text-red-700">
                                <AlertTriangle className="w-4 h-4" /> Heads up
                            </h4>
                            <ul className="space-y-2">
                                {warnings.map((w) => {
                                    const target = resolvePick(w.dappId);
                                    return (
                                        <li
                                            key={w.dappId}
                                            className="flex items-start gap-2 p-2 bg-red-50 border-2 border-red-500 rounded-lg text-xs sm:text-sm"
                                        >
                                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                            <span className="font-medium text-red-800">
                                                <strong className="uppercase">{target?.name ?? w.dappId}:</strong> {w.reason}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* What your agent remembers */}
                <div className="neo-box bg-neo-violet-soft p-4 sm:p-6">
                    <h3 className="font-black uppercase text-sm sm:text-base mb-3 sm:mb-4 flex items-center gap-2">
                        <Brain className="w-4 h-4" /> What it remembers
                    </h3>

                    {memory.isLoading && (
                        <div className="flex items-center gap-2 text-gray-600 font-bold text-sm py-4">
                            <Loader2 className="w-4 h-4 animate-spin" /> Reading memory…
                        </div>
                    )}

                    {!memory.isLoading && memories.length > 0 && (
                        <ul className="space-y-2">
                            {memories.slice(0, 8).map((m, i) => (
                                <li
                                    key={i}
                                    className="text-xs sm:text-sm font-medium bg-white border-2 border-neo-black rounded-lg px-3 py-2 shadow-neo-sm break-words"
                                >
                                    {shortenHashes(m.text)}
                                </li>
                            ))}
                        </ul>
                    )}

                    {!memory.isLoading && memories.length === 0 && (
                        <p className="text-xs sm:text-sm font-medium text-gray-700 leading-relaxed">
                            Your agent is still learning about you. As you connect and interact, it builds a private,
                            portable memory of your on-chain behaviour stored on Walrus via MemWal — and uses it to
                            personalise these picks.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
