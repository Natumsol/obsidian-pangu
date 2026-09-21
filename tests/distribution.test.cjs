const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("directory metadata uses the accepted name without changing plugin identity", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const pkg = JSON.parse(read("package.json"));
  assert.equal(manifest.id, "obsidian-pangu");
  assert.equal(manifest.name, "PanGu");
  assert.match(manifest.description, /[.!?]$/);
  assert.equal(manifest.version, pkg.version);
});

test("the declared MIT license has a repository license file", () => {
  assert.equal(JSON.parse(read("package.json")).license, "MIT");
  assert.match(read("LICENSE"), /MIT License/);
  assert.match(read("LICENSE"), /Permission is hereby granted, free of charge/);
});

test("API dependency is pinned and the release uses the checked-in lockfile", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.devDependencies.obsidian, /^\d+\.\d+\.\d+$/);
  assert.ok(read("yarn.lock").includes(`obsidian@${pkg.devDependencies.obsidian}:`));
  assert.doesNotMatch(read("yarn.lock"), /obsidian-api\/tarball\/master/);
  assert.match(read(".github/workflows/releases.yml"), /--frozen-lockfile/);
});

test("release uploads only the supported plugin files", () => {
  const workflow = read(".github/workflows/releases.yml");
  const assets = [...workflow.matchAll(/asset_name:\s*(.+)/g)].map((m) => m[1].trim());
  assert.deepEqual(assets.sort(), ["main.js", "manifest.json"]);
});

test("release attests every uploaded asset after building and before publishing", () => {
  const workflow = read(".github/workflows/releases.yml");
  const permissions = workflow.match(/^permissions:\n((?:[ \t]+[^\n]*\n)+)/m)?.[1] || "";
  for (const permission of ["contents", "id-token", "attestations"]) {
    assert.match(permissions, new RegExp(`^  ${permission}: write$`, "m"));
  }

  const steps = workflow.split(/^      - /m).slice(1);
  const buildIndex = steps.findIndex((step) => step.includes("npm run build"));
  const attestIndex = steps.findIndex((step) => /uses: actions\/attest@/.test(step));
  const releaseIndex = steps.findIndex((step) => /uses: actions\/create-release@/.test(step));
  assert.ok(buildIndex >= 0 && attestIndex > buildIndex && releaseIndex > attestIndex);

  const attestation = steps[attestIndex];
  assert.match(attestation, /uses: actions\/attest@[a-f0-9]{40}\b/);
  assert.doesNotMatch(attestation, /^\s*(?:if|continue-on-error):/m);
  const subjects = attestation.match(/subject-path: \|\n((?: {12}[^\n]+\n?)+)/)?.[1];
  assert.ok(subjects, "attestation must explicitly list release asset paths");
  const paths = subjects.trim().split(/\s+/).sort();
  assert.deepEqual(paths, ["dist/main.js", "manifest.json"]);
  const uploadedPaths = [...workflow.matchAll(/asset_path:\s*(.+)/g)]
    .map((match) => match[1].trim().replace(/^\.\//, "")).sort();
  assert.deepEqual(paths, uploadedPaths);
});
