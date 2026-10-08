# ADR 0001: Base architecture

- **Status:** accepted for the base architecture; implementation choices remain open.
- **Date:** 2026-10-07.
- **Related milestones:** M00, M01, M02, M03, M17, M24, M34.

## Context

Petty is a security monitor that preserves configuration evidence, evaluates explicit policies, and can later use AI to propose tested improvements. The user intends to build it incrementally as a GitHub portfolio project with a path to production.

The system must support offline replay, agentless Microsoft collection, read-only monitoring, self-hosting, and a managed deployment path.

## Decision

Use TypeScript and Node.js LTS for the application. Package the application in Docker and target Docker Compose for the initial self-hosted release. Use Azure Container Apps and Container Apps Jobs for the later managed deployment.

Build a modular application around a shared versioned tenant model. Keep collection, evaluation, snapshot publishing, and execution scheduling behind explicit boundaries. Git tracks canonical configuration and approved baselines; an operational store handles jobs and application state.

Run versioned deterministic checks in routine operation. AI proposes changes outside the decision path; proposals pass replay evaluation and authorized review before release.

## Consequences

- The first milestone can be tested using synthetic inputs without a live tenant.
- Modules share contracts without requiring separate services.
- Self-hosting and managed hosting reuse the same core logic.
- Production configuration exports require private storage and explicit support coverage.
- Tenant read access is separate from writes to Petty's state and Git repository.
- API limits, permission gaps, partial collection, and temporal inconsistency remain visible.
- Bun or Cloudflare adapters may be evaluated later, but are not current deployment targets.

## Open implementation decisions

| Decision | When to resolve |
| --- | --- |
| Supported resources, properties, checks, and threat model | M01 |
| Software license | M01, before implementation releases |
| Package manager, supported Node version, test runner, lint/format tools | M02 |
| Schema validation and policy representation | M03 and M07 |
| Microsoft authentication and credential strategy | M12 |
| GitHub App permissions and repository ownership | M16 |
| Operational database and migrations | M17 |
| API framework and frontend framework | M20 and M21 |
| Notification and case integrations | M23 |
| Backup, retention, and recovery targets | Define in M01; verify in M26 |
| AI provider, permitted data, evaluation policy, and budget | M29 through M33 |
| Managed database, region, secret storage, and deployment identities | M34 |
| Active-response authorization and product boundary | Separate decision in M43 |

This ADR does not select a database, AI provider, package manager, frontend framework, or software license.
