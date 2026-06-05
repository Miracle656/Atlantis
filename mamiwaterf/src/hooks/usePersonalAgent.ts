import { useMutation, useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../constants";

// ============================================================
// Types (mirror backend/src/agents/personal.ts)
// ============================================================

export interface WalletProfile {
    address: string;
    txCount: number;
    gasSpent: number;
    topProjects: string[];
    topCoins: Array<{ symbol: string; usdValue: number }>;
    topNftCollections?: Array<{ title: string; count: number; floorSui: number; verified: boolean }>;
    activityTypes: string[];
    generatedAt: number;
}

export interface FeedCandidate {
    dappId: string;
    name: string;
    category: string;
    tagline?: string;
    score?: number;
    verdict?: string;
}

export interface RankedPick {
    dappId: string;
    reason: string;
}

export interface PersonalFeedResult {
    ranked: RankedPick[];
    warnings: RankedPick[];
    memoryUsed: string[];
}

export interface MemoryEntry {
    text: string;
    distance: number;
}

// ============================================================
// Sync wallet profile → MemWal (call on connect)
// ============================================================

export const useSyncProfile = () =>
    useMutation({
        mutationFn: async (address: string): Promise<WalletProfile> => {
            const res = await fetch(`${BACKEND_URL}/api/personal/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Sync failed (${res.status})`);
            }
            const data = await res.json();
            return data.profile as WalletProfile;
        },
    });

// ============================================================
// Ranked personal feed
// ============================================================

export const usePersonalFeed = (
    address: string | undefined,
    candidates: FeedCandidate[],
    enabled = true
) =>
    useQuery({
        queryKey: ["personalFeed", address, candidates.map((c) => c.dappId).join(",")],
        enabled: !!address && candidates.length > 0 && enabled,
        staleTime: 1000 * 60 * 5,
        retry: false,
        queryFn: async (): Promise<PersonalFeedResult> => {
            const res = await fetch(`${BACKEND_URL}/api/personal/feed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, candidates }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Feed failed (${res.status})`);
            }
            return res.json();
        },
    });

// ============================================================
// What ATLANTIS remembers about you (memory transparency)
// ============================================================

export const useUserMemory = (address: string | undefined, query = "") =>
    useQuery({
        queryKey: ["userMemory", address, query],
        enabled: !!address,
        staleTime: 1000 * 60 * 2,
        retry: false,
        queryFn: async (): Promise<MemoryEntry[]> => {
            const url = new URL(`${BACKEND_URL}/api/personal/memory/${address}`);
            if (query) url.searchParams.set("q", query);
            const res = await fetch(url.toString());
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Memory fetch failed (${res.status})`);
            }
            const data = await res.json();
            return (data.memories ?? []) as MemoryEntry[];
        },
    });
