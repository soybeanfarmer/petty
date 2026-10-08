import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const paths = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMRT"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const approvedPaths = new Set([".editorconfig",".gitattributes",".github/ISSUE_TEMPLATE/bug_report.yml",".github/ISSUE_TEMPLATE/config.yml",".github/ISSUE_TEMPLATE/feature_request.yml",".github/ISSUE_TEMPLATE/milestone.yml",".github/pull_request_template.md",".github/workflows/ci.yml",".gitignore",".node-version",".npmrc",".nvmrc",".prettierignore",".prettierrc.json","AGENTS.md","CONTRIBUTING.md","LICENSE","README.md","ROADMAP.md","SECURITY.md","docs/ACCEPTANCE_CASES.md","docs/ARCHITECTURE.md","docs/COVERAGE.md","docs/DEVELOPMENT.md","docs/PRODUCT_CONTRACT.md","docs/THREAT_MODEL.md","docs/decisions/0001-base-architecture.md","docs/decisions/0002-initial-product-contract.md","docs/decisions/0003-toolchain.md","docs/decisions/README.md","package-lock.json","package.json","scripts/check-toolchain.mjs","scripts/clean.mjs","src/cli.ts","test/cli.test.ts","test/toolchain/strictness.fixture.ts","tsconfig.json","src/contracts/schemas.ts","src/contracts/validation.ts","src/contracts/index.ts","scripts/export-schemas.mjs","test/contracts/helpers.ts","test/contracts/contracts.test.ts","docs/DATA_CONTRACTS.md","docs/decisions/0004-data-contracts.md",".github/workflows/bootstrap-contracts.yml","scripts/bootstrap-contracts.mjs"]);
const generated = {};
for (const path of paths) {
  if (!approvedPaths.has(path)) throw new Error("Unexpected generated path.");
  generated[path] = readFileSync(path, "utf8");
}
process.stdout.write("PETTY_GENERATED_FILES:" + JSON.stringify(generated) + "\n");
