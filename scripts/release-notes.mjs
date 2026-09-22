import { readFile } from "node:fs/promises";

const version = process.argv[2];

if (!version) {
  throw new Error("Usage: node scripts/release-notes.mjs <version>");
}

const history = await readFile(new URL("../HISTORY.md", import.meta.url), "utf8");
const lines = history.split(/\r?\n/);
const heading = `## [${version}]`;
const start = lines.findIndex((line) => line.startsWith(heading));

if (start < 0) {
  throw new Error(`HISTORY.md has no ${version} release section`);
}

const nextHeading = lines.findIndex(
  (line, index) => index > start && line.startsWith("## ")
);
const notes = lines
  .slice(start + 1, nextHeading < 0 ? lines.length : nextHeading)
  .join("\n")
  .trim();

if (!notes) {
  throw new Error(`HISTORY.md section for ${version} is empty`);
}

process.stdout.write(`${notes}\n`);
