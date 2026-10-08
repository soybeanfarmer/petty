# Instructions for coding agents

## Project state

Petty is a documentation-stage project. The accepted base architecture is TypeScript on Node.js LTS, packaged with Docker; Docker Compose is the initial self-hosted target, and Azure Container Apps/Jobs are the later managed target.

The source-code license is MIT. No package manager, database, API/UI framework, test runner, AI provider, or exact runtime version has been selected. Do not treat examples from conversation or proposed architecture as accepted implementation choices.

Read README.md, ROADMAP.md, docs/ARCHITECTURE.md, docs/PRODUCT_CONTRACT.md, docs/COVERAGE.md, docs/THREAT_MODEL.md, and relevant records in docs/decisions/ before changing the project. M01 establishes design requirements; future controls and acceptance cases are not implemented tests.

## Scope and workflow

- Follow the user's authorized task and preserve the agreed product direction.
- Work on a bounded milestone or clearly described part of one; do not implement the entire roadmap unless requested.
- Keep completed work and pending work distinguishable. A partial PR does not complete a milestone.
- Record consequential accepted decisions in an ADR. Routine choices can be resolved within the authorized milestone.
- Preserve existing work, verify the current branch and repository contents, and avoid destructive Git operations.
- Keep docs synchronized with actual behavior and declared resource/property coverage.

## Architecture invariants

- Clerk is a collector module. Ledger is the shared versioned tenant model.
- Start as one modular application; separate modules do not imply separate services.
- Routine decision execution uses deterministic, versioned code.
- AI proposes structured improvements outside the operational decision path; proposals require replay evidence and authorized review before release.
- Observed snapshots never silently become approved baselines.
- Collector failures, unsupported APIs, and missing permissions yield explicit unknown coverage.
- Missing data in an incomplete collection must not imply deletion or a passing check.
- Preserve the last trustworthy configuration and disclose its age when a later attempt fails.
- Resource IDs and schema-aware canonicalization produce meaningful diffs. Preserve semantically ordered arrays.
- Record collection intervals; do not claim an atomic tenant copy or attribution from a Git commit.
- Historical evaluation uses explicit versions and time/reference context.
- Read-only tenant access is separate from Git publishing and operational-state writes.
- Active remediation is outside the monitor's current scope.

## Data handling

Do not commit real tenant snapshots, credentials, tokens, private keys, sensitive logs, or production receipts to this public code repository.

Use synthetic fixtures. Treat resource names, descriptions, and other tenant-controlled strings as untrusted data. Preserve tenant binding across job state, credentials, storage, Git destinations, logs, and AI requests.

## Validation

Use existing documented checks once M02 establishes the toolchain. Test behavior that matters: canonicalization, cross-tenant rejection, partial collection, permission failure, meaningful diffs, policy interpretation, provenance, and safe retries.

Documentation-only changes need link, structure, milestone, and consistency verification rather than invented application tests. State what was actually run and any unresolved limitations.

Do not claim production readiness, complete tenant coverage, effective policy enforcement, immutable Git history, or passing CI without evidence.

## Communication

Explain the user-visible outcome, the relevant validation, and material limitations. Keep roadmap IDs stable and update status only when completion gates are met.
