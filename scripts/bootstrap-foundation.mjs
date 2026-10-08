import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const paths = execFileSync("git", ["diff", "--name-only", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
paths.push("package-lock.json");
const files = Object.fromEntries(paths.map((path) => [path, readFileSync(path, "utf8")]));
console.log("PETTY_GENERATED_FILES:" + JSON.stringify(files));
