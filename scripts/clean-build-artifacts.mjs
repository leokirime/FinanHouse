import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const targets = [
  "packages/domain/dist",
  "apps/api/dist",
  "apps/web/dist",
];

for (const target of targets) {
  rmSync(path.join(root, target), { recursive: true, force: true });
  console.log(`removido: ${target}`);
}
