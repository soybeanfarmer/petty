# Synthetic tenant scenarios

M04 provides small, self-contained inputs for offline development. Every ID, name, role, approval, and observation was invented for this repository. No Microsoft credentials, network calls, or real tenant exports are needed.

There are 25 scenarios: 18 accepted inputs and seven deliberately rejected inputs. Contract-valid risky configuration is different from malformed evidence. A rejected input has no expected policy decision; an accepted input can lead to an unknown assessment.

## Files and execution

- [catalog.json](catalog.json) declares scenario format 1.0.0, contract version 1.0.0, the configured synthetic tenant, a fixed evaluation context, M01 acceptance mappings, validation expectations, and prospective check outcomes.
- Each `cases/<scenario>/input.json` is a complete evaluation bundle: snapshot, separate baseline or null, and an empty receipts list. There are no fabricated findings, decisions, or fingerprints.
- The truncated parser case uses `input.json.txt` and is explicitly ignored by Prettier. Its JSON parse must fail before contract validation.
- A comparison reference identifies an earlier reviewed input, usually compliant. It is context for later change/replay tests, not a computed diff.

From the repository root, use the pinned toolchain:

```sh
npm ci --ignore-scripts
npm run check
```

To run only the saved-fixture tests after compilation:

```sh
npm run build
node --test dist/test/fixtures/scenarios.test.js
```

Tests read the checked-in files directly; they do not generate the inputs or run a policy engine. Accepted bundles must pass `validateContract("evaluationBundle", input, { expectedTenantId })`. Rejections must occur at the declared parse/contract stage with the declared issue classification. The catalog is checked for strict metadata, safe scenario IDs, unique subjects/checks, and exact file coverage. Focused assertions keep each fixture's defining evidence from drifting.

## Synthetic policy and time

The frozen evaluation time is `2026-10-07T12:00:00Z`, with a 7,200-second freshness limit. It does not follow the current clock. The compliant observation runs from 11:00 to 11:05; ordinary comparison observations run from 11:10 to 11:15. The stale policy observation starts at 09:59. Each scope keeps its own interval.

| Identity | Synthetic ID |
| --- | --- |
| Configured tenant | `00000000-0000-4000-8000-000000000001` |
| Other tenant for rejection | `00000000-0000-4000-8000-000000000002` |
| Required policy | `00000000-0000-4000-8000-000000000100` |
| Emergency user | `00000000-0000-4000-8000-000000000201` |
| Approved user | `00000000-0000-4000-8000-000000000202` |
| Approved group | `00000000-0000-4000-8000-000000000203` |
| Unapproved user | `00000000-0000-4000-8000-000000000204` |
| Protected role definition | `role-definition/synthetic-protected` |
| Role template | `00000000-0000-4000-8000-000000000301` |
| Primary assignment | `assignment/synthetic-primary` |

The synthetic baseline requires the policy to be enabled, approves only the emergency user as an explicit user exclusion, approves empty group/role exclusion sets, and permits direct tenant-wide assignment of the protected role to the approved user or group. This is a test policy, not recommended tenant hardening or a real authorization record. Template IDs and built-in flags are synthetic assertions, not claims of membership in Microsoft's role catalog.

Risky observation cases keep the original baseline unchanged. Omitted/empty approval examples use distinct baseline versions; a missing baseline remains null. Observation never self-approves.

Partial/failed retained cases keep the compliant scope's exact original resources, interval, observation ID, and collector provenance. A newer synthetic collector version records the failed attempt without relabeling the older evidence. First denied collection has no retained policy observation. Optional missing labels do not erase usable IDs.

## Scenario catalog

The expected outcomes below are reviewed specifications for M08's three narrow predicates. M04 does not verify those decisions. Pass does not establish effective MFA, comprehensive compliance, group membership, or effective privilege. Not applicable is not a security endorsement. Unspecified checks are deliberately omitted.

| Scenario input | M01 cases | Contract expectation | Prospective checks |
| --- | --- | --- | --- |
| [compliant](cases/compliant/input.json) | A01 | accept | state: pass; exclusions: pass; role: pass |
| [approved-group-assignment](cases/approved-group-assignment/input.json) | A07 | accept | state: pass; exclusions: pass; role: pass |
| [disabled-required-policy](cases/disabled-required-policy/input.json) | A02 | accept | state: fail; exclusions: pass; role: pass |
| [report-only-required-policy](cases/report-only-required-policy/input.json) | A03 | accept | state: fail; exclusions: pass; role: pass |
| [required-policy-absent](cases/required-policy-absent/input.json) | A04 | accept | state: fail; role: pass |
| [unexpected-user-exclusion](cases/unexpected-user-exclusion/input.json) | A05 | accept | state: pass; exclusions: fail; role: pass |
| [unapproved-role-assignment](cases/unapproved-role-assignment/input.json) | A06 | accept | state: pass; exclusions: pass; role: fail |
| [scoped-role-assignment](cases/scoped-role-assignment/input.json) | A08 | accept | state: pass; exclusions: pass; role: not-applicable |
| [partial-policy-retained](cases/partial-policy-retained/input.json) | A09 | accept | state: unknown; exclusions: unknown; role: pass |
| [permission-denied-no-policy-history](cases/permission-denied-no-policy-history/input.json) | A09, A10 | accept | state: unknown; exclusions: unknown; role: pass |
| [failed-role-retained](cases/failed-role-retained/input.json) | A10, A12 | accept | state: pass; exclusions: pass; role: unknown |
| [stale-policy-scope](cases/stale-policy-scope/input.json) | A11 | accept | state: unknown; exclusions: unknown; role: pass |
| [omitted-exclusion-approval](cases/omitted-exclusion-approval/input.json) | A13 | accept | state: pass; exclusions: unknown; role: pass |
| [missing-baseline](cases/missing-baseline/input.json) | A13 | accept | state: unknown; exclusions: unknown; role: unknown |
| [unsupported-policy-state](cases/unsupported-policy-state/input.json) | A13, A21 | accept | state: unknown; exclusions: pass; role: pass |
| [optional-label-unavailable](cases/optional-label-unavailable/input.json) | A14 | accept | state: pass; exclusions: pass; role: pass |
| [empty-approved-exclusions](cases/empty-approved-exclusions/input.json) | A13 | accept | state: pass; exclusions: fail; role: pass |
| [untrusted-display-name](cases/untrusted-display-name/input.json) | A20 | accept | state: pass; exclusions: pass; role: pass |
| [duplicate-resource-id](cases/duplicate-resource-id/input.json) | A21 | reject-contract | No policy decision |
| [nested-tenant-mismatch](cases/nested-tenant-mismatch/input.json) | A19 | reject-contract | No policy decision |
| [configured-tenant-mismatch](cases/configured-tenant-mismatch/input.json) | A19 | reject-contract | No policy decision |
| [conflicting-assignment-scope](cases/conflicting-assignment-scope/input.json) | A21 | reject-contract | No policy decision |
| [raw-unknown-policy-state](cases/raw-unknown-policy-state/input.json) | A21 | reject-contract | No policy decision |
| [unsupported-contract-version](cases/unsupported-contract-version/input.json) | A18, A21 | reject-contract | No policy decision |
| [malformed-json](cases/malformed-json/input.json.txt) | A21 | reject-json | No policy decision |

## Boundaries and maintenance

M05 implements fixture import through the CLI; it currently supports help/version only. M06 computes canonical fingerprints, M08 executes rules, M09 generates receipts, M10 compares changes, and M11 replays decisions. The catalog must become executable decision assertions when those gates are implemented.

Coverage follows [M01](../../docs/COVERAGE.md) and [M03](../../docs/DATA_CONTRACTS.md). Grant/session controls and other unmonitored CA paths are named as gaps without storing their values. Membership expansion, eligible/PIM access, effective enforcement, live permission probes, migrations, and safe output rendering are not tested here.

Only a subset of the [M01 acceptance cases](../../docs/ACCEPTANCE_CASES.md) is materialized. A18's fixture covers unsupported-version rejection; compatible-version change analysis remains later work. The corpus does not claim all security/operational cases are implemented.

Keep fixtures synthetic and manually review changes to both evidence and catalog. Extend the corpus when a later milestone adds behavior; do not replace an expected failure or unknown with a pass merely to make tests green. Keep rejected inputs visibly separate from supported unavailable evidence.
