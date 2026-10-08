import {
  contractSchemas,
  guid,
  type Baseline,
  type ContractKind,
  type ContractTypes,
  type EvaluationBundle,
  type Manifest,
  type Receipt,
  type Relationship,
  type Resource,
  type Snapshot,
} from "./schemas.js";

export type ContractIssue = {
  code: string;
  path: (string | number)[];
  message: string;
};
export type ValidationResult<T> =
  { success: true; data: T } | { success: false; issues: ContractIssue[] };

type Path = (string | number)[];
type Report = (code: string, path: Path, message: string) => void;
type FieldState = { status: string; value?: unknown };
type ResourceRef = { tenantId: string; kind: Resource["kind"]; id: string };
const scopeByKind = {
  "conditional-access-policy": "conditional-access-policies",
  "role-assignment": "role-assignments",
  "role-definition": "role-definitions",
  principal: "principals",
} as const;
const limits = {
  "conditional-access-policies": 250,
  "role-assignments": 2000,
  "role-definitions": 250,
  principals: 15000,
} as const;
const pathsByScope = {
  "conditional-access-policies": [
    "properties.displayName",
    "properties.state",
    "properties.users.includeUsers",
    "properties.users.excludeUsers",
    "properties.users.includeGroups",
    "properties.users.excludeGroups",
    "properties.users.includeRoles",
    "properties.users.excludeRoles",
  ],
  "role-assignments": [
    "properties.principalId",
    "properties.roleDefinitionId",
    "properties.directoryScopeId",
    "properties.appScopeId",
  ],
  "role-definitions": [
    "properties.templateId",
    "properties.displayName",
    "properties.isBuiltIn",
    "properties.isEnabled",
    "properties.version",
  ],
  principals: ["properties.principalType", "properties.displayName"],
} as const;

// Retain sub-millisecond precision: the contracts accept arbitrary UTC fractions.
function scaledTime(value: string, precision: number): bigint {
  const seconds = BigInt(Date.parse(value.slice(0, 19) + "Z") / 1000);
  const fraction = value.slice(19, -1).replace(/^\./, "");
  return seconds * 10n ** BigInt(precision) + BigInt(fraction.padEnd(precision, "0") || "0");
}
function delta(left: string, right: string): { units: bigint; scale: bigint } {
  const precision = Math.max(
    left.includes(".") ? left.length - 21 : 0,
    right.includes(".") ? right.length - 21 : 0,
  );
  return {
    units: scaledTime(left, precision) - scaledTime(right, precision),
    scale: 10n ** BigInt(precision),
  };
}
function after(left: string, right: string): boolean {
  return delta(left, right).units > 0n;
}
function sameTime(left: string, right: string): boolean {
  return delta(left, right).units === 0n;
}
function resourceKey(ref: { kind: string; id: string }): string {
  return JSON.stringify([ref.kind, ref.id]);
}
function targetKey(value: { namespace: string; id: string }): string {
  return JSON.stringify([value.namespace, value.id]);
}
function duplicates<T>(
  items: readonly T[],
  key: (item: T) => string,
  path: Path,
  report: Report,
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const id = key(item);
    if (seen.has(id)) report("duplicate", [...path, index], "Duplicate identity or set member.");
    seen.add(id);
  });
}
function tenant(actual: string, expected: string, path: Path, report: Report): void {
  if (actual !== expected)
    report("tenant-mismatch", path, "Reference crosses the tenant boundary.");
}
function validateInterval(value: { start: string; end: string }, path: Path, report: Report): void {
  if (after(value.start, value.end)) report("chronology", path, "Collection starts after it ends.");
}
function resourceFields(resource: Resource): Record<string, FieldState> {
  if (resource.kind === "conditional-access-policy") {
    return {
      "properties.displayName": resource.properties.displayName,
      "properties.state": resource.properties.state,
      ...Object.fromEntries(
        Object.entries(resource.properties.users).map(([key, value]) => [
          "properties.users." + key,
          value,
        ]),
      ),
    };
  }
  return Object.fromEntries(
    Object.entries(resource.properties).map(([key, value]) => ["properties." + key, value]),
  );
}
function knownEvidence(resource: Resource, fieldPath: string, state: FieldState): boolean {
  return (
    state.status === "value" ||
    (state.status === "null" &&
      resource.kind === "role-assignment" &&
      (fieldPath === "properties.appScopeId" || fieldPath === "properties.directoryScopeId"))
  );
}
function validateResource(resource: Resource, path: Path, report: Report): void {
  if (resource.kind === "conditional-access-policy") {
    Object.entries(resource.properties.users).forEach(([name, state]) => {
      if (state.status === "value") {
        duplicates(state.value, targetKey, [...path, "properties", "users", name, "value"], report);
      }
    });
  }
  if (
    resource.kind === "role-assignment" &&
    resource.properties.directoryScopeId.status === "value" &&
    resource.properties.appScopeId.status === "value"
  ) {
    report(
      "scope-conflict",
      [...path, "properties"],
      "An assignment cannot declare both directory and app scopes.",
    );
  }
}
function validateRelationship(edge: Relationship, path: Path, report: Report): void {
  tenant(edge.from.tenantId, edge.tenantId, [...path, "from", "tenantId"], report);
  tenant(edge.to.tenantId, edge.tenantId, [...path, "to", "tenantId"], report);
  if ((edge.resolution === "unresolved") !== (edge.unresolvedReason !== undefined)) {
    report("resolution", path, "Only unresolved relationships require an unresolved reason.");
  }
  const policy = edge.kind === "policy-target";
  const principal = edge.kind === "assigned-principal";
  const valid = policy
    ? edge.from.kind === "conditional-access-policy" &&
      pathsByScope["conditional-access-policies"].includes(
        edge.fieldPath as (typeof pathsByScope)["conditional-access-policies"][number],
      ) &&
      edge.fieldPath.startsWith("properties.users.") &&
      (edge.fieldPath.endsWith("Roles")
        ? edge.to.namespace === "role-template"
        : edge.to.namespace === "directory-object")
    : edge.from.kind === "role-assignment" &&
      edge.fieldPath === (principal ? "properties.principalId" : "properties.roleDefinitionId") &&
      (principal
        ? edge.to.namespace === "directory-object"
        : edge.to.namespace === "resource" && edge.to.kind === "role-definition");
  if (!valid)
    report(
      "relationship-type",
      path,
      "Relationship kind, field, source, and target namespace disagree.",
    );
}
function validateManifest(manifest: Manifest, path: Path, report: Report): void {
  duplicates(manifest.scopes, (scope) => scope.scopeId, [...path, "scopes"], report);
  const observations = manifest.scopes.flatMap((scope) =>
    scope.retainedObservation ? [scope.retainedObservation] : [],
  );
  duplicates(observations, (observation) => observation.observationId, [...path, "scopes"], report);
  manifest.scopes.forEach((scope, index) => {
    const scopePath = [...path, "scopes", index];
    const latest = scope.latestAttempt;
    const retained = scope.retainedObservation;
    validateInterval(latest.interval, [...scopePath, "latestAttempt", "interval"], report);
    if (latest.attemptId !== manifest.attemptId) {
      report(
        "attempt-reference",
        [...scopePath, "latestAttempt", "attemptId"],
        "Latest scope attempt must belong to this manifest's attempt.",
      );
    }
    if (after(latest.interval.end, manifest.createdAt)) {
      report("chronology", scopePath, "Manifest predates its latest attempt.");
    }
    duplicates(
      latest.errorCodes,
      (code) => code,
      [...scopePath, "latestAttempt", "errorCodes"],
      report,
    );
    if (
      latest.status === "complete" &&
      (!latest.paginationComplete ||
        latest.pagesReceived < 1 ||
        latest.errorCodes.length > 0 ||
        retained === null)
    ) {
      report(
        "completion",
        scopePath,
        "Complete scope needs a fetched, completed listing without errors and a retained observation.",
      );
    }
    if (latest.status !== "complete" && latest.errorCodes.length === 0) {
      report("failure-cause", scopePath, "Incomplete attempts require a bounded cause code.");
    }
    if (retained === null) return;
    validateInterval(retained.interval, [...scopePath, "retainedObservation", "interval"], report);
    if (retained.resourceCount > limits[scope.scopeId]) {
      report("scope-limit", scopePath, "Retained scope exceeds the declared resource limit.");
    }
    if (latest.status === "complete") {
      if (
        retained.provenance.schemaVersion !== manifest.schemaVersion ||
        retained.provenance.collectorVersion !== manifest.collectorVersion ||
        retained.provenance.apiVersion !== manifest.apiVersion ||
        retained.provenance.allowlistVersion !== manifest.allowlistVersion ||
        retained.provenance.source !== manifest.source
      ) {
        report(
          "observation-provenance",
          scopePath,
          "Latest complete observation must carry this attempt's provenance.",
        );
      }
      if (
        retained.attemptId !== latest.attemptId ||
        !sameTime(retained.interval.start, latest.interval.start) ||
        !sameTime(retained.interval.end, latest.interval.end)
      ) {
        report(
          "observation-reference",
          scopePath,
          "Complete latest attempt must identify its own observation and original interval.",
        );
      }
    } else if (
      retained.attemptId === latest.attemptId ||
      after(retained.interval.end, latest.interval.start)
    ) {
      report(
        "observation-reference",
        scopePath,
        "Incomplete attempt may retain only an earlier trustworthy observation.",
      );
    }
    duplicates(
      retained.fieldPaths,
      (field) => field,
      [...scopePath, "retainedObservation", "fieldPaths"],
      report,
    );
    duplicates(
      retained.unsupportedFieldPaths,
      (field) => field,
      [...scopePath, "retainedObservation", "unsupportedFieldPaths"],
      report,
    );
    const allowed: readonly string[] = pathsByScope[scope.scopeId];
    retained.fieldPaths.forEach((field, fieldIndex) => {
      if (!allowed.includes(field))
        report(
          "field-allowlist",
          [...scopePath, "retainedObservation", "fieldPaths", fieldIndex],
          "Field is outside the versioned scope allowlist.",
        );
    });
    if (retained.unsupportedFieldPaths.some((field) => retained.fieldPaths.includes(field))) {
      report("coverage-conflict", scopePath, "A field cannot be both supported and unsupported.");
    }
  });
}
function validateBaseline(baseline: Baseline, path: Path, report: Report): void {
  const ca = baseline.conditionalAccess;
  if (ca) {
    duplicates(
      ca.requiredPolicyIds,
      (id) => id,
      [...path, "conditionalAccess", "requiredPolicyIds"],
      report,
    );
    duplicates(
      ca.allowedExclusions,
      (approval) => approval.policyId,
      [...path, "conditionalAccess", "allowedExclusions"],
      report,
    );
    ca.allowedExclusions.forEach((approval, index) => {
      for (const name of ["excludeUsers", "excludeGroups", "excludeRoles"] as const) {
        duplicates(
          approval[name] ?? [],
          targetKey,
          [...path, "conditionalAccess", "allowedExclusions", index, name],
          report,
        );
      }
    });
  }
  if (baseline.protectedRoles) {
    duplicates(
      baseline.protectedRoles,
      (role) => role.roleDefinitionId,
      [...path, "protectedRoles"],
      report,
    );
    duplicates(
      baseline.protectedRoles,
      (role) => role.templateId,
      [...path, "protectedRoles"],
      report,
    );
    baseline.protectedRoles.forEach((role, index) => {
      duplicates(
        role.allowedPrincipalIds,
        (id) => id,
        [...path, "protectedRoles", index, "allowedPrincipalIds"],
        report,
      );
    });
  }
}
function validateReceipt(receipt: Receipt, path: Path, report: Report): void {
  tenant(
    receipt.assessment.tenantId,
    receipt.tenantId,
    [...path, "assessment", "tenantId"],
    report,
  );
  tenant(
    receipt.assessment.subject.tenantId,
    receipt.tenantId,
    [...path, "assessment", "subject", "tenantId"],
    report,
  );
  duplicates(
    receipt.assessment.reasonCodes,
    (reason) => reason,
    [...path, "assessment", "reasonCodes"],
    report,
  );
  if ((receipt.assessment.outcome === "fail") !== (receipt.finding !== null)) {
    report(
      "finding-outcome",
      [...path, "finding"],
      "Exactly failing assessments carry a violation finding.",
    );
  }
  if (receipt.finding) {
    tenant(receipt.finding.tenantId, receipt.tenantId, [...path, "finding", "tenantId"], report);
    if (receipt.finding.assessmentId !== receipt.assessment.id) {
      report(
        "finding-reference",
        [...path, "finding", "assessmentId"],
        "Finding must identify this receipt's assessment.",
      );
    }
  }
  receipt.evidence.forEach((item, index) => {
    tenant(
      item.resource.tenantId,
      receipt.tenantId,
      [...path, "evidence", index, "resource", "tenantId"],
      report,
    );
    if (item.kind === "absence" && item.scopeId !== scopeByKind[item.resource.kind]) {
      report(
        "evidence-scope",
        [...path, "evidence", index],
        "Absence scope must match the referenced resource kind.",
      );
    }
  });
  duplicates(
    receipt.provenance.referenceData,
    (artifact) => artifact.id,
    [...path, "provenance", "referenceData"],
    report,
  );
  if (
    receipt.assessment.outcome !== "unknown" &&
    (receipt.provenance.baseline === null ||
      receipt.evidence.length === 0 ||
      !receipt.evidence.some(
        (item) => resourceKey(item.resource) === resourceKey(receipt.assessment.subject),
      ))
  ) {
    report(
      "decision-inputs",
      path,
      "A current decision needs approved policy and evidence grounding its subject.",
    );
  }
}
function validateSnapshot(snapshot: Snapshot, path: Path, report: Report): void {
  tenant(snapshot.manifest.tenantId, snapshot.tenantId, [...path, "manifest", "tenantId"], report);
  validateManifest(snapshot.manifest, [...path, "manifest"], report);
  duplicates(snapshot.resources, resourceKey, [...path, "resources"], report);
  duplicates(snapshot.relationships, (edge) => edge.id, [...path, "relationships"], report);
  const resources = new Map(
    snapshot.resources.map((resource) => [resourceKey(resource), resource]),
  );
  const definitions = snapshot.resources.filter((resource) => resource.kind === "role-definition");
  const templates = new Map<string, Resource>();
  definitions.forEach((resource) => {
    if (resource.properties.templateId.status !== "value") return;
    if (templates.has(resource.properties.templateId.value)) {
      report(
        "duplicate-template",
        [...path, "resources"],
        "Role template must identify only one definition in a snapshot.",
      );
    }
    templates.set(resource.properties.templateId.value, resource);
  });
  duplicates(
    snapshot.relationships,
    (edge) =>
      JSON.stringify([
        resourceKey(edge.from),
        edge.fieldPath,
        targetKey(edge.to),
        edge.to.namespace === "resource" ? edge.to.kind : null,
      ]),
    [...path, "relationships"],
    report,
  );
  snapshot.resources.forEach((resource, index) => {
    const resourcePath = [...path, "resources", index];
    tenant(resource.tenantId, snapshot.tenantId, [...resourcePath, "tenantId"], report);
    validateResource(resource, resourcePath, report);
    const scope = snapshot.manifest.scopes.find(
      (entry) => entry.scopeId === scopeByKind[resource.kind],
    );
    const observation = scope?.retainedObservation;
    if (!observation || observation.observationId !== resource.observationId) {
      report(
        "resource-observation",
        resourcePath,
        "Resource must belong to its scope's retained observation.",
      );
      return;
    }
    Object.entries(resourceFields(resource)).forEach(([field, state]) => {
      if (
        (state.status === "value" || state.status === "null") &&
        !observation.fieldPaths.includes(field)
      ) {
        report(
          "field-coverage",
          [...resourcePath, "properties"],
          "Known or null field must be declared in the observation's supported paths.",
        );
      }
    });
  });
  snapshot.manifest.scopes.forEach((scope, index) => {
    const count = snapshot.resources.filter(
      (resource) => scopeByKind[resource.kind] === scope.scopeId,
    ).length;
    if (count !== (scope.retainedObservation?.resourceCount ?? 0)) {
      report(
        "resource-count",
        [...path, "manifest", "scopes", index],
        "Retained count does not match the scope's resources.",
      );
    }
  });
  snapshot.relationships.forEach((edge, index) => {
    const edgePath = [...path, "relationships", index];
    tenant(edge.tenantId, snapshot.tenantId, [...edgePath, "tenantId"], report);
    validateRelationship(edge, edgePath, report);
    const source = resources.get(resourceKey(edge.from));
    if (!source || source.observationId !== edge.observationId) {
      report(
        "relationship-source",
        edgePath,
        "Relationship must identify its source resource and original observation.",
      );
      return;
    }
    const state = resourceFields(source)[edge.fieldPath];
    const backed =
      state?.status === "value" &&
      (Array.isArray(state.value)
        ? state.value.some(
            (target: { namespace: string; id: string }) => targetKey(target) === targetKey(edge.to),
          )
        : state.value === edge.to.id);
    if (!backed)
      report(
        "relationship-evidence",
        edgePath,
        "Relationship must be backed by a known source field.",
      );
    const target =
      edge.to.namespace === "resource"
        ? resources.get(resourceKey(edge.to))
        : edge.to.namespace === "directory-object"
          ? resources.get(resourceKey({ kind: "principal", id: edge.to.id }))
          : templates.get(edge.to.id);
    if ((edge.resolution === "resolved") !== (target !== undefined)) {
      report(
        "relationship-resolution",
        edgePath,
        "Resolution must agree with target presence; unavailable targets stay unresolved.",
      );
    }
  });
}
function validateBundle(bundle: EvaluationBundle, path: Path, report: Report): void {
  tenant(bundle.snapshot.tenantId, bundle.tenantId, [...path, "snapshot", "tenantId"], report);
  validateSnapshot(bundle.snapshot, [...path, "snapshot"], report);
  if (bundle.baseline) {
    tenant(bundle.baseline.tenantId, bundle.tenantId, [...path, "baseline", "tenantId"], report);
    validateBaseline(bundle.baseline, [...path, "baseline"], report);
  }
  duplicates(bundle.receipts, (receipt) => receipt.id, [...path, "receipts"], report);
  duplicates(bundle.receipts, (receipt) => receipt.assessment.id, [...path, "receipts"], report);
  duplicates(
    bundle.receipts.flatMap((receipt) => (receipt.finding ? [receipt.finding] : [])),
    (finding) => finding.id,
    [...path, "receipts"],
    report,
  );
  const resources = new Map(
    bundle.snapshot.resources.map((resource) => [resourceKey(resource), resource]),
  );
  bundle.receipts.forEach((receipt, index) => {
    const receiptPath = [...path, "receipts", index];
    tenant(receipt.tenantId, bundle.tenantId, [...receiptPath, "tenantId"], report);
    validateReceipt(receipt, receiptPath, report);
    const pins = receipt.provenance;
    if (pins.snapshotId !== bundle.snapshot.id || pins.manifestId !== bundle.snapshot.manifest.id) {
      report(
        "snapshot-reference",
        [...receiptPath, "provenance"],
        "Receipt must pin this snapshot and collection manifest.",
      );
    }
    if (pins.baseline !== null) {
      if (
        !bundle.baseline ||
        pins.baseline.id !== bundle.baseline.id ||
        pins.baseline.version !== bundle.baseline.version
      ) {
        report(
          "baseline-reference",
          [...receiptPath, "provenance", "baseline"],
          "Pinned baseline must match the supplied approved baseline.",
        );
      } else if (after(bundle.baseline.approval.approvedAt, pins.evaluatedAt)) {
        report("chronology", receiptPath, "Baseline approval occurs after evaluation.");
      }
    }
    if (after(bundle.snapshot.manifest.createdAt, pins.evaluatedAt)) {
      report("chronology", receiptPath, "Evaluation predates its collection manifest.");
    }
    const current = receipt.assessment.outcome !== "unknown";
    receipt.evidence.forEach((item, evidenceIndex) => {
      const evidencePath = [...receiptPath, "evidence", evidenceIndex];
      const scope = bundle.snapshot.manifest.scopes.find(
        (entry) => entry.scopeId === scopeByKind[item.resource.kind],
      );
      const observation = scope?.retainedObservation;
      if (!observation || observation.observationId !== item.observationId) {
        report(
          "evidence-observation",
          evidencePath,
          "Evidence must identify the resource scope's retained observation.",
        );
        return;
      }
      if (after(observation.interval.end, pins.evaluatedAt)) {
        report("chronology", evidencePath, "Evaluation predates required evidence.");
      }
      const resource = resources.get(resourceKey(item.resource));
      if (item.kind === "absence") {
        if (resource)
          report(
            "absence-conflict",
            evidencePath,
            "Absence evidence cannot reference a present resource.",
          );
      } else {
        const state = resource && resourceFields(resource)[item.fieldPath];
        if (!resource || resource.observationId !== item.observationId || !state) {
          report(
            "evidence-field",
            evidencePath,
            "Evidence must identify an existing field and its original observation.",
          );
        } else if (
          current &&
          (!knownEvidence(resource, item.fieldPath, state) ||
            !observation.fieldPaths.includes(item.fieldPath))
        ) {
          report(
            "unknown-evidence",
            evidencePath,
            "Required evidence must be known; null is usable only for an assignment's explicit scope absence.",
          );
        }
      }
      if (current) {
        const age = delta(pins.evaluatedAt, observation.interval.start);
        if (
          scope?.latestAttempt.status !== "complete" ||
          scope.latestAttempt.attemptId !== observation.attemptId ||
          age.units > BigInt(pins.freshnessLimitSeconds) * age.scale
        ) {
          report(
            "not-current",
            evidencePath,
            "Current decisions require the latest complete scope within its original freshness limit.",
          );
        }
      }
    });
  });
}

/** Structural parsing plus closed-context invariants where the contract supplies context. */
export function validateContract<K extends ContractKind>(
  kind: K,
  input: unknown,
  binding?: { expectedTenantId: string },
): ValidationResult<ContractTypes[K]> {
  const parsed = contractSchemas[kind].safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "structure:" + issue.code,
        path: issue.path.map((part) => (typeof part === "number" ? part : String(part))),
        message: "Value does not match the versioned contract.",
      })),
    };
  }
  const issues: ContractIssue[] = [];
  const report: Report = (code, path, message) => {
    issues.push({ code, path, message });
  };
  const value = parsed.data;
  if (binding) {
    if (!guid.safeParse(binding.expectedTenantId).success) {
      report("invalid-binding", [], "Configured tenant binding must be a canonical tenant ID.");
    } else {
      tenant(value.tenantId, binding.expectedTenantId, ["tenantId"], report);
    }
  }
  switch (kind) {
    case "resource":
      validateResource(value as Resource, [], report);
      break;
    case "relationship":
      validateRelationship(value as Relationship, [], report);
      break;
    case "manifest":
      validateManifest(value as Manifest, [], report);
      break;
    case "baseline":
      validateBaseline(value as Baseline, [], report);
      break;
    case "assessment": {
      const assessment = value as ContractTypes["assessment"];
      tenant(assessment.subject.tenantId, assessment.tenantId, ["subject", "tenantId"], report);
      duplicates(assessment.reasonCodes, (reason) => reason, ["reasonCodes"], report);
      break;
    }
    case "receipt":
      validateReceipt(value as Receipt, [], report);
      break;
    case "snapshot":
      validateSnapshot(value as Snapshot, [], report);
      break;
    case "evaluationBundle":
      validateBundle(value as EvaluationBundle, [], report);
      break;
    case "finding":
      break;
  }
  return issues.length === 0
    ? { success: true, data: value as ContractTypes[K] }
    : { success: false, issues };
}
