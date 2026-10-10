import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ImportError,
  importFile,
  parseInput,
  readInput,
  summarize,
  MAX_INPUT_BYTES,
  MAX_JSON_DEPTH,
} from "../../src/clerk/importer.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const entry = join(root, "dist/src/cli.js");
const fixtureRoot = join(root, "fixtures/tenant-scenarios");
const catalog = JSON.parse(readFileSync(join(fixtureRoot, "catalog.json"), "utf8")) as {
  tenantId: string;
  scenarios: { id: string; validation: { result: string; issueCodes?: string[] } }[];
};
function fixture(id: string) {
  return join(fixtureRoot, "cases", id, id === "malformed-json" ? "input.json.txt" : "input.json");
}
function cli(args: string[]) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: tmpdir(),
    env: {},
    encoding: "utf8",
    timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}
function rejects(code: string) {
  return (error: unknown) => error instanceof ImportError && error.code === code;
}
function temporary(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "petty-import-"));
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
for (const scenario of catalog.scenarios) {
  test(`CLI imports saved scenario: ${scenario.id}`, () => {
    const before = readFileSync(fixture(scenario.id));
    const result = cli(["import", "--file", fixture(scenario.id), "--tenant", catalog.tenantId]);
    assert.deepEqual(readFileSync(fixture(scenario.id)), before);
    if (scenario.validation.result === "accept") {
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, "");
      const output = JSON.parse(result.stdout);
      assert.equal(output.status, "accepted");
      assert.equal(output.tenantId, catalog.tenantId);
      assert.equal(output.securityChecksExecuted, false);
      assert.equal(output.receiptCount, 0);
      assert.equal(output.resourceCount, JSON.parse(before.toString()).snapshot.resources.length);
    } else {
      assert.equal(result.status, 3);
      assert.equal(result.stdout, "");
      const output = JSON.parse(result.stderr);
      assert.equal(
        output.stage,
        scenario.validation.result === "reject-json" ? "json" : "contract",
      );
      for (const code of scenario.validation.issueCodes ?? [])
        assert.ok(output.issueCodes.includes(code));
    }
  });
}

test("partial and failed scopes preserve original evidence intervals", () => {
  for (const id of ["partial-policy-retained", "failed-role-retained"]) {
    const imported = importFile(fixture(id), catalog.tenantId);
    const summary = summarize(imported);
    assert.equal(imported.kind, "evaluationBundle");
    if (imported.kind !== "evaluationBundle") return;
    for (const scope of imported.data.snapshot.manifest.scopes) {
      const actual = summary.scopes.find((item) => item.scopeId === scope.scopeId);
      assert.deepEqual(actual?.latestAttempt.interval, scope.latestAttempt.interval);
      assert.deepEqual(
        actual?.retainedObservation?.interval ?? null,
        scope.retainedObservation?.interval ?? null,
      );
      assert.equal(actual?.latestAttempt.status, scope.latestAttempt.status);
    }
  }
});
test("unavailable fields and absent history remain visible", () => {
  assert.ok(
    summarize(importFile(fixture("unsupported-policy-state"), catalog.tenantId)).fieldStates
      .unsupported > 0,
  );
  assert.ok(
    summarize(importFile(fixture("optional-label-unavailable"), catalog.tenantId)).fieldStates
      .missing > 0,
  );
  assert.equal(
    summarize(importFile(fixture("missing-baseline"), catalog.tenantId)).baselinePresent,
    false,
  );
  const scope = summarize(
    importFile(fixture("permission-denied-no-policy-history"), catalog.tenantId),
  ).scopes.find((item) => item.scopeId === "conditional-access-policies");
  assert.equal(scope?.latestAttempt.status, "failed");
  assert.equal(scope?.retainedObservation, null);
});
test("summary excludes tenant-controlled text and validation never executes it", () => {
  const output = cli([
    "import",
    "--file",
    fixture("untrusted-display-name"),
    "--tenant",
    catalog.tenantId,
  ]);
  assert.equal(output.status, 0);
  assert.doesNotMatch(output.stdout, /displayName|<script|ignore previous|\$\(/i);
  const imported = importFile(fixture("untrusted-display-name"), catalog.tenantId);
  assert.equal(imported.kind, "evaluationBundle");
  if (imported.kind === "evaluationBundle")
    assert.deepEqual(
      imported.data,
      JSON.parse(readFileSync(fixture("untrusted-display-name"), "utf8")),
    );
});
test("snapshot mode validates the closed snapshot and does not infer an approval", () =>
  temporary((dir) => {
    const bundle = JSON.parse(readFileSync(fixture("compliant"), "utf8"));
    const path = join(dir, "snapshot.json");
    writeFileSync(path, JSON.stringify(bundle.snapshot));
    const result = cli([
      "import",
      "--file",
      path,
      "--tenant",
      catalog.tenantId,
      "--kind",
      "snapshot",
    ]);
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.kind, "snapshot");
    assert.equal(summary.baselinePresent, null);
    assert.equal(summary.receiptCount, null);
    assert.equal(cli(["import", "--file", path, "--tenant", catalog.tenantId]).status, 3);
    assert.equal(
      cli([
        "import",
        "--file",
        fixture("compliant"),
        "--tenant",
        catalog.tenantId,
        "--kind",
        "snapshot",
      ]).status,
      3,
    );
  }));
test("usage requires an explicit canonical tenant and rejects ambiguous options", () => {
  for (const extra of [
    [],
    ["--file", fixture("compliant")],
    ["--tenant", catalog.tenantId],
    ["--file", fixture("compliant"), "--tenant", "TENANT"],
    ["--file", fixture("compliant"), "--tenant", catalog.tenantId, "--tenant", catalog.tenantId],
    ["--file", fixture("compliant"), "--tenant", catalog.tenantId, "--kind", "resource"],
    ["--file", fixture("compliant"), "--tenant", catalog.tenantId, "--unknown", "secret-argument"],
    ["--file", fixture("compliant"), "--tenant", catalog.tenantId, "--kind"],
  ]) {
    const result = cli(["import", ...extra]);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(result.stderr).stage, "usage");
    assert.doesNotMatch(result.stderr, /secret-argument|compliant/);
  }
});
test("JSON parser rejects duplicate decoded keys at any nesting level", () => {
  for (const text of ['{"a":1,"a":2}', '{"outer":{"a":1,"a":2}}', '{"a":1,"\\u0061":2}'])
    assert.throws(() => parseInput(Buffer.from(text)), rejects("duplicate-json-key"));
  assert.deepEqual(
    parseInput(Buffer.from('{"a":{"x":1},"b":{"x":2},"array":[{"x":3}],"text":"[{\\\"x\\\":4}]"}')),
    { a: { x: 1 }, b: { x: 2 }, array: [{ x: 3 }], text: '[{"x":4}]' },
  );
});
test("JSON parser rejects malformed syntax, BOM, and invalid UTF-8 without echoing content", () => {
  for (const text of ['{"secret":', '{"x":NaN}', '{"x":1,}', '{"x":1} trailing', "\uFEFF{}"])
    assert.throws(() => parseInput(Buffer.from(text)), rejects("malformed-json"));
  assert.throws(() => parseInput(Uint8Array.from([0xc3, 0x28])), rejects("invalid-utf8"));
});
test("JSON nesting is bounded with string contents excluded", () => {
  const text = "[".repeat(MAX_JSON_DEPTH) + "0" + "]".repeat(MAX_JSON_DEPTH);
  assert.doesNotThrow(() => parseInput(Buffer.from(text)));
  assert.throws(() => parseInput(Buffer.from("[" + text + "]")), rejects("nesting-too-deep"));
  assert.equal(parseInput(Buffer.from(JSON.stringify("[".repeat(100)))), "[".repeat(100));
});
test("input size budget is enforced at parser and file boundaries", () =>
  temporary((dir) => {
    const path = join(dir, "limit.json");
    const boundary = Buffer.from("{}" + " ".repeat(MAX_INPUT_BYTES - 2));
    writeFileSync(path, boundary);
    assert.deepEqual(parseInput(readInput(path)), {});
    writeFileSync(path, Buffer.concat([boundary, Buffer.from(" ")]));
    assert.throws(() => readInput(path), rejects("input-too-large"));
    assert.throws(() => parseInput(Buffer.alloc(MAX_INPUT_BYTES + 1)), rejects("input-too-large"));
  }));
test("only regular local files are accepted and file errors are sanitized", () =>
  temporary((dir) => {
    const path = join(dir, "nonexistent-private-name");
    for (const invalid of [
      path,
      dir,
      "https://example.invalid/secret",
      "file:///private",
      "\\\\server\\share\\secret",
      "//server/share/secret",
    ]) {
      const result = cli(["import", "--file", invalid, "--tenant", catalog.tenantId]);
      assert.equal(result.status, 4);
      assert.equal(result.stdout, "");
      assert.doesNotMatch(result.stderr, /private-name|example|server|share|secret/);
    }
    const target = join(dir, "target.json"),
      link = join(dir, "link.json");
    writeFileSync(target, "{}");
    if (process.platform !== "win32") {
      symlinkSync(target, link);
      assert.throws(() => readInput(link), rejects("not-regular-file"));
    }
  }));
test("hostile contract fields and unknown keys never reach diagnostic output", () =>
  temporary((dir) => {
    const path = join(dir, "bad.json");
    writeFileSync(
      path,
      JSON.stringify({ secretToken: "DO_NOT_PRINT", schemaVersion: "secret-version" }),
    );
    const result = cli(["import", "--file", path, "--tenant", catalog.tenantId]);
    assert.equal(result.status, 3);
    assert.equal(JSON.parse(result.stderr).code, "invalid-contract");
    assert.doesNotMatch(result.stderr, /secretToken|DO_NOT_PRINT|secret-version/);
  }));
