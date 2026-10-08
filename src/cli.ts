import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const help = [
  "Petty. It keeps receipts.",
  "",
  "Usage: petty [--help | --version]",
  "",
  "  --help, -h     Show this help",
  "  --version, -v  Show the foundation version",
  "",
  "Repository foundation only. Tenant collection and security checks are not implemented yet.",
  "",
].join("\n");

if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0] ?? ""))) {
  process.stdout.write(help);
} else if (args.length === 1 && ["--version", "-v"].includes(args[0] ?? "")) {
  const manifest = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { version: string };
  process.stdout.write(`petty ${manifest.version}\n`);
} else {
  process.stderr.write(`Unsupported arguments: ${args.map((arg) => JSON.stringify(arg)).join(" ")}\n`);
  process.stderr.write("Use --help for available options.\n");
  process.exitCode = 2;
}
