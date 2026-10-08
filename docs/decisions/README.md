# Architecture decision records

Use architecture decision records (ADRs) for consequential choices that affect Petty's product boundary, data model, security, deployment, or long-term maintenance.

## Existing records

- [0001: Base architecture](0001-base-architecture.md)
- [0002: Initial product contract](0002-initial-product-contract.md)
- [0003: Repository toolchain](0003-toolchain.md)
- [0004: Versioned data contracts](0004-data-contracts.md)

## Process

1. Describe the context and alternatives.
2. Record the selected decision and its consequences.
3. State the decision's status: proposed, accepted, or superseded.
4. Identify relevant roadmap milestones.
5. Keep unresolved implementation choices explicitly open.
6. If a decision changes, add a new record and link the superseded decision.

Routine implementation details do not require an ADR. Accepted records should reflect an actual project decision rather than imply approval of a speculative choice.

## Suggested structure

- Title and sequential ID
- Status and date
- Related milestones
- Context
- Decision
- Consequences
- Open questions or links to superseding records
