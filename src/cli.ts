
import { readFileSync } from "node:fs";
import { ImportError, importFile, summarize, type ImportKind } from "./clerk/importer.js";

const args = process.argv.slice(2);
const help = [
  "Petty. It keeps receipts.",
  "",
  "Usage: petty [--help | --version]",
  "       petty import --file <path> --tenant <GUID> [--kind evaluationBundle|snapshot]",
  "",
  "  --help, -h     Show this help",
  "  --version, -v  Show the foundation version",
  "",
  "Offline fixture import only. Tenant collection and security checks are not implemented yet.",
  "",
].join("\n");

function runImport(): void {
  const options = new Map<string, string>();
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    if (!flag || !["--file", "--tenant", "--kind"].includes(flag) || options.has(flag) || !value || value.startsWith("--"))
      throw new ImportError("usage", "invalid-options");
    options.set(flag, value);
  }
  const file = options.get("--file");
  const tenant = options.get("--tenant");
  const kind = options.get("--kind") ?? "evaluationBundle";
  if (!file || !tenant) throw new ImportError("usage", "missing-file-or-tenant");
  if (kind !== "snapshot" && kind !== "evaluationBundle") throw new ImportError("usage", "unsupported-kind");
  process.stdout.write(JSON.stringify(summarize(importFile(file, tenant, kind as ImportKind))) + "\n");
}

try {
  if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0] ?? ""))) {
    process.stdout.write(help);
  } else if (args.length === 1 && ["--version", "-v"].includes(args[0] ?? "")) {
    const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
    process.stdout.write(`petty ${manifest.version}\n`);
  } else if (args[0] === "import") {
    runImport();
  } else {
    throw new ImportError("usage", "unsupported-operation");
  }
} catch (error) {
  const known = error instanceof ImportError;
  const stage = known ? error.stage : "internal";
  process.stderr.write(JSON.stringify({
    status: "rejected",
    stage,
    code: known ? error.code : "internal-error",
    issueCodes: known ? error.issueCodes.slice(0, 20) : [],
    issueCodeCount: known ? error.issueCodes.length : 0,
    ...(stage === "usage" ? { help: "Use --help for available options." } : {}),
  }) + "\n");
  process.exitCode = stage === "usage" ? 2 : stage === "file" ? 4 : stage === "internal" ? 1 : 3;
}
