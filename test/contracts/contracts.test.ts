import assert from "node:assert/strict";
import test from "node:test";
import {
  contractSchemas,
  structuralSchema,
  validateContract,
  type ContractKind,
  type EvaluationBundle,
  type Manifest,
  type Resource,
} from "../../src/contracts/index.js";
import {
  baseline,
  bundle,
  failFinding,
  fingerprint,
  incompleteScope,
  manifest,
  newerAttempt,
  otherTenantId,
  policy,
  policyId,
  principalId,
  receipt,
  snapshot,
  templateId,
  tenantId,
} from "./helpers.js";

function accept(kind: ContractKind, input: unknown): void {
  const result = validateContract(kind, input, { expectedTenantId: tenantId });
  assert.equal(result.success, true, result.success ? undefined : JSON.stringify(result.issues));
}
function reject(kind: ContractKind, input: unknown, code?: string): void {
  const result = validateContract(kind, input, { expectedTenantId: tenantId });
  assert.equal(result.success, false);
  if (!result.success && code)
    assert.ok(
      result.issues.some((issue) => issue.code === code),
      JSON.stringify(result.issues),
    );
}
function ca(input: EvaluationBundle): Extract<Resource, { kind: "conditional-access-policy" }> {
  const resource = input.snapshot.resources[0]!;
  assert.equal(resource.kind, "conditional-access-policy");
  return resource as Extract<Resource, { kind: "conditional-access-policy" }>;
}
function setPolicyStart(input: EvaluationBundle, start: string): void {
  const scope = input.snapshot.manifest.scopes[0]!;
  scope.latestAttempt.interval.start = start;
  scope.retainedObservation!.interval.start = start;
}

test("each contract family accepts a minimal linked synthetic example", () => {
  const examples = {
    resource: policy(),
    relationship: snapshot().relationships[0],
    manifest: manifest(),
    baseline: baseline(),
    assessment: receipt().assessment,
    finding: failFinding(),
    receipt: receipt(),
    snapshot: snapshot(),
    evaluationBundle: bundle(),
  };
  for (const kind of Object.keys(contractSchemas) as ContractKind[]) accept(kind, examples[kind]);
});
test("structural JSON Schema exports every versioned family without widening strict objects", () => {
  for (const kind of Object.keys(contractSchemas) as ContractKind[]) {
    const output = structuralSchema(kind);
    assert.equal(output.$id, "urn:petty:contracts:1.0.0:" + kind);
    assert.equal(output.$schema, "https://json-schema.org/draft/2020-12/schema");
    const serialized = JSON.stringify(output);
    assert.ok(serialized.includes('"additionalProperties":false'));
    assert.ok(!serialized.includes('"additionalProperties":true'));
    assert.ok(serialized.includes('"const":"1.0.0"'));
  }
});
test("unknown versions, extra fields, and raw profile data are rejected", () => {
  reject("resource", { ...policy(), schemaVersion: "2.0.0" });
  reject("resource", {
    ...policy(),
    properties: { ...policy().properties, credentials: "not-a-real-secret" },
  });
  reject("snapshot", { ...snapshot(), rawGraphResponse: {} });
});
test("errors contain bounded classifications and paths without echoing rejected values", () => {
  const result = validateContract("resource", { ...policy(), id: "sensitive-input-string" });
  assert.equal(result.success, false);
  assert.ok(!JSON.stringify(result).includes("sensitive-input-string"));
});
test("required properties cannot be omitted, coerced, or defaulted", () => {
  reject("resource", { ...policy(), properties: { state: "enabled" } });
  reject("manifest", { ...manifest(), createdAt: 1791460800000 });
  reject("baseline", { ...baseline(), approval: undefined });
});
test("canonical tenant/principal GUIDs differ from opaque assignment/definition IDs", () => {
  accept("snapshot", snapshot());
  reject("resource", { ...policy(), id: "policy/not-a-guid" });
  reject("resource", { ...policy(), tenantId: tenantId.toUpperCase().replace("1111", "AAAA") });
});
test("untrusted text and opaque IDs remain data, with no transformations", () => {
  const input = policy();
  input.properties.displayName = {
    status: "value",
    value: "<script>$(Get-Content secret)</script> ../tenant",
  };
  const result = validateContract("resource", input);
  assert.ok(result.success);
  if (result.success) assert.deepEqual(result.data, input);
});
test("value, null, missing, unsupported, and an explicit empty set remain distinct", () => {
  for (const state of [
    { status: "value", value: [] },
    { status: "null" },
    { status: "missing", reason: "permission-denied" },
    { status: "unsupported", reason: "unsupported-semantics" },
  ] as const) {
    const input = policy();
    const candidate = {
      ...input,
      properties: {
        ...input.properties,
        users: { ...input.properties.users, excludeUsers: state },
      },
    };
    accept("resource", candidate);
    const result = validateContract("resource", candidate);
    assert.ok(result.success);
    if (result.success) assert.deepEqual(result.data, candidate);
  }
});
test("unknown enum values must be represented explicitly as unsupported", () => {
  reject("resource", {
    ...policy(),
    properties: { ...policy().properties, state: { status: "value", value: "future-state" } },
  });
  const input = policy();
  input.properties.state = { status: "unsupported", reason: "unknown-enum" };
  accept("resource", input);
});
test("CA symbolic tokens are confined to the documented user fields", () => {
  for (const id of ["All", "None", "GuestsOrExternalUsers"]) {
    const input = policy();
    accept("resource", {
      ...input,
      properties: {
        ...input.properties,
        users: {
          ...input.properties.users,
          includeUsers: { status: "value", value: [{ namespace: "symbolic-user", id }] },
        },
      },
    });
  }
  const input = policy();
  input.properties.users.excludeUsers = {
    status: "value",
    value: [{ namespace: "symbolic-user", id: "GuestsOrExternalUsers" }],
  };
  accept("resource", input);
  for (const name of [
    "excludeUsers",
    "includeGroups",
    "excludeGroups",
    "includeRoles",
    "excludeRoles",
  ]) {
    reject("resource", {
      ...input,
      properties: {
        ...input.properties,
        users: {
          ...input.properties.users,
          [name]: { status: "value", value: [{ namespace: "symbolic-user", id: "All" }] },
        },
      },
    });
  }
});
test("target sets and baseline approval sets reject duplicate members", () => {
  const input = policy();
  input.properties.users.excludeUsers = {
    status: "value",
    value: [
      { namespace: "directory-object", id: principalId },
      { namespace: "directory-object", id: principalId },
    ],
  };
  reject("resource", input, "duplicate");
  const approved = baseline();
  approved.protectedRoles![0]!.allowedPrincipalIds.push(principalId);
  reject("baseline", approved, "duplicate");
});
test("baseline omitted sections and omitted exclusion sets do not become empty approvals", () => {
  const input = baseline();
  delete input.protectedRoles;
  delete input.conditionalAccess!.allowedExclusions[0]!.excludeGroups;
  const result = validateContract("baseline", input);
  assert.ok(result.success);
  if (result.success) {
    assert.ok(!("protectedRoles" in result.data));
    assert.ok(!("excludeGroups" in result.data.conditionalAccess!.allowedExclusions[0]!));
    assert.deepEqual(result.data.conditionalAccess!.allowedExclusions[0]!.excludeRoles, []);
  }
});
test("a conflicting assignment directory/app scope is invalid", () => {
  const resource = snapshot().resources[1]!;
  assert.ok(resource.kind === "role-assignment");
  resource.properties.appScopeId = { status: "value", value: "/app" };
  reject("resource", resource, "scope-conflict");
});
test("a wholly self-consistent other tenant is rejected against configured tenant binding", () => {
  const input = { ...policy(), tenantId: otherTenantId };
  assert.ok(validateContract("resource", input).success);
  reject("resource", input, "tenant-mismatch");
  const result = validateContract("resource", policy(), { expectedTenantId: "bad-tenant" });
  assert.ok(!result.success && result.issues.some((issue) => issue.code === "invalid-binding"));
});
test("nested resources, baselines, receipts, and relationship targets cannot cross tenants", () => {
  const candidates = [
    () => {
      const input = bundle();
      input.snapshot.resources[0]!.tenantId = otherTenantId;
      return input;
    },
    () => {
      const input = bundle();
      input.baseline!.tenantId = otherTenantId;
      return input;
    },
    () => {
      const input = bundle();
      input.receipts[0]!.assessment.subject.tenantId = otherTenantId;
      return input;
    },
    () => {
      const input = bundle();
      input.snapshot.relationships[0]!.to.tenantId = otherTenantId;
      return input;
    },
  ];
  for (const candidate of candidates) reject("evaluationBundle", candidate(), "tenant-mismatch");
});
test("duplicate resource IDs and wrong observation IDs are rejected", () => {
  const duplicate = snapshot();
  duplicate.resources.push(structuredClone(duplicate.resources[0]!));
  reject("snapshot", duplicate, "duplicate");
  const wrong = snapshot();
  wrong.resources[0]!.observationId = "unrelated-observation";
  reject("snapshot", wrong, "resource-observation");
});
test("resource and observation scope counts must agree", () => {
  const input = snapshot();
  input.manifest.scopes[0]!.retainedObservation!.resourceCount = 0;
  reject("snapshot", input, "resource-count");
});
test("scope bounds are explicit and cannot be reported complete by truncation", () => {
  const input = manifest();
  input.scopes[0]!.retainedObservation!.resourceCount = 251;
  reject("manifest", input, "scope-limit");
});
test("coverage paths are allowlisted, unique, and cannot contradict unsupported paths", () => {
  const input = manifest();
  input.scopes[0]!.retainedObservation!.fieldPaths.push("properties.grantControls");
  reject("manifest", input, "field-allowlist");
  const conflict = manifest();
  conflict.scopes[0]!.retainedObservation!.unsupportedFieldPaths.push("properties.state");
  reject("manifest", conflict, "coverage-conflict");
  const undeclared = snapshot();
  undeclared.manifest.scopes[0]!.retainedObservation!.fieldPaths = [];
  reject("snapshot", undeclared, "field-coverage");
});
test("relationships must be backed by a source field and use the correct target namespace", () => {
  const wrongTarget = snapshot();
  wrongTarget.relationships[0]!.to = { tenantId, namespace: "directory-object", id: templateId };
  reject("snapshot", wrongTarget, "relationship-evidence");
  const wrongNamespace = snapshot();
  wrongNamespace.relationships[2]!.to = { tenantId, namespace: "role-template", id: templateId };
  reject("snapshot", wrongNamespace, "relationship-type");
});
test("unresolved references are explicit and do not require fabricated principal nodes", () => {
  const input = snapshot();
  input.resources.pop();
  input.manifest.scopes[3]!.retainedObservation!.resourceCount = 0;
  input.relationships.slice(0, 2).forEach((edge) => {
    edge.resolution = "unresolved";
    edge.unresolvedReason = "permission-denied";
  });
  accept("snapshot", input);
  delete input.relationships[0]!.unresolvedReason;
  reject("snapshot", input, "resolution");
});
test("resolved relationships cannot point to an absent target", () => {
  const input = snapshot();
  input.resources.pop();
  input.manifest.scopes[3]!.retainedObservation!.resourceCount = 0;
  reject("snapshot", input, "relationship-resolution");
});
test("role-template targeting resolves a distinct definition namespace", () => {
  const input = snapshot();
  const resource = input.resources[0]!;
  assert.ok(resource.kind === "conditional-access-policy");
  resource.properties.users.includeRoles = {
    status: "value",
    value: [{ namespace: "role-template", id: templateId }],
  };
  input.relationships.push({
    schemaVersion: "1.0.0",
    tenantId,
    id: "template-edge",
    observationId: resource.observationId,
    kind: "policy-target",
    from: { tenantId, namespace: "resource", kind: resource.kind, id: resource.id },
    to: { tenantId, namespace: "role-template", id: templateId },
    fieldPath: "properties.users.includeRoles",
    resolution: "resolved",
  });
  accept("snapshot", input);
});
test("complete scope requires fetched pages, pagination completion, no errors, and its own observation", () => {
  const mutate: ((scope: Manifest["scopes"][number]) => void)[] = [
    (scope) => {
      scope.latestAttempt.pagesReceived = 0;
    },
    (scope) => {
      scope.latestAttempt.paginationComplete = false;
    },
    (scope) => {
      scope.latestAttempt.errorCodes = ["timeout"];
    },
    (scope) => {
      scope.retainedObservation = null;
    },
  ];
  for (const change of mutate) {
    const input = manifest();
    change(input.scopes[0]!);
    reject("manifest", input, "completion");
  }
  const unrelated = manifest();
  unrelated.scopes[0]!.retainedObservation!.attemptId = "unrelated";
  reject("manifest", unrelated, "observation-reference");
});
test("initial failed collection may have no retained data, but cannot publish partial resources", () => {
  const input = snapshot();
  input.resources = [];
  input.relationships = [];
  input.manifest.scopes.forEach((scope) => {
    incompleteScope(scope);
    scope.latestAttempt.attemptId = "attempt-1";
    scope.retainedObservation = null;
  });
  input.manifest.createdAt = "2026-10-08T11:12:00Z";
  accept("snapshot", input);
  input.resources.push(policy());
  reject("snapshot", input, "resource-observation");
});
test("an incomplete latest attempt may retain only an earlier observation", () => {
  const input = manifest();
  input.attemptId = "attempt-2";
  input.createdAt = "2026-10-08T11:12:00Z";
  input.scopes.forEach((scope) => incompleteScope(scope, "partial"));
  accept("manifest", input);
  input.scopes[0]!.retainedObservation!.attemptId = "attempt-2";
  reject("manifest", input, "observation-reference");
});
test("chronology rejects reversed intervals including sub-millisecond differences", () => {
  const input = manifest();
  input.scopes[0]!.latestAttempt.interval = {
    start: "2026-10-08T11:00:00.0000002Z",
    end: "2026-10-08T11:00:00.0000001Z",
  };
  reject("manifest", input, "chronology");
  reject("manifest", { ...manifest(), createdAt: "2026-10-08T10:59:00Z" }, "chronology");
});
test("timestamps require valid UTC dates and seconds without local offsets", () => {
  for (const createdAt of [
    "2026-02-30T11:06:00Z",
    "2026-10-08T11:06Z",
    "2026-10-08T11:06:00+01:00",
  ]) {
    reject("manifest", { ...manifest(), createdAt });
  }
});
test("freshness uses original collection start with an inclusive 120-minute boundary", () => {
  const input = bundle();
  setPolicyStart(input, "2026-10-08T10:00:00Z");
  accept("evaluationBundle", input);
  setPolicyStart(input, "2026-10-08T09:59:59.9999999Z");
  reject("evaluationBundle", input, "not-current");
});
test("a failed new required scope cannot support any current outcome with fresh retained data", () => {
  for (const outcome of ["pass", "fail", "not-applicable"] as const) {
    const input = bundle();
    newerAttempt(input.snapshot, "conditional-access-policies");
    input.receipts[0]!.assessment.outcome = outcome;
    if (outcome === "fail") input.receipts[0]!.finding = failFinding();
    reject("evaluationBundle", input, "not-current");
  }
  const unknown = bundle();
  newerAttempt(unknown.snapshot, "conditional-access-policies");
  unknown.receipts[0]!.assessment.outcome = "unknown";
  accept("evaluationBundle", unknown);
});
test("unaffected policy evidence remains usable when role or optional label scope fails", () => {
  for (const failed of ["role-assignments", "principals"] as const) {
    const input = bundle();
    newerAttempt(input.snapshot, failed);
    accept("evaluationBundle", input);
  }
});
test("known state can support a narrow decision while unrelated targeting is unsupported", () => {
  const input = bundle();
  ca(input).properties.users.includeUsers = {
    status: "unsupported",
    reason: "unsupported-semantics",
  };
  accept("evaluationBundle", input);
});
test("missing, null, and unsupported required evidence cannot support a current decision", () => {
  for (const state of [
    { status: "missing", reason: "not-returned" },
    { status: "null" },
    { status: "unsupported", reason: "unknown-enum" },
  ] as const) {
    const input = bundle();
    ca(input).properties.state = state;
    reject("evaluationBundle", input, "unknown-evidence");
    input.receipts[0]!.assessment.outcome = "unknown";
    accept("evaluationBundle", input);
  }
});
test("absence is represented by completed scope evidence rather than a fake resource", () => {
  const input = bundle();
  const r = input.receipts[0]!;
  r.assessment.subject.id = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  r.assessment.outcome = "fail";
  r.finding = failFinding();
  r.evidence = [
    {
      kind: "absence",
      resource: r.assessment.subject,
      scopeId: "conditional-access-policies",
      observationId: "observation-policies",
    },
  ];
  accept("evaluationBundle", input);
  r.evidence[0]!.resource.id = policyId;
  reject("evaluationBundle", input, "absence-conflict");
});
test("absence evidence from an incomplete or stale listing cannot support a failure", () => {
  const input = bundle();
  const r = input.receipts[0]!;
  r.assessment.subject.id = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  r.assessment.outcome = "fail";
  r.finding = failFinding();
  r.evidence = [
    {
      kind: "absence",
      resource: r.assessment.subject,
      scopeId: "conditional-access-policies",
      observationId: "observation-policies",
    },
  ];
  newerAttempt(input.snapshot, "conditional-access-policies");
  reject("evaluationBundle", input, "not-current");
});
test("unknown may record missing policy, whereas current decisions need a baseline and grounded subject", () => {
  const input = bundle();
  input.baseline = null;
  input.receipts[0]!.provenance.baseline = null;
  reject("evaluationBundle", input, "decision-inputs");
  input.receipts[0]!.assessment.outcome = "unknown";
  input.receipts[0]!.evidence = [];
  accept("evaluationBundle", input);
});
test("finding presence and assessment linkage agree with failure outcomes", () => {
  const input = receipt();
  input.finding = failFinding();
  reject("receipt", input, "finding-outcome");
  input.assessment.outcome = "fail";
  accept("receipt", input);
  input.finding.assessmentId = "different-assessment";
  reject("receipt", input, "finding-reference");
});
test("receipts pin the supplied snapshot, manifest, baseline ID, and baseline version", () => {
  for (const change of [
    (input: EvaluationBundle) => {
      input.receipts[0]!.provenance.snapshotId = "other-snapshot";
    },
    (input: EvaluationBundle) => {
      input.receipts[0]!.provenance.manifestId = "other-manifest";
    },
    (input: EvaluationBundle) => {
      input.receipts[0]!.provenance.baseline!.version = "2";
    },
  ]) {
    const input = bundle();
    change(input);
    reject("evaluationBundle", input);
  }
});
test("evaluation cannot predate evidence, manifest, or approved policy", () => {
  const input = bundle();
  input.receipts[0]!.provenance.evaluatedAt = "2026-10-08T11:04:00Z";
  reject("evaluationBundle", input, "chronology");
  const futureApproval = bundle();
  futureApproval.baseline!.approval.approvedAt = "2026-10-08T12:00:00.0000001Z";
  reject("evaluationBundle", futureApproval, "chronology");
});
test("mixed-age dependencies each retain their own freshness requirement", () => {
  const input = bundle();
  const scope = input.snapshot.manifest.scopes[2]!;
  scope.latestAttempt.interval.start = "2026-10-08T09:00:00Z";
  scope.retainedObservation!.interval.start = "2026-10-08T09:00:00Z";
  accept("evaluationBundle", input);
  input.receipts[0]!.evidence.push({
    kind: "resource-field",
    resource: {
      tenantId,
      namespace: "resource",
      kind: "role-definition",
      id: "role-definition/opaque-001",
    },
    observationId: "observation-definitions",
    fieldPath: "properties.templateId",
  });
  reject("evaluationBundle", input, "not-current");
});
test("fingerprints are format-checked assertions until canonicalization is implemented", () => {
  const input = receipt();
  input.provenance.snapshotFingerprint = fingerprint.toUpperCase();
  reject("receipt", input);
  input.provenance.snapshotFingerprint = "b".repeat(64);
  accept("receipt", input);
});
test("contract validation is deterministic and does not mutate caller input", () => {
  const input = bundle();
  const before = structuredClone(input);
  assert.deepEqual(
    validateContract("evaluationBundle", input),
    validateContract("evaluationBundle", before),
  );
  assert.deepEqual(input, before);
});

test("role receipts can evidence explicit null scope absence without depending on labels", () => {
  for (const outcome of ["pass", "fail", "not-applicable"] as const) {
    const input = bundle();
    newerAttempt(input.snapshot, "principals");
    const r = input.receipts[0]!;
    r.assessment.subject = {
      tenantId,
      namespace: "resource",
      kind: "role-assignment",
      id: "assignment/opaque-001",
    };
    r.assessment.outcome = outcome;
    r.evidence = ["principalId", "roleDefinitionId", "directoryScopeId", "appScopeId"].map(
      (field) => ({
        kind: "resource-field",
        resource: r.assessment.subject,
        observationId: "observation-assignments",
        fieldPath: "properties." + field,
      }),
    );
    r.evidence.push({
      kind: "resource-field",
      resource: {
        tenantId,
        namespace: "resource",
        kind: "role-definition",
        id: "role-definition/opaque-001",
      },
      observationId: "observation-definitions",
      fieldPath: "properties.templateId",
    });
    if (outcome === "fail") r.finding = failFinding();
    accept("evaluationBundle", input);
    const assignment = input.snapshot.resources[1]!;
    assert.ok(assignment.kind === "role-assignment");
    assignment.properties.appScopeId = { status: "missing", reason: "not-returned" };
    reject("evaluationBundle", input, "unknown-evidence");
  }
});

test("retained observations preserve original collector/source provenance after an upgrade failure", () => {
  const input = snapshot();
  input.manifest.attemptId = "attempt-2";
  input.manifest.createdAt = "2026-10-08T11:12:00Z";
  input.manifest.collectorVersion = "test/2";
  input.manifest.source = "microsoft-graph";
  input.manifest.scopes.forEach((scope) => incompleteScope(scope));
  const result = validateContract("snapshot", input);
  assert.ok(result.success);
  if (result.success) {
    const original = result.data.manifest.scopes[0]!.retainedObservation!.provenance;
    assert.equal(original.collectorVersion, "test/1");
    assert.equal(original.source, "synthetic");
    assert.equal(result.data.manifest.collectorVersion, "test/2");
  }
  const incompatible = structuredClone(input);
  reject("snapshot", {
    ...incompatible,
    manifest: {
      ...incompatible.manifest,
      scopes: incompatible.manifest.scopes.map((scope) => ({
        ...scope, retainedObservation: {
          ...scope.retainedObservation, provenance: {
            ...scope.retainedObservation!.provenance, allowlistVersion: "entra-core/0",
          },
        },
      })),
    },
  });
});
test("a complete new observation cannot reuse old collector provenance", () => {
  const input = manifest();
  input.collectorVersion = "test/2";
  reject("manifest", input, "observation-provenance");
});
test("failed or partial attempts must carry an actionable bounded cause", () => {
  const input = manifest();
  input.attemptId = "attempt-2";
  input.createdAt = "2026-10-08T11:12:00Z";
  input.scopes.forEach((scope) => incompleteScope(scope));
  input.scopes[0]!.latestAttempt.errorCodes = [];
  reject("manifest", input, "failure-cause");
});
