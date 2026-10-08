import { mkdir, writeFile } from "node:fs/promises";
import { contractSchemas, structuralSchema } from "../dist/src/contracts/index.js";

const destination = new URL("../dist/schemas/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const kind of Object.keys(contractSchemas)) {
  await writeFile(
    new URL(kind + ".schema.json", destination),
    JSON.stringify(structuralSchema(kind), null, 2) + "\n",
  );
}
