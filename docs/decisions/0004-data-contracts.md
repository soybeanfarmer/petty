# ADR 0004: Versioned data contracts

- Status: Accepted
- Date: 2026-10-08
- Related milestones: M03, M04–M11

## Context

Clerk, Ledger, Ground Rules, Inspector, and Receipts need a shared language before fixture import and deterministic checks. TypeScript types alone do not validate untrusted persisted input. The product contract requires explicit unavailable states, per-scope historical evidence, tenant binding, approved policy, and reproducible decisions.

## Decision

Use exact runtime dependency Zod 4.6.5, with strict objects and inferred TypeScript types. Define schema version 1.0.0 and initial field allowlist entra-core/1 for resources, relationships, manifests, baselines, assessments, findings, receipts, snapshots, and evaluation bundles.

Use pure validateContract for structural parsing plus the consistency checks possible within the supplied context. Ingestion supplies an expected tenant ID. Snapshot/bundle validation verifies local reference closure; individual documents cannot prove external inputs. Preserve missing/null/unsupported states and optional baseline omissions without coercion or defaults.

Keep latest attempts separate from retained trustworthy scope observations. Current decisions need complete, fresh required evidence at an explicit evaluation time; unknown remains visible. Export Draft 2020-12 JSON Schema as a structural interoperability aid, with its semantic limits documented.

## Alternatives

Handwritten parsing would add repeated type/validation maintenance. JSON Schema plus a validator library would require a separate strategy for inferred TypeScript types and application invariants. Zod provides a single structural definition and an exporter; custom pure code remains appropriate for reference/chronology checks.

## Consequences

Zod is the first runtime dependency and is locked exactly. Contract parsing performs no network/file/clock operations and does not decide whether an observed configuration complies with a rule. Generated JSON Schema is structural only.

Hashes, baseline approvals, and retained historical completeness are assertions at this stage. Canonical fingerprints, authenticated approval, actual collectors, rule execution, reporting, replay, and migrations remain later gates. Count/string bounds do not replace importer byte limits or collector pagination safeguards.

See [data contracts](../DATA_CONTRACTS.md) for normative fields, invariants, versioning, and tests.
