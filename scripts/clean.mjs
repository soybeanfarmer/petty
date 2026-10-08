import { rm } from "node:fs/promises";

// Fixed build directory relative to this script; no caller-supplied deletion path.
await rm(new URL("../dist/", import.meta.url), { recursive: true, force: true });
