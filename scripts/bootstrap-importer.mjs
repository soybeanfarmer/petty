import { readFileSync } from "node:fs";
const paths = ["src/clerk/importer.ts","src/cli.ts","test/cli.test.ts","test/clerk/importer.test.ts","docs/IMPORT.md","README.md","docs/DEVELOPMENT.md","docs/ARCHITECTURE.md","AGENTS.md","ROADMAP.md"];
process.stdout.write("PETTY_GENERATED_FILES:" + JSON.stringify(Object.fromEntries(paths.map(path => [path, readFileSync(path, "utf8")]))) + "\n");
