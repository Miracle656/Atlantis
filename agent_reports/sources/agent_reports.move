/// On-chain registry of agent-produced evaluation reports for dApps.
/// Heavy report JSON lives on Walrus; this module stores verifiable pointers
/// plus quick-filter fields (verdict + score) so the frontend can render lists
/// without fetching every blob.
///
/// Reports are written by the backend agent service, gated by `AgentCap`.
/// Once published, AgentReport objects are frozen — append-only history.
module agent_reports::agent_reports {
    use std::string::String;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::event;

    // ====== Error codes ======
    const EInvalidVerdict: u64 = 1;
    const EInvalidScore: u64 = 2;

    // ====== Verdict encoding ======
    // 0 = red, 1 = yellow, 2 = green
    const MAX_VERDICT: u8 = 2;
    const MAX_SCORE: u8 = 100;

    // ====== Capability ======

    /// Held by the backend agent signer. Required to publish reports.
    public struct AgentCap has key, store {
        id: UID,
    }

    // ====== Shared registry ======

    /// Indexes published reports for fast lookup by dApp id.
    public struct ReportRegistry has key {
        id: UID,
        /// dapp_id -> id of the most recent AgentReport with agent_kind="summary"
        latest_summary: Table<ID, ID>,
        /// dapp_id -> all AgentReport ids ever published for this dApp (any kind)
        all_reports: Table<ID, vector<ID>>,
        admin: address,
    }

    // ====== Report object ======

    /// One report from one agent about one dApp. Frozen at publish time.
    public struct AgentReport has key, store {
        id: UID,
        dapp_id: ID,
        /// "security" | "tokenomics" | "ux" | "metrics" | "summary"
        agent_kind: String,
        /// e.g. "claude-sonnet-4-6@security-v1"
        agent_version: String,
        /// Walrus blob id containing the full structured finding JSON
        report_blob_id: String,
        /// Optional MemWal pointer to the shared evaluator scratchpad
        memwal_thread: Option<String>,
        verdict: u8,
        score: u8,
        /// Groups specialists + their summary into one evaluation round
        round_id: u64,
        created_at: u64,
    }

    // ====== Events ======

    public struct ReportPublished has copy, drop {
        report_id: ID,
        dapp_id: ID,
        agent_kind: String,
        agent_version: String,
        report_blob_id: String,
        verdict: u8,
        score: u8,
        round_id: u64,
        timestamp: u64,
    }

    // ====== Init ======

    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        transfer::share_object(ReportRegistry {
            id: object::new(ctx),
            latest_summary: table::new(ctx),
            all_reports: table::new(ctx),
            admin,
        });

        transfer::transfer(AgentCap {
            id: object::new(ctx),
        }, admin);
    }

    // ====== Entry: publish a report ======

    /// Publish a new agent report. Requires AgentCap.
    /// Creates a frozen AgentReport object and indexes its id in the registry.
    public fun publish_report(
        _cap: &AgentCap,
        registry: &mut ReportRegistry,
        dapp_id: ID,
        agent_kind: String,
        agent_version: String,
        report_blob_id: String,
        memwal_thread: Option<String>,
        verdict: u8,
        score: u8,
        round_id: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(verdict <= MAX_VERDICT, EInvalidVerdict);
        assert!(score <= MAX_SCORE, EInvalidScore);

        let timestamp = clock::timestamp_ms(clock);

        let report_uid = object::new(ctx);
        let report_id = object::uid_to_inner(&report_uid);

        let report = AgentReport {
            id: report_uid,
            dapp_id,
            agent_kind,
            agent_version,
            report_blob_id,
            memwal_thread,
            verdict,
            score,
            round_id,
            created_at: timestamp,
        };

        // Index in all_reports
        if (table::contains(&registry.all_reports, dapp_id)) {
            let ids = table::borrow_mut(&mut registry.all_reports, dapp_id);
            vector::push_back(ids, report_id);
        } else {
            let mut ids = vector<ID>[];
            vector::push_back(&mut ids, report_id);
            table::add(&mut registry.all_reports, dapp_id, ids);
        };

        // If this is a summary report, update latest_summary pointer
        if (report.agent_kind == std::string::utf8(b"summary")) {
            if (table::contains(&registry.latest_summary, dapp_id)) {
                let slot = table::borrow_mut(&mut registry.latest_summary, dapp_id);
                *slot = report_id;
            } else {
                table::add(&mut registry.latest_summary, dapp_id, report_id);
            }
        };

        // Capture for event before freezing moves the value
        let kind_evt = report.agent_kind;
        let version_evt = report.agent_version;
        let blob_evt = report.report_blob_id;

        // Freeze: report is now immutable, publicly readable forever
        transfer::public_freeze_object(report);

        event::emit(ReportPublished {
            report_id,
            dapp_id,
            agent_kind: kind_evt,
            agent_version: version_evt,
            report_blob_id: blob_evt,
            verdict,
            score,
            round_id,
            timestamp,
        });
    }

    // ====== View functions ======

    /// Returns the id of the latest summary report for a dApp, if any.
    public fun latest_summary(registry: &ReportRegistry, dapp_id: ID): Option<ID> {
        if (table::contains(&registry.latest_summary, dapp_id)) {
            option::some(*table::borrow(&registry.latest_summary, dapp_id))
        } else {
            option::none()
        }
    }

    /// Returns all report ids for a dApp. Empty vector if none.
    public fun reports_for(registry: &ReportRegistry, dapp_id: ID): vector<ID> {
        if (table::contains(&registry.all_reports, dapp_id)) {
            *table::borrow(&registry.all_reports, dapp_id)
        } else {
            vector<ID>[]
        }
    }

    // ====== Field accessors (for off-chain readers using sui_getObject) ======

    public fun report_dapp_id(r: &AgentReport): ID { r.dapp_id }
    public fun report_agent_kind(r: &AgentReport): String { r.agent_kind }
    public fun report_agent_version(r: &AgentReport): String { r.agent_version }
    public fun report_blob_id(r: &AgentReport): String { r.report_blob_id }
    public fun report_memwal_thread(r: &AgentReport): Option<String> { r.memwal_thread }
    public fun report_verdict(r: &AgentReport): u8 { r.verdict }
    public fun report_score(r: &AgentReport): u8 { r.score }
    public fun report_round_id(r: &AgentReport): u64 { r.round_id }
    public fun report_created_at(r: &AgentReport): u64 { r.created_at }
}
