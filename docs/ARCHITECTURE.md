# Architecture

## Status and scope

This document records the intended architecture. The repository foundation has a help/version-only CLI; tenant-monitor modules and deployment are not implemented yet.

Petty is one modular TypeScript application, initially executed on Node.js LTS and packaged in Docker. The first release targets a single organization's self-hosted monitor. Azure Container Apps and Container Apps Jobs are the later managed deployment target.

M01 defines the first scope in the [product contract](PRODUCT_CONTRACT.md) and [coverage matrix](COVERAGE.md): selected Conditional Access state/targeting, active directory role assignments and built-in definitions, and referenced principals. Initial checks do not expand memberships or simulate effective access. All coverage claims must identify supported resources and properties. The [threat model](THREAT_MODEL.md) and [acceptance cases](ACCEPTANCE_CASES.md) define later verification requirements.

## Module relationships

```text
Tenant APIs
    |
    v
Clerk -- normalized resources + collection manifest --> Ledger
                                                        |
                            +---------------------------+------------------+
                            |                           |                  |
                            v                           v                  v
                      Paper Trail                   Inspector         Guest List
                            |                           ^                  ^
                            |                      Ground Rules -----------+
                            +---------------------------+------------------+
                                                        |
                                                        v
                                              Findings -> Triage
                                                        |
                                                        v
                                              Receipts -> Dispatch

Reviewed outcomes + bounded evidence -> Drafts -> Replay -> human review
                                                            |
                                                            v
                                                  versioned rule release
```

Clerk is a data-source module, not the parent of the application. Ledger supplies the shared model. Security modules must work against saved snapshots without connecting to Microsoft.

## Planned boundaries

The following contracts are conceptual; their TypeScript signatures are defined in M03.

| Boundary           | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| Tenant source      | Collect a declared resource scope and report coverage.                           |
| Snapshot store     | Stage, validate, fingerprint, publish, and retrieve configuration snapshots.     |
| Policy store       | Retrieve an approved baseline and its version.                                   |
| Check evaluator    | Produce assessments and findings from versioned inputs.                          |
| Receipt store      | Persist evidence and provenance for findings and workflow actions.               |
| Job runner         | Execute collection/evaluation/publishing with bounded retries and durable state. |
| Delivery adapter   | Send operator-configured notifications or case updates.                          |
| Proposal evaluator | Compare candidate changes against labelled replay cases.                         |

Start with one repository and image. Modules can share a process. API and background execution can later run as separate processes using the same core code; this does not require a microservice per module.

## Observed state, approved state, and history

- **Observed state:** what supported APIs returned during a collection interval.
- **Approved state:** the baseline and policies an authorized operator accepted.
- **Observed change:** a meaningful difference between comparable observations.
- **Policy drift:** a deviation from approved state.
- **Activity evidence:** events that may help identify when and by whom a change occurred.

A newly collected state never silently becomes the approved baseline. Git commits track observed configuration and approved baseline changes through distinguishable workflows.

API calls occur at different times. A snapshot is a collection over an interval, not an atomic copy of the whole tenant. An audit event may provide attribution; the Git commit author identifies the publisher, not necessarily the administrator who changed a setting.

## Ledger and collection integrity

Use stable resource IDs rather than names for identity. Preserve relationship references and distinguish unresolved references from missing entities.

Canonicalization must be schema-aware: sort keys and set-like collections, preserve semantically ordered lists, validate duplicate IDs, and retain values that affect behavior. Separate volatile collection metadata from configuration content so unchanged settings do not create Git churn.

A manifest records tenant binding, supported scope, collector/schema versions, start/end time, endpoint status, freshness, completion, and errors. Missing permissions, unsupported APIs, or failed pages must not create apparent deletions or passing assessments.

Stage collection attempts independently from the accepted configuration. Publish only validated data for a declared scope; retain the previous trustworthy state when a new attempt is incomplete. Preserve each retained scope's original collection interval and coverage. Make mixed-age relationships explicit when scopes have different freshness; a merged view must not appear to be one current tenant snapshot. Expose incomplete coverage and stale state to operators and checks.

Publish snapshots coherently, with per-tenant job coordination and guarded Git reference updates. Retry safely. Git history is useful evidence but can be rewritten; repository permissions and baseline review are part of the integrity model.

## Deterministic evaluation and receipts

The same versioned facts, policy, rules, engine, schema, reference data, and evaluation context must reproduce the same security decision. Any time-dependent check must receive an explicit evaluation time.

Checks report pass, fail, unknown, or not applicable. A required policy existing or being enabled does not by itself prove effective MFA coverage. Access reviews must distinguish supported direct/inherited relationships, active/eligible privileges, and resource scopes.

Receipts preserve enough context to reproduce the decision: input fingerprints, rule identity/version, observed/expected facts, relevant relationship paths, evidence, outcome, and provenance. Priority scores explain their individual contributions.

Operational metadata may differ between collection attempts without changing the configuration fingerprint. Historical replay must not silently substitute today's threat intelligence, group state, policy, or clock.

## AI improvement loop

Drafts reviews bounded evidence and labelled outcomes. It proposes structured changes to checks, prioritization, or workflows; it cannot redefine the approved baseline or modify tenant configuration.

Replay evaluates candidate changes against regression and held-out cases. Rule releases require review, evidence, versioning, and a rollback path. Evaluate missed violations, false positives, execution performance, and changed decisions separately.

Treat tenant-controlled text as untrusted data. Record proposal/model provenance and constrain data access and budgets. Routine collection and decision execution must remain functional when the AI provider is unavailable.

## Storage responsibilities

| Data                                                                 | Intended home                                         |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| Canonical supported configuration and approved baselines             | Controlled private Git repository                     |
| Collection attempts, connections, jobs, locks, and indexing metadata | Operational database selected in M17                  |
| Credentials and tokens                                               | Appropriate secret/token storage, never Git snapshots |
| High-volume authentication/audit/vulnerability telemetry             | Appropriate operational or event storage              |
| Public demonstrations                                                | Synthetic fixture files                               |

The implementation repository and tenant evidence repository serve different purposes. Public code does not make real tenant data public.

## Deployment path

1. CLI and offline fixtures establish the shared contracts.
2. A single-tenant collector uses documented read permissions.
3. Docker Compose provides the first self-hosted deployment.
4. The same application image later supports an API and scheduled/event-driven jobs in Azure.
5. Hosted onboarding requires isolation of tenants across all data and execution paths.

Managed identities, secret references, durable state, retry-safe execution, and least-privilege deployment identities must be chosen and tested as the managed deployment is implemented.

## Deferred decisions

See [ADR 0001](decisions/0001-base-architecture.md) for the base architecture and [ADR 0002](decisions/0002-initial-product-contract.md) for the initial scope and MIT license. Active remediation is a separate optional product boundary in M43.
