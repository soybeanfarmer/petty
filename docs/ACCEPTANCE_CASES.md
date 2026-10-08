# M01 acceptance cases

These are synthetic behavioral specifications, not executable fixtures or passing tests. M03 defines schemas, M04 creates datasets, and later milestones implement and verify the expected behavior.

## Shared example policy

All names and IDs below are logical synthetic identifiers. M04 will use schema-valid synthetic IDs.

- Tenant `tenant-a` requires `ca-required` to be enabled.
- `ca-required` allows only `user-emergency` in `excludeUsers`; its approved group and role exclusion sets are empty.
- Built-in role `role-protected` allows direct tenant-wide assignment to `user-admin` and `group-admins` only.
- A current compatible observation is complete for all fields/scopes needed by the tested check.
- Explicit evaluation time is `2026-10-07T12:00:00Z`; fresh example observations start at `11:00:00Z`.
- The initial 120-minute freshness threshold applies. Optional display names are not approval keys.

## Policy and collection cases

| ID  | Input/change                                                                                                 | Expected result                                                                                                                              | Implementation gates |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| A01 | Required policy enabled; only approved user exclusion; protected role assigned to approved principal at `/`. | Three narrow passes; no violation finding. Coverage still discloses unmonitored CA fields/access paths.                                      | M04, M08, M09        |
| A02 | Required policy becomes `disabled`.                                                                          | Fail with observed/expected state and exact policy/rule/baseline evidence.                                                                   | M08, M09             |
| A03 | Required policy becomes `enabledForReportingButNotEnforced`.                                                 | Fail: report-only does not meet the approved enabled-state predicate.                                                                        | M08                  |
| A04 | Required policy absent from a complete, fresh, compatible listing.                                           | Fail required-policy check and report observed removal if the previous comparable listing contained it.                                      | M08, M10             |
| A05 | Add `user-unapproved` to explicit user exclusions.                                                           | Fail exclusion check; receipt identifies the typed set and unapproved ID.                                                                    | M08, M09             |
| A06 | Assign protected role to `user-unapproved` at `/`.                                                           | Fail role check; tuple/assignment ID and policy evidence recorded.                                                                           | M08, M09             |
| A07 | Protected role assigned directly to approved `group-admins`.                                                 | Pass direct assignment predicate; no claim about members or inherited privilege.                                                             | M08                  |
| A08 | Role assigned at administrative-unit scope or to an unprotected role.                                        | Not applicable to initial tenant-wide protected-role predicate; display scope/coverage limitation. Not a security approval.                  | M08, M14             |
| A09 | Required policy page fails or is not fetched; previously seen policy is absent from partial input.           | Unknown current policy assessment; no deletion. Preserve previous evidence and original time.                                                | M04, M08, M10, M15   |
| A10 | Required endpoint returns 403, times out, exceeds bounds, or exhausts retry budget.                          | Unknown affected current checks and visible collection issue; no safe/empty fallback.                                                        | M12, M15, M25        |
| A11 | Last complete required scope starts at `09:59:00Z` and evaluation is at noon.                                | Unknown current assessment due to age; prior finding remains historical.                                                                     | M08, M15             |
| A12 | Policy scope succeeds, role scope fails, and the saved view contains both.                                   | Policy-only checks may run; role check unknown. Each scope retains its actual interval; no uniformly-current snapshot claim.                 | M03, M08, M15        |
| A13 | Baseline missing, exclusion set omitted, protected definition unresolved, or required property null/omitted. | Unknown affected predicate with specific reason; distinguish missing/null from a valid empty set.                                            | M03, M07, M08        |
| A14 | Principal label lookup fails but principal ID/role/scope and required definition are valid.                  | ID-based role result remains reproducible; label marked unavailable.                                                                         | M08, M14             |
| A15 | Only an unmonitored grant/session setting changes.                                                           | No claim to detect that change; show property coverage gap. State-only pass remains narrow.                                                  | M06, M08, M10        |
| A16 | Same set-like exclusions arrive in a different order.                                                        | Identical configuration fingerprint and decisions; no ordering-only configuration commit.                                                    | M06, M10, M16        |
| A17 | Resource display name changes; assignment ID changes but approved principal/role/scope tuple is equivalent.  | Name change is metadata evidence; identity approval unchanged. Assignment replacement is observable without a false authorization violation. | M06, M08, M10        |
| A18 | Supported allowlist/schema changes between observations.                                                     | Report coverage/version change; do not infer removal from incompatible scopes.                                                               | M03, M10             |

## Security and reproducibility cases

| ID  | Input/change                                                                                            | Expected result                                                                                                 | Implementation gates    |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- |
| A19 | Payload/connection claims `tenant-b` or destination belongs to a different binding/public repo.         | Reject before publishing; no cross-tenant/public evidence leak.                                                 | M03, M12, M16, M20, M36 |
| A20 | Name contains HTML/script, shell syntax, path traversal, or instructions for an AI.                     | Treat as literal untrusted data; escaped output and ID-based path; no execution or model authority.             | M05, M21, M27, M30      |
| A21 | Duplicate IDs, excessive payload, conflicting scope, unknown state enum, or invalid targeting token.    | Reject malformed input or mark unsupported affected evidence unknown; never default to enabled/empty/safe.      | M03–M06, M08, M27       |
| A22 | API continuation targets another host or credentials appear in a report/log.                            | Reject continuation before forwarding credentials; leakage check fails.                                         | M15, M24, M27           |
| A23 | Git head changes during publication.                                                                    | Guarded update refuses overwrite; retry from inspected current history without losing either legitimate update. | M16                     |
| A24 | Re-evaluate same facts with identical baseline/rule/engine/schema/reference versions and explicit time. | Same decision/provenance despite changed runtime clock; operational attempt IDs may differ.                     | M09, M11                |
| A25 | New scan observes risky state; baseline/rule is edited without authorized release.                      | Observation cannot self-approve. Require reviewed version before using the change.                              | M07, M11, M22, M32      |
| A26 | Disconnect, restart, then request another scan.                                                         | No future credential use/scan; explicitly explain retained Git/clones/backups and owner-managed removal.        | M24, M26, M35           |
| A27 | AI provider unavailable or proposes weakening a mandatory policy.                                       | Existing deterministic checks continue; proposal fails release gates without suitable evidence and review.      | M30–M33                 |

## M01 documentation completion evidence

| Roadmap requirement                                             | Evidence                                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Resources/properties and initial checks                         | [Coverage](COVERAGE.md), A01–A08, A13–A18                                                       |
| Operator, ownership, data lifecycle, deployment                 | [Product contract](PRODUCT_CONTRACT.md), [ADR 0002](decisions/0002-initial-product-contract.md) |
| Frequency, scale, staleness, test environment, recovery targets | Product contract; A09–A12, A26                                                                  |
| Credential/read-permission strategy and missing access          | Product contract and coverage; A10, A14, A19, A22                                               |
| Trust boundaries and security requirements                      | [Threat model](THREAT_MODEL.md), A19–A27                                                        |
| Tool decisions and software license                             | Product contract open decisions; [MIT license](../LICENSE)                                      |
| Compliant, noncompliant, unknown, out-of-scope examples         | A01; A02–A06; A09–A14; A08/A15                                                                  |

Document validation and independent design review complete M01's documentation gate. These examples do not prove API access, runtime safeguards, application tests, or production support.
