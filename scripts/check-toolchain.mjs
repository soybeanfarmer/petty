import { readFileSync } from "node:fs";

const expectedNode = readFileSync(new URL("../.node-version", import.meta.url), "utf8").trim();
const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const expectedNpm = manifest.packageManager.replace("npm@", "");
const actualNpm = process.env.npm_config_user_agent?.split(" ")[0]?.replace("npm/", "");

if (process.versions.node !== expectedNode || actualNpm !== expectedNpm) {
  console.error(
    `Expected Node ${expectedNode} and npm ${expectedNpm}; found Node ${process.versions.node} and npm ${actualNpm ?? "unknown"}. Run this check through npm.`,
  );
  process.exitCode = 1;
} else {
  console.log(`Using Node ${expectedNode} and npm ${expectedNpm}.`);
}
