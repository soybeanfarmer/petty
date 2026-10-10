
import { constants, lstatSync, openSync, fstatSync, readSync, closeSync } from "node:fs";
import { guid, type Snapshot, type EvaluationBundle } from "../contracts/schemas.js";
import { validateContract } from "../contracts/validation.js";

export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_JSON_DEPTH = 64;
export type ImportKind = "snapshot" | "evaluationBundle";
export class ImportError extends Error {
  constructor(public readonly stage: "usage" | "file" | "json" | "contract", public readonly code: string, public readonly issueCodes: string[] = []) {
    super(code);
    this.name = "ImportError";
  }
}

// JSON.parse otherwise accepts duplicate keys using last-value-wins semantics.
// This scanner bounds nesting before parsing and compares decoded object keys.
export function parseInput(bytes: Uint8Array): unknown {
  if (bytes.byteLength > MAX_INPUT_BYTES) throw new ImportError("file", "input-too-large");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new ImportError("json", "invalid-utf8"); }
  const stack: ({ kind: "object"; keys: Set<string>; expectsKey: boolean } | { kind: "array" })[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const start = i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === "\\") i++;
        i++;
      }
      const frame = stack.at(-1);
      if (frame?.kind === "object" && frame.expectsKey) {
        let key: string;
        try { key = JSON.parse(text.slice(start, i + 1)) as string; }
        catch { throw new ImportError("json", "malformed-json"); }
        if (frame.keys.has(key)) throw new ImportError("json", "duplicate-json-key");
        frame.keys.add(key);
        frame.expectsKey = false;
      }
    } else if (c === "{" || c === "[") {
      stack.push(c === "{" ? { kind: "object", keys: new Set(), expectsKey: true } : { kind: "array" });
      if (stack.length > MAX_JSON_DEPTH) throw new ImportError("json", "nesting-too-deep");
    } else if (c === "}" || c === "]") {
      stack.pop();
    } else if (c === ",") {
      const frame = stack.at(-1);
      if (frame?.kind === "object") frame.expectsKey = true;
    }
  }
  try { return JSON.parse(text) as unknown; }
  catch { throw new ImportError("json", "malformed-json"); }
}

export function readInput(path: string): Uint8Array {
  // Deliberately no URLs, UNC/device paths, stdin, or alternate data streams.
  if (!path || /[\u0000-\u001f]/u.test(path) || /^[a-z][a-z0-9+.-]*:/iu.test(path) && !/^[a-z]:[\\/]/iu.test(path)
      || path.startsWith("\\\\") || path.startsWith("//")
      || (process.platform === "win32" && path.slice(2).includes(":")))
    throw new ImportError("file", "unsupported-path");
  let fd: number | undefined;
  try {
    const before = lstatSync(path);
    if (!before.isFile()) throw new ImportError("file", "not-regular-file");
    if (before.size > MAX_INPUT_BYTES) throw new ImportError("file", "input-too-large");
    const flags = constants.O_RDONLY | (process.platform === "win32" ? 0 : constants.O_NOFOLLOW | constants.O_NONBLOCK);
    fd = openSync(path, flags);
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino)
      throw new ImportError("file", "file-changed");
    const buffer = Buffer.alloc(MAX_INPUT_BYTES + 1);
    let count = 0;
    while (count < buffer.length) {
      const read = readSync(fd, buffer, count, buffer.length - count, null);
      if (read === 0) break;
      count += read;
    }
    if (count > MAX_INPUT_BYTES) throw new ImportError("file", "input-too-large");
    const after = fstatSync(fd);
    if (count !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs)
      throw new ImportError("file", "file-changed");
    return buffer.subarray(0, count);
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("file", "file-unavailable");
  } finally { if (fd !== undefined) closeSync(fd); }
}

export type Imported = { kind: "snapshot"; data: Snapshot } | { kind: "evaluationBundle"; data: EvaluationBundle };
export function importFile(path: string, expectedTenantId: string, kind: ImportKind = "evaluationBundle"): Imported {
  if (!guid.safeParse(expectedTenantId).success) throw new ImportError("usage", "invalid-tenant");
  const input = parseInput(readInput(path));
  if (kind === "snapshot") {
    const result = validateContract("snapshot", input, { expectedTenantId });
    if (!result.success) throw new ImportError("contract", "invalid-contract", [...new Set(result.issues.map(issue => issue.code))].sort());
    return { kind, data: result.data };
  }
  const result = validateContract("evaluationBundle", input, { expectedTenantId });
  if (!result.success) throw new ImportError("contract", "invalid-contract", [...new Set(result.issues.map(issue => issue.code))].sort());
  return { kind, data: result.data };
}

export function summarize(imported: Imported) {
  const snapshot = imported.kind === "snapshot" ? imported.data : imported.data.snapshot;
  const states = { value: 0, null: 0, missing: 0, unsupported: 0 };
  function count(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    const status = object["status"];
    if (status === "value" || status === "null" || status === "missing" || status === "unsupported") {
      states[status]++;
      return;
    }
    for (const child of Object.values(object)) count(child);
  }
  for (const resource of snapshot.resources) count(resource.properties);
  return {
    status: "accepted",
    kind: imported.kind,
    contractVersion: snapshot.schemaVersion,
    tenantId: snapshot.tenantId,
    resourceCount: snapshot.resources.length,
    relationshipCount: snapshot.relationships.length,
    fieldStates: states,
    scopes: snapshot.manifest.scopes.map(scope => ({
      scopeId: scope.scopeId,
      latestAttempt: {
        status: scope.latestAttempt.status,
        interval: scope.latestAttempt.interval,
        pagesReceived: scope.latestAttempt.pagesReceived,
        paginationComplete: scope.latestAttempt.paginationComplete,
        errorCount: scope.latestAttempt.errorCodes.length,
      },
      retainedObservation: scope.retainedObservation === null ? null : {
        interval: scope.retainedObservation.interval,
        resourceCount: scope.retainedObservation.resourceCount,
        originalSource: scope.retainedObservation.provenance.source,
        unsupportedFieldCount: scope.retainedObservation.unsupportedFieldPaths.length,
      },
    })),
    baselinePresent: imported.kind === "evaluationBundle" ? imported.data.baseline !== null : null,
    receiptCount: imported.kind === "evaluationBundle" ? imported.data.receipts.length : null,
    securityChecksExecuted: false,
  };
}
