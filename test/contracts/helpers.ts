import {
  ALLOWLIST_VERSION, CONTRACT_VERSION,
  type Baseline, type EvaluationBundle, type Manifest, type Receipt,
  type Resource, type Snapshot,
} from "../../src/contracts/index.js";

export const tenantId = "11111111-1111-4111-8111-111111111111";
export const otherTenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const policyId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const principalId = "22222222-2222-4222-8222-222222222222";
export const templateId = "33333333-3333-4333-8333-333333333333";
export const roleId = "role-definition/opaque-001";
export const schemaVersion = CONTRACT_VERSION;
export const fingerprint = "a".repeat(64);
const value = <T>(item: T): { status: "value"; value: T } => ({ status: "value", value: item });
const empty = (): { status: "value"; value: never[] } => value([]);

export function policy(): Extract<Resource, { kind: "conditional-access-policy" }> {
  return {
    schemaVersion, tenantId, kind: "conditional-access-policy", id: policyId,
    observationId: "observation-policies",
    properties: {
      displayName: { status: "missing", reason: "not-requested" }, state: value("enabled"),
      users: {
        includeUsers: value([{ namespace: "symbolic-user", id: "All" }]),
        excludeUsers: value([{ namespace: "directory-object", id: principalId }]),
        includeGroups: empty(), excludeGroups: empty(), includeRoles: empty(), excludeRoles: empty(),
      },
    },
  };
}
export function manifest(): Manifest {
  const scopes = [
    { scopeId: "conditional-access-policies", observationId: "observation-policies", fieldPaths: [
      "properties.state", "properties.users.includeUsers", "properties.users.excludeUsers",
      "properties.users.includeGroups", "properties.users.excludeGroups",
      "properties.users.includeRoles", "properties.users.excludeRoles",
    ] },
    { scopeId: "role-assignments", observationId: "observation-assignments", fieldPaths: [
      "properties.principalId", "properties.roleDefinitionId", "properties.directoryScopeId", "properties.appScopeId",
    ] },
    { scopeId: "role-definitions", observationId: "observation-definitions", fieldPaths: [
      "properties.templateId", "properties.isBuiltIn", "properties.isEnabled", "properties.version",
    ] },
    { scopeId: "principals", observationId: "observation-principals", fieldPaths: ["properties.principalType"] },
  ] as const;
  return {
    schemaVersion, tenantId, id: "manifest-1", attemptId: "attempt-1",
    createdAt: "2026-10-08T11:06:00Z", collectorVersion: "test/1", apiVersion: "graph-v1.0",
    allowlistVersion: ALLOWLIST_VERSION, source: "synthetic",
    scopes: scopes.map((scope) => ({
      scopeId: scope.scopeId,
      latestAttempt: {
        attemptId: "attempt-1", interval: { start: "2026-10-08T11:00:00Z", end: "2026-10-08T11:05:00Z" },
        status: "complete", pagesReceived: 1, paginationComplete: true, errorCodes: [],
      },
      retainedObservation: {
        observationId: scope.observationId, attemptId: "attempt-1",
        interval: { start: "2026-10-08T11:00:00Z", end: "2026-10-08T11:05:00Z" },
        resourceCount: 1, fieldPaths: [...scope.fieldPaths], unsupportedFieldPaths: [],
      },
    })),
  };
}
export function snapshot(): Snapshot {
  return {
    schemaVersion, tenantId, id: "snapshot-1", manifest: manifest(),
    resources: [
      policy(),
      {
        schemaVersion, tenantId, kind: "role-assignment", id: "assignment/opaque-001",
        observationId: "observation-assignments",
        properties: {
          principalId: value(principalId), roleDefinitionId: value(roleId),
          directoryScopeId: value("/"), appScopeId: { status: "null" },
        },
      },
      {
        schemaVersion, tenantId, kind: "role-definition", id: roleId,
        observationId: "observation-definitions",
        properties: {
          templateId: value(templateId), displayName: { status: "missing", reason: "not-requested" },
          isBuiltIn: value(true), isEnabled: value(true), version: value("1"),
        },
      },
      {
        schemaVersion, tenantId, kind: "principal", id: principalId,
        observationId: "observation-principals",
        properties: { principalType: value("user"), displayName: { status: "missing", reason: "permission-denied" } },
      },
    ],
    relationships: [
      {
        schemaVersion, tenantId, id: "edge-policy-exclusion", observationId: "observation-policies",
        kind: "policy-target", from: { tenantId, namespace: "resource", kind: "conditional-access-policy", id: policyId },
        to: { tenantId, namespace: "directory-object", id: principalId }, resolution: "resolved",
        fieldPath: "properties.users.excludeUsers",
      },
      {
        schemaVersion, tenantId, id: "edge-assigned-principal", observationId: "observation-assignments",
        kind: "assigned-principal", from: { tenantId, namespace: "resource", kind: "role-assignment", id: "assignment/opaque-001" },
        to: { tenantId, namespace: "directory-object", id: principalId }, resolution: "resolved",
        fieldPath: "properties.principalId",
      },
      {
        schemaVersion, tenantId, id: "edge-assigned-role", observationId: "observation-assignments",
        kind: "assigned-role", from: { tenantId, namespace: "resource", kind: "role-assignment", id: "assignment/opaque-001" },
        to: { tenantId, namespace: "resource", kind: "role-definition", id: roleId }, resolution: "resolved",
        fieldPath: "properties.roleDefinitionId",
      },
    ],
  };
}
export function baseline(): Baseline {
  return {
    schemaVersion, tenantId, id: "baseline-1", version: "1",
    approval: { operatorId: "operator-1", approvedAt: "2026-10-08T10:00:00Z" },
    conditionalAccess: {
      requiredPolicyIds: [policyId],
      allowedExclusions: [{
        policyId, excludeUsers: [{ namespace: "directory-object", id: principalId }],
        excludeGroups: [], excludeRoles: [],
      }],
    },
    protectedRoles: [{ roleDefinitionId: roleId, templateId, directoryScopeId: "/", allowedPrincipalIds: [principalId] }],
  };
}
export function receipt(): Receipt {
  return {
    schemaVersion, tenantId, id: "receipt-1",
    assessment: {
      schemaVersion, tenantId, id: "assessment-1",
      subject: { tenantId, namespace: "resource", kind: "conditional-access-policy", id: policyId },
      outcome: "pass", reasonCodes: ["required-policy-enabled"],
    },
    finding: null,
    evidence: [{
      kind: "resource-field",
      resource: { tenantId, namespace: "resource", kind: "conditional-access-policy", id: policyId },
      observationId: "observation-policies", fieldPath: "properties.state",
    }],
    provenance: {
      snapshotId: "snapshot-1", snapshotFingerprint: fingerprint, manifestId: "manifest-1",
      baseline: { id: "baseline-1", version: "1", fingerprint },
      rule: { id: "required-policy-state", version: "1" }, engineVersion: "test/1",
      contractVersion: CONTRACT_VERSION, allowlistVersion: ALLOWLIST_VERSION, referenceData: [],
      evaluatedAt: "2026-10-08T12:00:00Z", freshnessLimitSeconds: 7200,
    },
  };
}
export function bundle(): EvaluationBundle {
  return { schemaVersion, tenantId, snapshot: snapshot(), baseline: baseline(), receipts: [receipt()] };
}
export function failFinding(): NonNullable<Receipt["finding"]> {
  return {
    schemaVersion, tenantId, id: "finding-1", assessmentId: "assessment-1", summary: "Required policy is absent.",
    facts: [{ fieldPath: "properties.state", observed: null, expected: "enabled" }],
  };
}
export function incompleteScope(
  scope: Manifest["scopes"][number], status: "partial" | "failed" | "unsupported" = "failed",
): void {
  scope.latestAttempt = {
    attemptId: "attempt-2", interval: { start: "2026-10-08T11:10:00Z", end: "2026-10-08T11:11:00Z" },
    status, pagesReceived: status === "partial" ? 1 : 0, paginationComplete: false, errorCodes: ["permission-denied"],
  };
}
export function newerAttempt(snapshot: Snapshot, failedScope: Manifest["scopes"][number]["scopeId"]): void {
  snapshot.manifest.attemptId = "attempt-2";
  snapshot.manifest.createdAt = "2026-10-08T11:12:00Z";
  snapshot.manifest.scopes.forEach((scope) => {
    if (scope.scopeId === failedScope) incompleteScope(scope);
    else {
      scope.latestAttempt.attemptId = "attempt-2";
      scope.retainedObservation!.attemptId = "attempt-2";
    }
  });
}
