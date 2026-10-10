# Petty roadmap

This is the agreed path from an empty repository to a production-grade monitor and later feature expansion. Product documentation, repository tooling, shared data contracts, and synthetic scenario datasets have been added; tenant collection and security-check implementation have not started.

## How to use this roadmap

- Work in milestone order unless a dependency is explicitly resolved another way.
- Each milestone ends with a working demonstration where applicable, relevant passing checks, and a reviewable PR.
- Larger milestones may span several PRs.
- Update status only when the completion gate is met. Record verification in the PR.
- Keep the product within its documented support scope. Production readiness does not require every Microsoft resource or every future feature.
- Define measurable operating and recovery targets before assessing production readiness.

**Status key:** complete, pending. Milestones 0 through 5 are complete. This document is a plan, not evidence that the described capabilities exist.

## Foundation and offline prototype

| ID  | Milestone                               | Completion gate                                                                                                                                                                                               | Status   |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M00 | Architecture agreed                     | TypeScript, Node.js LTS, Docker, Git history, deterministic checks, and read-only tenant access are agreed.                                                                                                   | Complete |
| M01 | Product contract and threat model       | Define supported resources/properties, data ownership, collection frequency, expected tenant size, deployment assumptions, security boundaries, and the meaning of a finding.                                 | Complete |
| M02 | Repository foundation                   | Reproducible installation, strict TypeScript checks, formatting, tests, CI, and contribution process. Pin supported tooling and dependencies.                                                                 | Complete |
| M03 | Shared data contracts                   | Versioned schemas for resources, relationships, collection manifests, baselines, findings, and receipts.                                                                                                      | Complete |
| M04 | Synthetic tenant fixtures               | Small datasets demonstrate compliant settings, risky changes, missing permissions, partial collection, and malformed input.                                                                                   | Complete |
| M05 | Clerk: snapshot importer                | Import and validate fixture data through a CLI. Invalid or unsupported data produces explicit errors.                                                                                                         | Complete |
| M06 | Ledger: canonical tenant model          | Stable IDs, predictable serialization, configuration fingerprints, and relationships. Reordered set-like input produces identical configuration output while semantically ordered lists retain their meaning. | Pending  |
| M07 | Ground Rules: approved baselines        | Define required settings and allowed access. Observed state and approved state remain separate.                                                                                                               | Pending  |
| M08 | Inspector: first deterministic checks   | Detect a disabled required policy, unexpected exclusions, and an unapproved protected role assignment. Distinguish pass, fail, unknown, and not applicable.                                                   | Pending  |
| M09 | Receipts: evidence records              | Findings reference resources, evidence, snapshot, baseline, rule, engine, schema, and relevant reference-data versions. Produce machine-readable and human-readable reports.                                  | Pending  |
| M10 | Paper Trail: meaningful change analysis | Detect additions, removals, and configuration changes without reporting ordering noise. Incomplete collection cannot imply deletion.                                                                          | Pending  |
| M11 | Replay: reproducibility                 | Historical inputs reproduce decisions. Regression tests cover legitimate changes, violations, missing evidence, and rejected inputs.                                                                          | Pending  |

**Checkpoint:** a reproducible offline demo works without Microsoft credentials.

## Live tenant monitoring

| ID  | Milestone                                 | Completion gate                                                                                                                                                      | Status  |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M12 | Microsoft authentication                  | An authorized administrator connects a lab tenant using documented permissions. Credential expiry, consent failure, and revoked access have understandable outcomes. | Pending |
| M13 | Clerk: live Conditional Access collection | Collect supported policy fields, preserve resource IDs, and record collection interval and coverage.                                                                 | Pending |
| M14 | Clerk: identity and access collection     | Collect supported role assignments, users, groups, and memberships. Document active versus eligible access and unresolved references.                                | Pending |
| M15 | Collection reliability                    | Test pagination, throttling, retries, deadlines, and partial failures. Preserve the last trustworthy configuration after failure and expose its age.                 | Pending |
| M16 | Ledger: Git publishing                    | Publish coherent snapshots to a private repository. Handle concurrent updates and retries safely; unchanged configuration creates no unnecessary commit.             | Pending |
| M17 | Durable scheduled jobs                    | Choose the operational database. Persist job state, prevent overlapping scans, and recover safely after restart.                                                     | Pending |
| M18 | Guest List: access reviews                | Explain supported access paths, scopes, and policy violations with resource-level evidence. Unsupported access semantics remain explicit.                            | Pending |
| M19 | Triage: finding prioritization            | Rank findings using documented criteria and contributions. Priority tuning cannot silently redefine mandatory policies.                                              | Pending |

**Checkpoint:** live alpha repeatedly monitors an authorized tenant and explains observed changes.

## Self-hosted product readiness

| ID  | Milestone                             | Completion gate                                                                                                                                                       | Status  |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M20 | Application API and authorization     | Expose scans, findings, history, and receipts. Every request enforces the caller's permitted tenant and resources.                                                    | Pending |
| M21 | Dashboard and onboarding              | Connect a tenant and repository, inspect coverage, review findings, and understand failed or stale collections.                                                       | Pending |
| M22 | Baseline governance                   | Require explicit review of baseline changes. Record who approved changes, why, and which version became effective.                                                    | Pending |
| M23 | Dispatch: read-only workflows         | Route findings, gather context, and deliver configured notifications or cases. Retries avoid duplicate delivery and leave receipts.                                   | Pending |
| M24 | Docker deployment                     | A fresh installation works through documented Docker Compose configuration, with persistent state, externalized credentials, and health checks.                       | Pending |
| M25 | Operational visibility                | Structured logs, metrics, and alerts expose failed scans, stale snapshots, publishing failures, and job backlogs without leaking sensitive data.                      | Pending |
| M26 | Recovery and upgrades                 | Demonstrate backup restoration, schema migration, interrupted-upgrade recovery, and application rollback. Define and measure recovery targets.                        | Pending |
| M27 | Security and performance verification | Test authorization, hostile inputs, credential handling, dependency integrity, and expected tenant sizes. Establish supported limits and operating budgets.           | Pending |
| M28 | Self-hosted production pilot          | Run against authorized tenants over an agreed observation period. Resolve material defects and publish installation, upgrade, troubleshooting, and incident runbooks. | Pending |

**Checkpoint:** production-ready self-hosted monitoring within a declared support scope.

## Controlled AI improvement

| ID  | Milestone                   | Completion gate                                                                                                                                                                 | Status  |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M29 | Reviewed outcome dataset    | Capture analyst assessments and distinguish incorrect checks, insufficient evidence, accepted exceptions, and genuine violations.                                               | Pending |
| M30 | Drafts: AI proposals        | AI receives bounded, authorized evidence and proposes structured changes with rationale. Tenant-provided text is treated as data.                                               | Pending |
| M31 | Replay: proposal evaluation | Compare existing and proposed rules on historical and held-out cases. Report missed violations, false positives, performance, and affected decisions separately.                | Pending |
| M32 | Controlled rule releases    | Approve, version, deploy, and roll back tested proposals. Production evaluation remains deterministic and independent of model availability.                                    | Pending |
| M33 | Continuous evaluation       | Run bounded evaluations when enough reviewed evidence exists. Track model usage, budgets, proposal history, and rejection reasons. Demonstrate rejection of a harmful proposal. | Pending |

**Checkpoint:** AI proposes improvements, versioned rules operate, and receipts explain both. This capability can be released independently after the monitor is dependable.

## Managed hosted service

| ID  | Milestone                       | Completion gate                                                                                                                                                                       | Status  |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M34 | Azure infrastructure as code    | Reproducible staging infrastructure for Container Apps, collection Jobs, database, secrets, and monitoring.                                                                           | Pending |
| M35 | Hosted onboarding and lifecycle | Connect a Microsoft tenant and private repository, manage access, disconnect, and receive clear retention and deletion behavior.                                                      | Pending |
| M36 | Tenant isolation                | Verify separation across requests, jobs, credentials, database records, snapshots, Git destinations, logs, and AI requests. Establish this before onboarding unrelated organizations. | Pending |
| M37 | Hosted reliability exercises    | Test restarts, retries, concurrent scans, external outages, secret rotation, deployment rollback, and disaster recovery.                                                              | Pending |
| M38 | Hosted production release       | Pilot results meet declared reliability, security, coverage, and recovery targets. Publish versioned artifacts, support policies, and operational ownership.                          | Pending |

**Checkpoint:** production-ready managed monitoring. Hosting decisions must preserve the module contracts and evidence model.

## Feature-family expansion

Each expansion passes the same evidence, security, collection-integrity, and operational gates before becoming production-supported.

| ID  | Milestone                           | Completion gate                                                                                                                                                                  | Status  |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M39 | Broader Microsoft workload coverage | Add Intune, Exchange, Teams, Defender, or Purview incrementally. Each connector includes a coverage matrix, permissions documentation, fixtures, and meaningful checks.          | Pending |
| M40 | Signals: activity correlation       | Correlate supported authentication/audit events with configuration history. Keep event telemetry in an appropriate store and reference it from receipts.                         | Pending |
| M41 | Triage: vulnerability context       | Incorporate supported vulnerability and asset inputs with provenance, freshness, and explainable prioritization.                                                                 | Pending |
| M42 | Dispatch: richer integrations       | Add ticketing, SIEM, and security-tool integrations with scoped permissions, delivery guarantees, and auditable workflows.                                                       | Pending |
| M43 | Optional active-response SOAR       | Make a separate product decision defining permitted writes, approvals, execution identities, precondition checks, and verification. This changes the read-only product boundary. | Pending |

## Milestone 1 deliverables

Completed documentation (design requirements, not tested application behavior):

- [Product contract](docs/PRODUCT_CONTRACT.md)
- [Resource/property coverage](docs/COVERAGE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Acceptance cases and completion evidence](docs/ACCEPTANCE_CASES.md)
- [ADR 0002: initial product contract](docs/decisions/0002-initial-product-contract.md)
- [MIT license](LICENSE), selected by the repository owner

The following deliverables are documented:

1. Initial resource/property coverage for Conditional Access and protected role assignments, including referenced identities.
2. The initial operator and ownership model: one organization in a self-hosted deployment.
3. Data flow and trust boundaries, including private snapshot repositories and operational state.
4. Collection interval, expected scale, staleness handling, and the initial test environment.
5. Initial security checks and the policy decisions they represent.
6. Credential/permission strategy and explicit handling of missing access.
7. Explicitly deferred tool selections and the selected MIT software license.
8. Acceptance examples for compliant, noncompliant, unknown, and out-of-scope data.

M01 validation covers internal links, document structure, all eight deliverables, roadmap status consistency, and independent scope/threat review against primary API documentation. M01 acceptance cases remain specifications; live API probes and security controls are not implemented. M02 adds foundation tests and CI without implementing those domain behaviors.

## Milestone 2 deliverables

- Pinned Node/npm, exact development dependencies, and an npm-generated integrity lockfile.
- Strict TypeScript ESM compilation and expected-error compiler guards.
- Prettier formatting and portable install/check/build/test commands.
- A help/version-only CLI with five subprocess tests; no collector or domain schema.
- SHA-pinned, read-only GitHub Actions verification on Linux and Windows.
- [Development instructions](docs/DEVELOPMENT.md), synchronized contribution guidance, and [ADR 0003](docs/decisions/0003-toolchain.md).

M02 validation: [locked-install CI passed on Linux and Windows](https://github.com/soybeanfarmer/petty/actions/runs/37768413796), including pinned toolchain verification, formatting, strict type checking, clean compilation, all five CLI subprocess tests, and unchanged tracked files. Independent toolchain/CI review found no blockers. The CLI does not implement the M01 security acceptance specifications.

## References

Verify API support, permissions, service limits, and tool versions when implementing each milestone.

- [Microsoft Graph best practices](https://learn.microsoft.com/graph/best-practices-concept)
- [Microsoft Graph pagination](https://learn.microsoft.com/en-us/graph/paging)
- [Microsoft Graph application authentication](https://learn.microsoft.com/en-us/graph/auth-v2-service)
- [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
- [Azure Container Apps Jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs)

## Milestone 3 deliverables

- Version 1.0.0 strict runtime schemas and inferred TypeScript types for nine contract families.
- Tenant-bound typed references, explicit value/null/missing/unsupported fields, approved baseline assertions, and retained per-scope observations.
- Pure validation of duplicates, scope/coverage counts, relationship closure, receipt pins/outcomes, precise chronology, and required-evidence freshness.
- Generated Draft 2020-12 structural JSON Schema with documented semantic limits.
- Behavioral contract tests alongside the existing foundation checks, and [ADR 0004](docs/decisions/0004-data-contracts.md).
- [Data contract documentation](docs/DATA_CONTRACTS.md), including remaining authentication, fingerprint, rule, collector, and migration gates.

M03 verification: 51 tests, strict type checks, clean builds, formatting, locked fresh installs, and structural schema export pass on Linux and Windows. Independent contract/API reviews found no remaining blockers. Execution evidence is recorded in the milestone PR. Minimal test builders do not replace M04's reviewed scenario datasets. The help/version CLI is unchanged.

## Milestone 4 deliverables

- [Synthetic tenant corpus](fixtures/tenant-scenarios/README.md): 25 self-contained scenarios, with 18 contract-valid inputs and seven rejection cases.
- A versioned scenario catalog maps evidence to M01 acceptance cases, explicit evaluation time, contract validation expectations, and prospective outcomes for the three initial checks.
- Saved-file tests verify contract acceptance/rejection, declared rejection stage/classification, exact catalog/file coverage, unchanged approvals on risky changes, retained history/provenance, empty versus omitted approvals, mixed-age evidence, tenant binding, and literal untrusted labels.
- No generated decisions, findings, fingerprints, credentials, or live tenant data. The help/version CLI is unchanged.

M04 verification: all 88 tests, formatting, strict types, clean builds, locked fresh installs, structural schema export, and unchanged tracked checkout pass on Linux and Windows. Internal links and independent scenario/test review are complete; execution evidence is recorded in the milestone PR. Policy outcomes remain M08 specifications; M05 implements CLI fixture import; M06 is the next implementation gate for canonicalization.

## Milestone 5 deliverables

- [Clerk offline import](docs/IMPORT.md) for closed snapshots and evaluation bundles, with explicit configured-tenant binding.
- Regular local-file input with 8 MiB/64-level limits, strict UTF-8 JSON, and duplicate-key rejection.
- Bounded JSON summaries expose incomplete scopes, retained original intervals, unavailable fields, baseline presence, and counts without security judgments or tenant-controlled labels.
- Sanitized JSON diagnostics and documented exit codes; no writes, network requests, canonicalization, or policy execution.
- Compiled CLI tests cover all 25 saved scenarios and the import boundary on Linux and Windows.

M05 verification is recorded in the milestone PR. M06 remains pending.
