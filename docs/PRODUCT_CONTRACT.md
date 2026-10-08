# Initial product contract

- **Milestone:** M01.
- **Status:** initial design contract; no application behavior has been implemented or verified.
- **Scope decision:** [ADR 0002](decisions/0002-initial-product-contract.md).

## Purpose and operator

Petty observes supported Microsoft Entra configuration, compares it with an operator-approved policy, and records observed changes and reproducible findings. It is configuration monitoring, with later activity correlation and workflow features.

The first deployment serves one organization and one commercial Microsoft tenant. The organization controls its self-hosted Docker deployment, Microsoft app registration, approved baseline, credentials, private evidence repository, backups, and data lifecycle. Its authorized security operator configures scans and reviews findings. This is not a shared service for unrelated organizations.

The organization retains control of its tenant data. Running Petty does not authorize maintainers to receive it. The public source repository contains synthetic examples only; live evidence must use a separate organization-controlled private repository.

## Initial support boundary

[The coverage matrix](COVERAGE.md) is the authoritative planned resource/property allowlist:

- Conditional Access policy identity, state, and explicit user/group/role targeting.
- Currently active directory role assignments returned by Graph, with built-in role definitions; the initial authorization check covers tenant-wide assignments.
- Referenced principals represented by stable IDs, with type/name context when available.

The first prototype imports synthetic snapshots. Live collection starts in M12–M15 against an authorized lab tenant; private Git publishing starts in M16. This contract does not describe a runnable exporter or complete tenant inventory.

Initial checks are required-policy enabled state, unexpected explicit exclusions, and unapproved protected role assignments. An observed difference is a change; a violation of the approved baseline is policy drift. Yesterday's observed state never automatically becomes approved.

Membership expansion, PIM eligibility/schedules, custom role analysis, effective access/MFA simulation, sign-in/audit telemetry, other Microsoft workloads, sovereign clouds, tenant restoration, and tenant mutations are outside this initial scope. Changes to the allowlist or interpretation require updated coverage, permission review, synthetic cases, and an appropriate roadmap gate.

## What an assessment and finding mean

Each check returns one outcome for its declared subject and predicate:

| Outcome | Meaning |
| --- | --- |
| Pass | Complete, fresh, supported evidence satisfies this exact approved policy predicate. |
| Fail | Sufficient fresh evidence establishes a violation of that predicate. A finding is emitted. |
| Unknown | Required evidence, approved policy, permission, freshness, or semantics are insufficient. Explain the blocking reason. |
| Not applicable | The subject is explicitly outside this check's declared applicability. This is not a security endorsement. |

A finding is an evidence-backed policy violation, not proof of compromise, comprehensive compliance, or effective enforcement. Unknown coverage creates a visible assessment/collection issue; it cannot disappear inside a green summary. Historical failures can remain visible with their original time, but cannot be presented as a current decision.

Every assessment pins tenant and subject IDs, input fingerprints, collection intervals, coverage/freshness, baseline and rule versions, engine/schema/reference-data versions, and explicit evaluation time. A failed assessment also records observed versus expected facts and relevant evidence paths. Optional display names are context; approval uses IDs and scope. Human-approved exceptions must be versioned, justified, and have explicit validity conditions; they cannot silently redefine the baseline.

## Collection and freshness targets

These are initial engineering targets for later testing, not measured performance or service guarantees.

| Item | Initial target |
| --- | --- |
| Schedule | One scan every 60 minutes, plus an operator-requested scan; serialize jobs for the tenant. |
| Attempt deadline | 20 minutes, including bounded retries; a timeout creates incomplete coverage. |
| Freshness limit | 120 minutes at the recorded evaluation time, measured from each scope's original collection start. |
| Expected organization | Up to 10,000 users and 2,000 groups; this is context, not a promise to export every object. |
| Initial scan envelope | Up to 250 policies, 2,000 active role assignments, 250 role definitions, and 15,000 distinct principal references. |
| Evaluation/publication target | A successful scan and publication within 15 minutes at the declared envelope under normal upstream availability; measure in M27. |
| Validation environment | Synthetic fixtures first; then a consenting commercial lab tenant with the relevant Conditional Access license. |

These are Petty planning bounds, not Microsoft API limits. Count/size/page limits must be enforced during collection, not by truncating and claiming success. Exceeding supported bounds produces incomplete/unsupported coverage with an actionable reason. Implementation will document memory/storage budgets and measured supported limits before production.

Every attempt records its start/end, tenant, declared scope, endpoint/page completion, versions, and errors. A failed new attempt marks affected current assessments unknown even if older data is within the nominal freshness limit. Retain the last trustworthy per-scope observation for historical use, preserving its original timestamps. Unaffected checks may continue if all their required evidence is complete and fresh. Mixed-age relationships must be disclosed.

No cross-API scan is atomic. Changes between observations can be missed. Detect removals only between compatible, completed scopes; an error, changed allowlist, missing page, or unresolved reference is not a deletion. Configuration fingerprints exclude volatile attempt metadata. Failed and unchanged attempts still leave operational records without unnecessary configuration commits.

## Authentication and writes

Scheduled Microsoft collection is planned to use an organization-owned app registration, administrator-consented application read permissions, and tenant-specific authentication. A mounted certificate/private key is the first self-hosted credential candidate; M12 must verify storage, renewal, token acquisition, and consent against the supported endpoints before live use. Secrets stay outside Git and the container image. Interactive onboarding and later hosted credentials are separate implementation decisions.

[Coverage](COVERAGE.md) records endpoint-documented read permission candidates. M12 must test the narrowest supported permission/property combination; optional name enrichment must justify any additional consent. Missing access becomes unknown coverage. Petty must not request Microsoft write permissions or silently fall back to broad directory read access.

Read-only means no changes to Microsoft tenant resources. OAuth token requests may use POST. Petty writes its own operational state, evidence, approved baseline records, and configured delivery records through separately authorized destinations.

Git publishing will use a separate repository-scoped identity; a GitHub App installation token is the preferred candidate to validate in M16. Verify tenant-to-destination binding and repository privacy before publication, including after configuration changes. No credentials or live tenant checks are needed for M01.

## Data lifecycle and recovery targets

- **Evidence:** retain canonical allowlisted configuration, baseline history, and receipts in the organization's private repository until the owner explicitly removes or rotates that history. The initial design has no automatic age-based Git purge. The operator must accept this retention model or define an approved rotation/purge process before live collection.
- **Operational records:** target 30 days of detailed job records and 14 days of sanitized logs, while retaining the current connection/baseline and last trustworthy scope state until disconnect/deletion. Implement and verify lifecycle controls before the self-hosted pilot.
- **Backups:** target encrypted daily backups, seven daily and four weekly recovery points. Restore tests must include evidence, application state, baseline versions, and credential re-provisioning.
- **Recovery objectives:** target RPO of 24 hours and RTO of four hours for the self-hosted pilot. These objectives are unproven until M26.
- **Disconnect:** stop scheduling, cancel pending work safely, remove/revoke future credential use, and explain retained evidence. Disconnect does not erase Git history, clones, notification copies, logs, or backups.
- **Deletion:** the owner controls repository/history removal and downstream copies. Document what Petty deletes and what requires owner action; do not equate deleting a tracked file with deleting its history.

Collect no message content, passwords, authentication secrets, or whole user profiles. Treat identity IDs/names, configuration, role relationships, and receipts as sensitive. Notification and later AI exports need separate explicit operator authorization and a bounded field set.

## Release conditions and open decisions

M01 completes the documented scope and threat analysis. It does not establish an SLA, tested safeguards, live API support, or production readiness. [Acceptance cases](ACCEPTANCE_CASES.md) become executable fixtures/checks in later milestones. [The threat model](THREAT_MODEL.md) maps required controls to those gates.

MIT is the selected source-code license. Exact Node LTS version, package manager, test/lint/format tooling (M02), executable schemas (M03), baseline syntax (M07), operational database (M17), API/UI frameworks (M20–M21), and AI/provider choices (M29–M33) remain open. Azure hosting remains the later deployment direction.

## Sources

Microsoft/GitHub capabilities are external constraints; the targets and boundaries above are Petty design choices.

- [Graph app-only authentication](https://learn.microsoft.com/en-us/graph/auth-v2-service)
- [Graph best practices: permission type, minimization, and storage](https://learn.microsoft.com/en-us/graph/best-practices-concept)
- [GitHub App installation-token authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
