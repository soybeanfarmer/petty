# Shared data contracts

M03 defines Petty's persisted data vocabulary at schema version `1.0.0`. These contracts cover the initial Entra allowlist, `entra-core/1`; they are not a model of an entire Microsoft tenant.

## Entry points and validation

Import from `src/contracts/index.ts`. The public entry point takes untrusted input, returns typed data or classified issues, and performs no I/O, coercion, defaults, or clock reads:

```ts
const result = validateContract("evaluationBundle", input, {
  expectedTenantId: configuredTenantId,
});
if (!result.success) {
  // Report classifications and paths; do not log the original tenant payload.
  return result.issues;
}
const bundle = result.data;
```

Callers at ingestion must supply the configured tenant binding. Nested tenant consistency alone cannot identify a payload that consistently claims the wrong tenant. Binding is a caller-supplied assertion, not authentication; job/credential/destination authorization is implemented in later milestones.

Exported Zod schemas validate structure. `validateContract` also validates the invariants available inside its input. Validate a snapshot to check resource/relationship closure; validate an evaluation bundle to check receipt evidence against its snapshot and baseline. Validating a receipt alone cannot establish external artifact existence or evidence freshness. Do not use individual-document parsing as a substitute for closed-context validation.

All object schemas reject unknown keys, including nested properties. Unknown schema/allowlist versions are rejected; there is no automatic upgrade, permissive fallback, or migration in M03. IDs, timestamps, and explicit unavailable states survive parsing unchanged.

## Contract families

| Family            | Purpose                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Resource          | Allowlisted CA policy, active role assignment, role definition, or referenced principal.               |
| Relationship      | A typed source field points to a resource, directory object, or role template; resolution is explicit. |
| Manifest          | Latest collection attempt plus the last trustworthy observation for each declared scope.               |
| Baseline          | Tenant-bound, versioned approved policy with explicit approval metadata and approved ID sets.          |
| Assessment        | One subject and a pass, fail, unknown, or not-applicable outcome with reason codes.                    |
| Finding           | Observed/expected facts describing a failing assessment.                                               |
| Receipt           | An assessment, optional failure finding, evidence references, and pinned provenance.                   |
| Snapshot          | One manifest, retained resources, and relationships with matching tenant/scope/observation references. |
| Evaluation bundle | One snapshot, optional approved baseline, and receipts whose references can be checked together.       |

TypeScript types are inferred from schemas. No parallel hand-maintained interface model is required.

## Resource and field vocabulary

Tenant, principal, policy, and role-template IDs are canonical lowercase GUIDs. Graph assignment and role-definition IDs are opaque strings; they are not assumed to be GUIDs. Opaque IDs allow punctuation but reject control characters and have bounded length. IDs are data: never interpolate them into filesystem paths, commands, URLs, or shell expressions.

Resources record tenant ID, kind, resource ID, and original observation ID. Properties are mandatory wrappers with exactly one state:

| State         | Meaning                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `value`       | The supported typed value was observed. An empty list is a known empty set.                                                   |
| `null`        | The upstream property was explicitly null. It is not an empty list or approved value.                                         |
| `missing`     | Unavailable with a bounded reason: not returned/requested, permission denied, or unresolved reference.                        |
| `unsupported` | An unknown enum, unsupported semantics, or unsupported API prevents interpretation. Raw unsupported values are not persisted. |

Missing keys, extra properties, arbitrary profile blobs, and unknown values inside known enums are rejected. A collector must deliberately map unavailable/unsupported input to a wrapper; the validator does not invent one. Missing/unsupported fields cannot serve as known evidence for a current decision. Null required IDs, CA state, and targeting sets are unavailable; an explicit null assignment scope can evidence the absence of that scope. The rule engine must still interpret which scope combination applies. Unrelated fields can remain unavailable without invalidating a narrow state check.

Initial CA fields are display name, state, and six explicit user/group/role targeting sets. User targeting uses a separate namespace for `All`, `None`, and `GuestsOrExternalUsers`: inclusion supports all three, exclusion supports only the guest/external token. Groups use directory-object IDs; CA roles use role-template IDs. Symbolic targets are values, not fabricated directory objects or relationship nodes. Detailed guest/external filters, applications, conditions, grant/session controls, and effective access are outside this allowlist.

Assignment fields are principal ID, role-definition ID, directory scope, and app scope. Two known scope IDs are a conflict and are rejected. Unknown/null scope semantics are preserved for a later check to classify. Definition fields include template ID, built-in/enabled flags, version, and optional label; structurally representing a custom definition does not enable custom-role analysis. Principal type/name enrichment may be unavailable. Label resolution is not an authorization key.

A relationship must agree with its source kind, source field, and target namespace. Within a snapshot, its source field must contain that target; a resolved target must exist. An absent target stays explicitly unresolved with a reason. Source observation IDs are preserved even when the target came from another scope interval. Relationships are derived views; M06 will define deterministic construction and canonical serialization.

## Attempts, observations, and coverage

A manifest declares selected scopes and their latest attempt. Every latest scope attempt belongs to the manifest's attempt ID and has its own interval, bounded error codes, fetched-page count, and pagination completion. Scope IDs bind fixed endpoint families from [coverage](COVERAGE.md); arbitrary upstream URLs/bodies are not persisted. Each observation records its own original interval, attempt/observation IDs, resource count, supported/unsupported field paths, and original schema, collector, API, allowlist, and source provenance. Retention after a collector upgrade preserves the old provenance; a complete latest observation must match the current attempt's provenance.

A complete latest attempt requires at least one fetched page, completed pagination, no errors, and its own retained observation with the same interval. A partial, failed, or unsupported attempt records a bounded cause code and may retain only an earlier trustworthy observation, or null if none exists. New partial data is staged outside the canonical snapshot. Retained historical completeness/lineage is a collector assertion that M15 must verify. Incompatible schema/allowlist versions are rejected, including on retained observations; preserve such history as separate versioned artifacts until a reviewed migration exists.

Counts agree with the snapshot and respect the M01 bounds: 250 policies, 2,000 assignments, 250 definitions, and 15,000 referenced principals. Duplicate resources, scopes, observation IDs, relationships, and set members are rejected. Known/null resource fields must be declared in the scope's supported paths. Supported and unsupported path lists cannot overlap.

Listing completion does not prove every required property is known. An unavailable field remains explicit even on a completed page sequence. Unsupported path names disclose coverage without retaining their values. Ingested byte/page budgets and safe upstream pagination still require collector/importer controls.

No cross-endpoint snapshot is atomic. Each evidence dependency has its actual observation interval. A failed latest role scope does not invalidate a check using only a complete policy scope; a failed latest required scope blocks a current decision even if retained evidence is nominally fresh.

## Baselines, assessments, and receipts

A baseline records ID/version and an operator ID/approval timestamp. CA policy requirements, per-policy exclusion approvals, and protected-role direct assignment approvals remain separate from observations. Optional sections and omitted exclusion sets remain absent; explicit empty approved sets allow no members. There is no self-approval or inferred default. M07 adds baseline authoring and rule-specific required-input interpretation; M22 verifies approval governance and exception validity.

Assessments expose all four outcomes. Exactly a fail carries a finding in its receipt, and the finding identifies that assessment. A current pass/fail/not-applicable requires a baseline reference and evidence grounding the subject. Unknown can record missing inputs without inventing evidence. Validation checks consistency of a claimed result; it does not run a rule or prove the claimed result is correct.

Resource evidence names a field on a retained resource/observation. Absence evidence names a missing resource and its listing scope/observation; it does not fabricate a resource node. In a bundle, current decisions require every referenced scope's latest attempt to be complete and original start time to be within 7,200 seconds of the explicit evaluation time. The boundary is inclusive. UTC timestamps require seconds, preserve fractional precision, and compare precisely beyond milliseconds. Evaluation cannot predate its manifest, evidence end, or pinned baseline approval.

Provenance pins snapshot ID/fingerprint, manifest ID, baseline ID/version/fingerprint, rule ID/version, engine version, contract/allowlist versions, reference-data IDs/versions/fingerprints, evaluation time, and freshness limit. Fingerprints are 64-character lowercase hexadecimal assertions in M03; M06 computes canonical fingerprints. Approval metadata and hashes do not authenticate an operator, prove digest equality, make Git immutable, or establish rule correctness. M09/M11 add actual receipt generation and replay.

Free-text names, finding summaries, and facts are bounded and remain untrusted data. Strict objects prevent accidental extra fields; they do not redact a secret embedded in accepted text. Later collectors/reporters must apply the threat model's minimization, escaping, redaction, and destination checks. M03 issues return classifications and paths without echoing rejected values.

## JSON Schema and versioning

Run `npm run schemas:export` to build and write nine Draft 2020-12 structural schemas under ignored `dist/schemas/`. Each has a versioned URN, explicit version literals, and strict object definitions. Generated files are derived artifacts, not the source of truth.

JSON Schema exports describe structure only. They do not encode cross-document tenant binding, duplicates, chronology, retained-observation lineage, evidence closure, or freshness. Consumers must use the TypeScript validator (or implement the same documented invariants). There is no claim of full validation parity with JSON Schema consumers.

Change persisted meaning through a reviewed contract/allowlist version. Old-version parsing, migrations, compatibility, and historical rule loading must be designed and tested before they are supported; current validation accepts only the declared version.

## Verification and next milestone

M03 tests cover strict parsing, unavailable states, tokens/namespaces, duplicate identities, scope conflicts, configured/nested tenant binding, relationship closure, collection failure/retention, count/coverage consistency, precise chronology/freshness, baseline omissions, absence evidence, and receipt provenance/outcome linkage. Existing foundation/CLI checks still run on Linux and Windows.

Minimal unit-test builders exercise contracts. [M04's saved scenarios](../fixtures/tenant-scenarios/README.md) add reviewed inputs for compliant state, risky changes, missing permissions, partial collection, and malformed data. Their prospective outcomes are specifications, not computed receipts. M05 adds an importer; M06 canonicalizes the model; M08 makes deterministic policy decisions.

## API references

- [Zod strict objects and validation APIs](https://zod.dev/api)
- [Zod JSON Schema export limitations](https://zod.dev/json-schema)
- [Microsoft Graph CA user targeting](https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessusers?view=graph-rest-1.0)
- [Microsoft Graph role assignment IDs and scope fields](https://learn.microsoft.com/en-us/graph/api/resources/unifiedroleassignment?view=graph-rest-1.0)
