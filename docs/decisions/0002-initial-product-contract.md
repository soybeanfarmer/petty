# ADR 0002: Initial product contract

- **Status:** accepted initial scope and design targets under the authorized M01 work.
- **Date:** 2026-10-07.
- **Related milestones:** M01, M03–M16, M24–M28.
- **License:** MIT, explicitly selected by the repository owner.

## Context

Petty's first implementation needs a bounded, useful security problem and reproducible offline examples. Starting with every Microsoft workload, effective access simulation, or active SOAR response would prevent a small collector/check loop from being verified.

## Decision

Start with one organization's self-hosted commercial Microsoft tenant, Graph v1.0, a separate private evidence repository, and the explicit allowlist in [coverage](../COVERAGE.md). Collect CA state/targeting, active role assignments and built-in definitions, and referenced principal IDs with optional labels. Exclude membership expansion, PIM eligibility/schedules, effective policy enforcement, other workloads, and tenant mutations from the initial contract.

Implement three narrow policy checks: required CA state, approved explicit exclusions, and approved direct protected-role assignments at tenant scope. Use four outcomes and never approve observation automatically.

Adopt the [product contract](../PRODUCT_CONTRACT.md) as initial design targets: hourly scans, 20-minute attempt deadline, 120-minute per-scope freshness limit, declared scale envelope, owner-managed Git retention, and pilot recovery objectives. These targets require later measurement and implementation proof.

Use the [MIT license](../../LICENSE) for source distribution. Authentication/permission candidates require live validation in M12; [ADR 0003](0003-toolchain.md) resolves M02 tooling; database/framework choices remain deferred to their roadmap milestones.

## Alternatives considered

- Whole-tenant configuration export: defer until individual workload coverage is supported.
- Event-driven SIEM/SOAR first: defer activity sources and write authorization.
- Expand every group/PIM access path initially: defer semantics and permission complexity.
- Put live evidence in the source repository: reject because tenant evidence is sensitive.
- AI makes operational decisions: retain deterministic execution and reviewed proposals.

## Consequences

The offline demo can demonstrate the core model with three small checks. Narrow passes are not tenant-wide safety claims. Unmonitored CA changes can be missed and must be disclosed. Git is useful history but is not immutable evidence. Scope, freshness, and lifecycle changes require updated contracts and tests.

[Threat model](../THREAT_MODEL.md) and [acceptance cases](../ACCEPTANCE_CASES.md) establish later verification requirements. M01 does not claim those controls already work.
