import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("../src/cli.js", import.meta.url));

function run(args: string[]) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: tmpdir(),
    env: {},
    encoding: "utf8",
    timeout: 5000,
  });
  assert.ifError(result.error);
  return result;
}

test("compiled CLI help runs without credentials and outside the checkout", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Usage: petty/);
  assert.match(result.stdout, /not implemented yet/);
});

test("no arguments show help instead of attempting collection", () => {
  const result = run([]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Offline fixture import only/);
});

test("version uses repository package metadata from outside the checkout", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { version: string };
  const result = run(["--version"]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `petty ${manifest.version}\n`);
});

test("unsupported operations fail with an actionable usage error", () => {
  const result = run(["scan"]);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /unsupported-operation/);
  assert.match(result.stderr, /--help/);
});

test("extra arguments do not silently change the requested operation", () => {
  const result = run(["--help", "scan"]);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
});
