import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import {
    AGENT_REPORTS_REGISTRY_ID,
    WALRUS_AGGREGATORS,
    BACKEND_URL,
} from "../constants";

// ============================================================
// Types
// ============================================================

export type Verdict = "red" | "yellow" | "green";
export type Severity = "info" | "low" | "med" | "high" | "critical";

export interface Finding {
    severity: Severity;
    title: string;
    detail: string;
    evidence?: {
        txDigest?: string;
        blobId?: string;
        url?: string;
        packageId?: string;
        line?: number;
        note?: string;
    };
}

/** The full SpecialistOutput JSON stored on Walrus. */
export interface AgentReportBlob {
    agent: string;
    version: string;
    dappId: string;
    roundId: number;
    verdict: Verdict;
    score: number;
    confidence: number;
    findings: Finding[];
    recommendations: string[];
    generatedAt: number;
}

/** On-chain AgentReport quick-filter fields + the resolved blob. */
export interface AgentSummaryReport {
    reportId: string;
    agentKind: string;
    agentVersion: string;
    reportBlobId: string;
    /** From chain (authoritative quick-filter). 0=red 1=yellow 2=green. */
    verdict: Verdict;
    score: number;
    roundId: number;
    createdAt: number;
    /** Full payload from Walrus. Null if the blob could not be fetched. */
    blob: AgentReportBlob | null;
}

const VERDICT_FROM_CODE: Record<number, Verdict> = { 0: "red", 1: "yellow", 2: "green" };

// ============================================================
// Walrus fetch (self-contained, correct /v1/blobs path)
// ============================================================

// The shared WALRUS_AGGREGATORS entries carry a trailing /v1 for legacy
// callers; strip it and use the current /v1/blobs/{id} read path.
function aggregatorBase(entry: string): string {
    return entry.replace(/\/v1\/?$/, "");
}

async function fetchReportBlob(blobId: string): Promise<AgentReportBlob | null> {
    for (const entry of WALRUS_AGGREGATORS) {
        try {
            const url = `${aggregatorBase(entry)}/v1/blobs/${blobId}`;
            const res = await fetch(url);
            if (!res.ok) continue;
            return (await res.json()) as AgentReportBlob;
        } catch {
            // try next aggregator
        }
    }
    return null;
}

// ============================================================
// useAgentReports — the summary report for one dApp
// ============================================================

/**
 * Reads agent_reports::ReportRegistry.latest_summary[dappId] -> the
 * AgentReport object -> its Walrus blob. Returns null (not an error) when
 * the dApp has never been evaluated.
 */
export const useAgentReports = (dappId: string | undefined) => {
    const client = useSuiClient();

    return useQuery({
        queryKey: ["agentReports", dappId],
        enabled: !!dappId,
        staleTime: 1000 * 60 * 2,
        retry: false,
        queryFn: async (): Promise<AgentSummaryReport | null> => {
            if (!dappId) return null;

            // 1. Registry object -> latest_summary table parent id.
            const registry = await client.getObject({
                id: AGENT_REPORTS_REGISTRY_ID,
                options: { showContent: true },
            });
            const registryFields = (registry.data?.content as any)?.fields;
            const latestSummaryTableId =
                registryFields?.latest_summary?.fields?.id?.id;
            if (!latestSummaryTableId) {
                throw new Error("agent_reports registry not found or malformed");
            }

            // 2. latest_summary[dappId] -> AgentReport object id.
            //    Table<ID, ID>: key type is 0x2::object::ID.
            let reportId: string;
            try {
                const field = await client.getDynamicFieldObject({
                    parentId: latestSummaryTableId,
                    name: { type: "0x2::object::ID", value: dappId },
                });
                const val = (field.data?.content as any)?.fields?.value;
                if (!val) return null; // never evaluated
                reportId = typeof val === "string" ? val : val?.id ?? val;
            } catch {
                return null; // no entry => not evaluated yet
            }

            // 3. The AgentReport object (frozen) — quick-filter fields.
            const reportObj = await client.getObject({
                id: reportId,
                options: { showContent: true },
            });
            const f = (reportObj.data?.content as any)?.fields;
            if (!f) return null;

            const verdictCode = Number(f.verdict);
            const reportBlobId: string = f.report_blob_id;

            // 4. Resolve the full payload from Walrus.
            const blob = reportBlobId ? await fetchReportBlob(reportBlobId) : null;

            return {
                reportId,
                agentKind: f.agent_kind,
                agentVersion: f.agent_version,
                reportBlobId,
                verdict: VERDICT_FROM_CODE[verdictCode] ?? "yellow",
                score: Number(f.score),
                roundId: Number(f.round_id),
                createdAt: Number(f.created_at),
                blob,
            };
        },
    });
};

// ============================================================
// useRequestEvaluation — trigger a backend eval round
// ============================================================

export interface EvalMetadata {
    name: string;
    tagline: string;
    category: string;
    website: string;
    twitter?: string;
    github?: string;
    discord?: string;
}

/**
 * POSTs to the backend orchestrator, which runs 4 specialists + summarizer
 * and publishes 5 AgentReports on-chain. Long-running (1-4 min). On success
 * we invalidate the report query so the panel refreshes.
 */
export const useRequestEvaluation = (dappId: string | undefined) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (args: {
            metadata: EvalMetadata;
            packageId?: string;
        }) => {
            if (!dappId) throw new Error("Missing dApp id");
            const res = await fetch(`${BACKEND_URL}/api/agents/eval/${dappId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    packageId: args.packageId,
                    metadata: args.metadata,
                }),
            });
            if (res.status === 409) {
                throw new Error("An evaluation is already running for this dApp.");
            }
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Eval failed (${res.status})`);
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agentReports", dappId] });
        },
    });
};
