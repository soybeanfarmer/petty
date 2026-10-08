# Initial threat model

- **Milestone:** M01.
- **Status:** design requirements; listed controls have not been implemented or tested.
- **Boundary:** one organization's self-hosted monitor, as defined in the [product contract](PRODUCT_CONTRACT.md).

## Assets, actors, and assumptions

Protect Microsoft/Git credentials, sensitive configuration and identity references, approved baselines, released rules, receipt provenance, operational records, and service availability. A false current pass or fabricated deletion damages the monitor's usefulness even without data theft.

Actors include an authorized operator, baseline approver, tenant administrator, host/repository administrator, compromised tenant identity, malicious resource author, unauthenticated application caller, and dependency/service provider. One person may initially hold several operational roles; the product must still distinguish observation, approval, and publication.

Host administrators and private-repository owners have privileged control of deployment and evidence. They can disable or replace Petty and may rewrite history. This initial monitor cannot guarantee trustworthy evidence against a fully compromised host/owner, a lying upstream API, or all administrator collusion. Stronger independent evidence retention requires a separate control design.

Assume tenant consent and repository ownership are authorized, cloud TLS and token validation work as documented, and an operator supplies an approved baseline. These assumptions must be checked where possible; credentials or a tenant ID appearing in configuration are not proof of correct binding.

## Data flow and trust boundaries

```text
Microsoft identity/API -> read-only Clerk -> validated per-scope Ledger
                                                 |
Approved baseline + versioned rules --------------+-> Inspector -> Receipts
                                                 |
                       private evidence Git <-----+
                       operational state/logs <---+
                       authorized UI/Dispatch <--- Receipts

Later only: authorized bounded evidence -> Drafts/provider -> Replay -> reviewer
```

Treat API responses, tenant strings, import files, continuation URLs, notification content, and later model output as untrusted inputs. Credentials are accessed through separate secret storage. The public source repository must never become a live evidence destination.

## Threat register and required gates

| ID  | Threat and impact                                                                             | Required mitigation and verification                                                                                                                                                                                                 | Roadmap gates                                 |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| T01 | Stolen credentials expose tenant/evidence data or permit unwanted writes.                     | Separate read-only collector and repository-scoped publisher identities; external secrets; rotation/revocation; no tokens in logs/reports. Prove the collector cannot mutate tenant resources.                                       | M12, M16, M24, M27                            |
| T02 | Wrong tenant or Git destination mixes organizations' evidence.                                | Bind connection, job, resources, baseline, receipt, and repository to an authoritative tenant ID. Reject mismatches and public destinations before publication. Repeat checks after reconnect/configuration changes.                 | M03, M12, M16, M20; M36 before shared hosting |
| T03 | Sensitive configuration leaks through Git, logs, UI, delivery, backups, or AI.                | Persist allowlisted fields only; synthetic public fixtures; redact logs; authorize viewers/destinations; encrypt/protect backups; separately authorize bounded AI egress.                                                            | M04, M16, M20–M27, M30, M35                   |
| T04 | Partial/stale collection produces false passes or deletions.                                  | Per-scope completion and original intervals; freshness/dependency checks; failed attempts visible; current unknown on required failure; no deletion from incomplete/incompatible scopes.                                             | M03, M08, M10, M15, M25                       |
| T05 | Malformed IDs, duplicate resources, new enums, or incorrect ordering change decisions.        | Versioned schema validation, bounded inputs, duplicate-ID rejection, schema-aware canonicalization, explicit unsupported semantics. Never convert missing data into a safe default.                                                  | M03–M06, M08, M27                             |
| T06 | Tenant names or links trigger path traversal, code execution, XSS, SSRF, or prompt injection. | ID-based paths; escape display text; no shell/code evaluation; trusted API host/version/path validation for continuations without altering paging tokens; never forward credentials off-host; bounded rendering and later AI inputs. | M05, M15, M21, M23, M27, M30                  |
| T07 | Snapshot, baseline, rule, receipt, or Git history is altered.                                 | Pin versions/fingerprints; approval distinct from observation; guarded reference updates; record expected publication ancestry and detect divergence; protect owner-controlled review workflows; restore tested backups.             | M06–M11, M16, M22, M26                        |
| T08 | An unreviewed rule/baseline/priority change hides a mandatory violation.                      | Explicit baseline review/versioning; explain priority contributions; priority never overrides mandatory policy; regression/replay evidence and controlled release/rollback.                                                          | M07–M11, M19, M22, M29–M33                    |
| T09 | API outage, throttling, floods, races, or storage exhaustion disables monitoring.             | Retry/deadline/page/size budgets; backoff; one tenant job; retry-safe publication/delivery; publish failure/staleness alerts; bounded queues and recovery exercises.                                                                 | M15–M17, M23–M27, M37                         |
| T10 | Compromised dependency, CI, or image executes attacker code with credentials.                 | Pin supported tooling/dependencies; review sensitive changes; isolate CI credentials; verify release artifacts and scan dependencies; controlled upgrades.                                                                           | M02, M24, M27, M38                            |
| T11 | Unauthorized API/UI caller reads data or changes settings/baselines.                          | Authenticate and authorize every tenant/resource/action; local/private network exposure initially; audited administrative actions; authorization tests.                                                                              | M20, M21, M24, M27                            |
| T12 | Disconnect/deletion is mistaken for erasing historical copies.                                | Publish lifecycle policy for Git, DB, logs, notifications, and backups; revoke future access; document retained clones/history and owner-required removal.                                                                           | M24, M26, M35                                 |
| T13 | AI poisoning or excessive disclosure releases unsafe changes.                                 | No AI in routine decisions; authorized minimal evidence; treat tenant text/model output as data; held-out evaluation, human review, budgets, provenance, rollback; provider outage cannot stop checks.                               | M29–M33                                       |
| T14 | Privileged host/repository administrator disables or falsifies the monitor.                   | State residual trust explicitly; operational audit/health alerts, separate backup ownership where feasible, and restore exercises. Evaluate independent retention if the deployment requires administrator-resistant evidence.       | M25–M28, M34–M38                              |

A fingerprint establishes content identity, not authenticity or immutability. Private Git, protected branches, and rulesets reduce accidental/unapproved changes but owners or configured bypass actors can retain administrative power. Do not claim these settings already exist in this repository or a tenant evidence repository.

## Required adversarial examples

[Acceptance cases](ACCEPTANCE_CASES.md) describe the inputs and expected behavior. Later tests must demonstrate:

- Missing pages, 403, throttling, timeout, stale state, and scope changes cannot create a current pass or deletion.
- Wrong tenant/repository binding is rejected before publication; no evidence reaches the wrong destination.
- Malicious names, duplicate IDs, oversized payloads, unknown semantic values, and off-host continuation URLs fail safely without token leakage or execution.
- Baseline/rule edits change versions and cannot silently approve observed state; conflicted Git updates preserve history.
- Optional missing labels do not fabricate identity details or prevent a sound ID-based check.
- Reports/logs contain no credentials; logs use only permitted sanitized metadata and public fixtures contain synthetic data.
- Recovery and disconnect behavior matches the declared lifecycle.

M01 verifies that these requirements are documented. Passing the implementation gates requires executable tests and authorized pilot evidence later.

## Residual limitations and response

Polling may miss changes between scans. Cross-API observations are non-atomic. Unsupported fields/access paths are not assessed. A revoked connection or external outage can stop collection; operators must see that loss of coverage.

A suspected credential compromise requires disconnect/revocation, separate rotation of collection/publication credentials, inspection of destinations/logs, and restoration/recollection from trusted inputs. A suspected integrity incident requires preserving available evidence and re-establishing approved baseline/rule versions before issuing current decisions. Detailed runbooks and demonstrated recovery belong to M26–M28.

## Supporting primary references

- [Graph application authentication and admin consent](https://learn.microsoft.com/en-us/graph/auth-v2-service)
- [Graph best practices: least privilege and local data storage](https://learn.microsoft.com/en-us/graph/best-practices-concept)
- [Graph paging](https://learn.microsoft.com/en-us/graph/paging)
- [GitHub protected branch behavior](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub rulesets and bypass](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
