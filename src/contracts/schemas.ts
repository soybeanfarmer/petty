import * as z from "zod";

export const CONTRACT_VERSION = "1.0.0" as const;
export const ALLOWLIST_VERSION = "entra-core/1" as const;
export const resourceKinds = [
  "conditional-access-policy",
  "role-assignment",
  "role-definition",
  "principal",
] as const;
export const scopeIds = [
  "conditional-access-policies",
  "role-assignments",
  "role-definitions",
  "principals",
] as const;
export const opaqueId = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[^\u0000-\u001f\u007f]+$/);
export const guid = z.guid().regex(/^[0-9a-f-]+$/);
export const timestamp = z.iso.datetime().max(64);
const label = z.string().max(4096);
const version = opaqueId;
const fingerprint = z.string().regex(/^[0-9a-f]{64}$/);
const scopeId = z.enum(scopeIds);
const envelope = { schemaVersion: z.literal(CONTRACT_VERSION), tenantId: guid };
const interval = z.strictObject({ start: timestamp, end: timestamp });
const missingReason = z.enum([
  "not-returned",
  "not-requested",
  "permission-denied",
  "unresolved-reference",
]);
const unsupportedReason = z.enum(["unknown-enum", "unsupported-semantics", "unsupported-api"]);

export function field<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion("status", [
    z.strictObject({ status: z.literal("value"), value }),
    z.strictObject({ status: z.literal("null") }),
    z.strictObject({ status: z.literal("missing"), reason: missingReason }),
    z.strictObject({ status: z.literal("unsupported"), reason: unsupportedReason }),
  ]);
}

const directoryTarget = z.strictObject({ namespace: z.literal("directory-object"), id: guid });
const roleTarget = z.strictObject({ namespace: z.literal("role-template"), id: guid });
const userSymbol = <const T extends readonly [string, ...string[]]>(tokens: T) =>
  z.strictObject({
    namespace: z.literal("symbolic-user"),
    id: z.enum(tokens),
  });
const includeUser = z.union([
  directoryTarget,
  userSymbol(["None", "All", "GuestsOrExternalUsers"]),
]);
const excludeUser = z.union([directoryTarget, userSymbol(["GuestsOrExternalUsers"])]);
const targetList = <T extends z.ZodType>(item: T) => z.array(item).max(15000);
const users = z.strictObject({
  includeUsers: field(targetList(includeUser)),
  excludeUsers: field(targetList(excludeUser)),
  includeGroups: field(targetList(directoryTarget)),
  excludeGroups: field(targetList(directoryTarget)),
  includeRoles: field(targetList(roleTarget)),
  excludeRoles: field(targetList(roleTarget)),
});
const resourceBase = { ...envelope, observationId: opaqueId };
export const resourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...resourceBase,
    kind: z.literal("conditional-access-policy"),
    id: guid,
    properties: z.strictObject({
      displayName: field(label),
      state: field(z.enum(["enabled", "disabled", "enabledForReportingButNotEnforced"])),
      users,
    }),
  }),
  z.strictObject({
    ...resourceBase,
    kind: z.literal("role-assignment"),
    id: opaqueId,
    properties: z.strictObject({
      principalId: field(guid),
      roleDefinitionId: field(opaqueId),
      directoryScopeId: field(opaqueId),
      appScopeId: field(opaqueId),
    }),
  }),
  z.strictObject({
    ...resourceBase,
    kind: z.literal("role-definition"),
    id: opaqueId,
    properties: z.strictObject({
      templateId: field(guid),
      displayName: field(label),
      isBuiltIn: field(z.boolean()),
      isEnabled: field(z.boolean()),
      version: field(version),
    }),
  }),
  z.strictObject({
    ...resourceBase,
    kind: z.literal("principal"),
    id: guid,
    properties: z.strictObject({
      principalType: field(z.enum(["user", "group", "service-principal"])),
      displayName: field(label),
    }),
  }),
]);

export const sourceReferenceSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    tenantId: guid,
    namespace: z.literal("resource"),
    kind: z.literal("conditional-access-policy"),
    id: guid,
  }),
  z.strictObject({
    tenantId: guid,
    namespace: z.literal("resource"),
    kind: z.literal("role-assignment"),
    id: opaqueId,
  }),
  z.strictObject({
    tenantId: guid,
    namespace: z.literal("resource"),
    kind: z.literal("role-definition"),
    id: opaqueId,
  }),
  z.strictObject({
    tenantId: guid,
    namespace: z.literal("resource"),
    kind: z.literal("principal"),
    id: guid,
  }),
]);
export const referenceSchema = z.union([
  sourceReferenceSchema,
  z.strictObject({ tenantId: guid, namespace: z.literal("directory-object"), id: guid }),
  z.strictObject({ tenantId: guid, namespace: z.literal("role-template"), id: guid }),
]);
const sourceReference = sourceReferenceSchema;
export const relationshipSchema = z.strictObject({
  ...envelope,
  id: opaqueId,
  observationId: opaqueId,
  kind: z.enum(["policy-target", "assigned-principal", "assigned-role"]),
  from: sourceReference,
  to: referenceSchema,
  resolution: z.enum(["resolved", "unresolved"]),
  unresolvedReason: missingReason.optional(),
  fieldPath: opaqueId,
});
const attempt = z.strictObject({
  attemptId: opaqueId,
  interval,
  status: z.enum(["complete", "partial", "failed", "unsupported"]),
  pagesReceived: z.number().int().nonnegative(),
  paginationComplete: z.boolean(),
  errorCodes: z.array(opaqueId).max(100),
});
const observation = z.strictObject({
  observationId: opaqueId,
  attemptId: opaqueId,
  interval,
  resourceCount: z.number().int().nonnegative().max(17500),
  provenance: z.strictObject({
    schemaVersion: z.literal(CONTRACT_VERSION),
    collectorVersion: version,
    apiVersion: z.literal("graph-v1.0"),
    allowlistVersion: z.literal(ALLOWLIST_VERSION),
    source: z.enum(["synthetic", "microsoft-graph"]),
  }),
  fieldPaths: z.array(opaqueId).max(64),
  unsupportedFieldPaths: z.array(opaqueId).max(256),
});
export const manifestSchema = z.strictObject({
  ...envelope,
  id: opaqueId,
  attemptId: opaqueId,
  createdAt: timestamp,
  collectorVersion: version,
  apiVersion: z.literal("graph-v1.0"),
  allowlistVersion: z.literal(ALLOWLIST_VERSION),
  source: z.enum(["synthetic", "microsoft-graph"]),
  scopes: z
    .array(
      z.strictObject({
        scopeId,
        latestAttempt: attempt,
        retainedObservation: observation.nullable(),
      }),
    )
    .min(1)
    .max(4),
});
const exclusionApproval = z.strictObject({
  policyId: guid,
  excludeUsers: targetList(excludeUser).optional(),
  excludeGroups: targetList(directoryTarget).optional(),
  excludeRoles: targetList(roleTarget).optional(),
});
export const baselineSchema = z.strictObject({
  ...envelope,
  id: opaqueId,
  version,
  approval: z.strictObject({ operatorId: opaqueId, approvedAt: timestamp }),
  conditionalAccess: z
    .strictObject({
      requiredPolicyIds: z.array(guid).max(250),
      allowedExclusions: z.array(exclusionApproval).max(250),
    })
    .optional(),
  protectedRoles: z
    .array(
      z.strictObject({
        roleDefinitionId: opaqueId,
        templateId: guid,
        directoryScopeId: z.literal("/"),
        allowedPrincipalIds: z.array(guid).max(15000),
      }),
    )
    .max(250)
    .optional(),
});
export const assessmentSchema = z.strictObject({
  ...envelope,
  id: opaqueId,
  subject: sourceReference,
  outcome: z.enum(["pass", "fail", "unknown", "not-applicable"]),
  reasonCodes: z.array(opaqueId).min(1).max(32),
});
const factValue = z.union([
  label,
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(opaqueId).max(15000),
]);
export const findingSchema = z.strictObject({
  ...envelope,
  id: opaqueId,
  assessmentId: opaqueId,
  summary: label,
  facts: z
    .array(z.strictObject({ fieldPath: opaqueId, observed: factValue, expected: factValue }))
    .min(1)
    .max(64),
});
const evidence = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("resource-field"),
    resource: sourceReference,
    observationId: opaqueId,
    fieldPath: opaqueId,
  }),
  z.strictObject({
    kind: z.literal("absence"),
    resource: sourceReference,
    scopeId,
    observationId: opaqueId,
  }),
]);
const artifact = z.strictObject({ id: opaqueId, version, fingerprint });
export const receiptSchema = z.strictObject({
  ...envelope,
  id: opaqueId,
  assessment: assessmentSchema,
  finding: findingSchema.nullable(),
  evidence: z.array(evidence).max(128),
  provenance: z.strictObject({
    snapshotId: opaqueId,
    snapshotFingerprint: fingerprint,
    manifestId: opaqueId,
    baseline: artifact.nullable(),
    rule: z.strictObject({ id: opaqueId, version }),
    engineVersion: version,
    contractVersion: z.literal(CONTRACT_VERSION),
    allowlistVersion: z.literal(ALLOWLIST_VERSION),
    referenceData: z.array(artifact).max(64),
    evaluatedAt: timestamp,
    freshnessLimitSeconds: z.literal(7200),
  }),
});
export const snapshotSchema = z.strictObject({
  ...envelope,
  id: opaqueId,
  manifest: manifestSchema,
  resources: z.array(resourceSchema).max(17500),
  relationships: z.array(relationshipSchema).max(100000),
});
export const evaluationBundleSchema = z.strictObject({
  ...envelope,
  snapshot: snapshotSchema,
  baseline: baselineSchema.nullable(),
  receipts: z.array(receiptSchema).max(25000),
});
export const contractSchemas = {
  resource: resourceSchema,
  relationship: relationshipSchema,
  manifest: manifestSchema,
  baseline: baselineSchema,
  assessment: assessmentSchema,
  finding: findingSchema,
  receipt: receiptSchema,
  snapshot: snapshotSchema,
  evaluationBundle: evaluationBundleSchema,
} as const;
export type ContractKind = keyof typeof contractSchemas;
export type ContractTypes = { [K in ContractKind]: z.infer<(typeof contractSchemas)[K]> };
export type Resource = ContractTypes["resource"];
export type Relationship = ContractTypes["relationship"];
export type Manifest = ContractTypes["manifest"];
export type Baseline = ContractTypes["baseline"];
export type Assessment = ContractTypes["assessment"];
export type Finding = ContractTypes["finding"];
export type ResourceReference = z.infer<typeof sourceReferenceSchema>;
export type Reference = z.infer<typeof referenceSchema>;
export type Receipt = ContractTypes["receipt"];
export type Snapshot = ContractTypes["snapshot"];
export type EvaluationBundle = ContractTypes["evaluationBundle"];

export function structuralSchema(kind: ContractKind) {
  return {
    ...z.toJSONSchema(contractSchemas[kind], { target: "draft-2020-12", io: "input" }),
    $id: `urn:petty:contracts:${CONTRACT_VERSION}:${kind}`,
  };
}
