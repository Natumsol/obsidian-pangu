import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const stage = resolve(root, ".e2e/plugin");
const results = resolve(root, "e2e-results");
const files = ["manifest.json", "dist/main.js"];

for (const file of files) {
  if (!existsSync(resolve(root, file))) {
    throw new Error(`Missing ${file}; run npm run build before E2E tests`);
  }
}

rmSync(stage, { recursive: true, force: true });
rmSync(results, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
copyFileSync(resolve(root, "manifest.json"), resolve(stage, "manifest.json"));
copyFileSync(resolve(root, "dist/main.js"), resolve(stage, "main.js"));

const sha256 = createHash("sha256")
  .update(readFileSync(resolve(stage, "main.js")))
  .digest("hex");
writeFileSync(
  resolve(root, ".e2e/plugin-build.json"),
  `${JSON.stringify({ sha256 }, null, 2)}\n`
);
console.log(`Prepared PanGu E2E artifact ${sha256}`);
