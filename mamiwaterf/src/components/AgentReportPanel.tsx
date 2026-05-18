import { useState } from "react";
import {
    ShieldCheck,
    Loader2,
    AlertTriangle,
    ExternalLink,
    Sparkles,
    RefreshCw,
} from "lucide-react";
import {
    useAgentReports,
    useRequestEvaluation,
    type Severity,
    type Verdict,
    type EvalMetadata,
} from "../hooks/useAgentReports";
import { formatRelativeTime } from "../utils";

interface Props {
    /** The dApp's on-chain object id — the agent_reports key. */
    dappId?: string;
    /** Deployed Move package id, if the dApp has one (enables code audit). */
    packageId?: string;
    metadata: EvalMetadata;
}

const VERDICT_STYLE: Record<Verdict, { box: string; label: string }> = {
    green: { box: "bg-neo-green text-neo-black", label: "LOOKS GOOD" },
    yellow: { box: "bg-neo-yellow text-neo-black", label: "CAUTION" },
    red: { box: "bg-red-500 text-white", label: "HIGH RISK" },
};

const SEVERITY_STYLE: Record<Severity, string> = {
    critical: "bg-red-600 text-white",
    high: "bg-red-500 text-white",
    med: "bg-neo-yellow text-neo-black",
    low: "bg-neo-cyan text-neo-black",
    info: "bg-neo-white text-neo-black",
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "med", "low", "info"];

export default function AgentReportPanel({ dappId, packageId, metadata }: Props) {
    const { data: report, isLoading, isError, error } = useAgentReports(dappId);
    const evaluate = useRequestEvaluation(dappId);
    const [showAll, setShowAll] = useState(false);

    const runEval = () =>
        evaluate.mutate({ metadata, packageId: packageId || undefined });

    // --- Shell --------------------------------------------------
    const Shell = ({ children }: { children: React.ReactNode }) => (
        <div className="neo-box p-4 sm:p-6 md:p-8 bg-white mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4 border-b-3 border-neo-black pb-2">
                <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6" />
                    Agent Audit
                </h2>
                <span className="text-[10px] sm:text-xs font-bold uppercase bg-neo-black text-white px-2 py-1">
                    AI · on-chain
                </span>
            </div>
            {children}
        </div>
    );

    if (!dappId) {
        return (
            <Shell>
                <p className="font-bold text-gray-500 uppercase text-sm">
                    Register this dApp on-chain to enable agent evaluation.
                </p>
            </Shell>
        );
    }

    if (isLoading) {
        return (
            <Shell>
                <div className="flex items-center gap-3 text-gray-600 font-bold uppercase">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Reading reports from chain…
                </div>
            </Shell>
        );
    }

    if (isError) {
        return (
            <Shell>
                <div className="flex items-start gap-3 bg-red-100 border-2 border-red-500 text-red-700 p-4 font-bold">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>
                        Couldn't load agent reports:{" "}
                        {(error as Error)?.message ?? "unknown error"}
                    </span>
                </div>
            </Shell>
        );
    }

    // --- Never evaluated ---------------------------------------
    if (!report) {
        return (
            <Shell>
                <p className="font-bold text-neo-black mb-4">
                    This dApp hasn't been evaluated yet. Run the multi-agent
                    audit — security, tokenomics, UX and on-chain metrics
                    specialists each publish a signed report on-chain.
                </p>
                <EvalButton
                    onClick={runEval}
                    pending={evaluate.isPending}
                    label="Run agent evaluation"
                />
                {evaluate.isError && (
                    <p className="mt-3 text-red-600 font-bold text-sm">
                        {(evaluate.error as Error)?.message}
                    </p>
                )}
                {evaluate.isPending && <RunningNote />}
            </Shell>
        );
    }

    // --- Has a summary report ----------------------------------
    const v = VERDICT_STYLE[report.verdict];
    const blob = report.blob;
    const findings = (blob?.findings ?? [])
        .slice()
        .sort(
            (a, b) =>
                SEVERITY_ORDER.indexOf(a.severity) -
                SEVERITY_ORDER.indexOf(b.severity)
        );
    const visibleFindings = showAll ? findings : findings.slice(0, 4);
    const aggBlobUrl = report.reportBlobId
        ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${report.reportBlobId}`
        : undefined;

    return (
        <Shell>
            {/* Verdict + score */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div
                    className={`${v.box} border-3 border-neo-black shadow-neo-sm px-5 py-4 flex-1 flex items-center justify-between`}
                >
                    <div>
                        <div className="text-xs font-bold uppercase opacity-70">
                            Consensus
                        </div>
                        <div className="text-3xl font-black uppercase tracking-tighter">
                            {v.label}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold uppercase opacity-70">
                            Score
                        </div>
                        <div className="text-4xl font-black">{report.score}</div>
                    </div>
                </div>
                <div className="neo-box bg-neo-white px-5 py-4 sm:w-52">
                    <div className="text-xs font-bold uppercase text-gray-500">
                        Confidence
                    </div>
                    <div className="text-2xl font-black">
                        {blob ? `${Math.round(blob.confidence * 100)}%` : "—"}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-gray-500 mt-2">
                        {/* createdAt is a ms timestamp from chain; formatRelativeTime parses strings. */}
                        {formatRelativeTime(new Date(report.createdAt).toISOString())}
                    </div>
                </div>
            </div>

            {/* Findings */}
            {findings.length > 0 ? (
                <div className="mb-6">
                    <h3 className="text-lg font-black uppercase mb-3">
                        Findings ({findings.length})
                    </h3>
                    <ul className="space-y-3">
                        {visibleFindings.map((fd, i) => (
                            <li
                                key={i}
                                className="border-2 border-neo-black p-3 bg-neo-white"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`${SEVERITY_STYLE[fd.severity]} border border-neo-black text-[10px] font-black uppercase px-2 py-0.5`}
                                    >
                                        {fd.severity}
                                    </span>
                                    <span className="font-black uppercase text-sm">
                                        {fd.title}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-neo-black leading-snug">
                                    {fd.detail}
                                </p>
                                {fd.evidence?.url && (
                                    <a
                                        href={fd.evidence.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-neo-blue hover:underline inline-flex items-center gap-1 mt-1"
                                    >
                                        evidence <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </li>
                        ))}
                    </ul>
                    {findings.length > 4 && (
                        <button
                            onClick={() => setShowAll((s) => !s)}
                            className="mt-3 text-xs font-black uppercase underline"
                        >
                            {showAll
                                ? "Show fewer"
                                : `Show all ${findings.length}`}
                        </button>
                    )}
                </div>
            ) : (
                <p className="font-bold text-gray-500 uppercase text-sm mb-6">
                    No findings recorded in the summary blob.
                </p>
            )}

            {/* Recommendations */}
            {blob?.recommendations?.length ? (
                <div className="mb-6">
                    <h3 className="text-lg font-black uppercase mb-3">
                        Recommendations
                    </h3>
                    <ul className="space-y-2">
                        {blob.recommendations.map((r, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-3 text-sm font-bold text-neo-black"
                            >
                                <div className="w-3 h-3 bg-neo-black mt-1 shrink-0" />
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {/* Footer: provenance + actions */}
            <div className="flex flex-wrap items-center gap-3 border-t-3 border-neo-black pt-4 text-xs font-bold uppercase">
                <span className="text-gray-500">{report.agentVersion}</span>
                <a
                    href={`https://testnet.suivision.xyz/object/${report.reportId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-neo-blue hover:underline"
                >
                    on-chain report <ExternalLink className="w-3 h-3" />
                </a>
                {aggBlobUrl && (
                    <a
                        href={aggBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-neo-blue hover:underline"
                    >
                        raw on Walrus <ExternalLink className="w-3 h-3" />
                    </a>
                )}
                <button
                    onClick={runEval}
                    disabled={evaluate.isPending}
                    className="ml-auto inline-flex items-center gap-1 bg-neo-black text-white px-3 py-1.5 hover:bg-neo-pink disabled:opacity-50 transition-colors"
                >
                    {evaluate.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <RefreshCw className="w-3 h-3" />
                    )}
                    Re-evaluate
                </button>
            </div>
            {evaluate.isError && (
                <p className="mt-3 text-red-600 font-bold text-sm">
                    {(evaluate.error as Error)?.message}
                </p>
            )}
            {evaluate.isPending && <RunningNote />}
        </Shell>
    );
}

function EvalButton({
    onClick,
    pending,
    label,
}: {
    onClick: () => void;
    pending: boolean;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={pending}
            className="inline-flex items-center gap-2 bg-neo-green text-neo-black font-black uppercase border-3 border-neo-black shadow-neo-sm px-5 py-3 hover:bg-neo-pink hover:text-white disabled:opacity-50 transition-colors"
        >
            {pending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Sparkles className="w-5 h-5" />
            )}
            {label}
        </button>
    );
}

function RunningNote() {
    return (
        <p className="mt-3 text-xs font-bold uppercase text-gray-500">
            Running 4 specialists + summarizer and publishing 5 reports
            on-chain. This takes 1–4 minutes — you can leave this page; the
            report updates when it lands.
        </p>
    );
}
