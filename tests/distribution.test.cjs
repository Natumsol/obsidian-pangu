const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("release notes select only the requested changelog version", () => {
  const notes = execFileSync(
    process.execPath,
    [path.join(root, "scripts/release-notes.mjs"), "2.0.2"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(
    notes,
    "### Fixed\n\n- Generate release notes automatically with GitHub CLI and remove the deprecated create-release and upload-release-asset actions.\n"
  );
});

test("release notes fail when the requested version is missing", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/release-notes.mjs"), "9.9.9"],
    { cwd: root, encoding: "utf8" }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HISTORY\.md has no 9\.9\.9 release section/);
});

test("directory metadata uses the accepted name without changing plugin identity", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const pkg = JSON.parse(read("package.json"));
  assert.equal(manifest.id, "obsidian-pangu");
  assert.equal(manifest.name, "PanGu");
  assert.match(manifest.description, /[.!?]$/);
  assert.equal(manifest.version, pkg.version);
});

test("minimum app version matches the supported E2E floor", () => {
  assert.equal(JSON.parse(read("manifest.json")).minAppVersion, "1.0.3");
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

test("release publishes supported plugin files with changelog notes", () => {
  const workflow = read(".github/workflows/releases.yml");
  const steps = workflow.split(/^      - /m).slice(1);
  const notesIndex = steps.findIndex((step) =>
    step.includes("scripts/release-notes.mjs")
  );
  const releaseIndex = steps.findIndex((step) =>
    step.includes("gh release create")
  );
  const releaseStep = steps[releaseIndex];
  assert.ok(notesIndex >= 0 && releaseIndex > notesIndex);
  assert.ok(releaseStep, "release must be created by GitHub CLI");
  assert.match(releaseStep, /--notes-file release-notes\.md/);
  assert.match(releaseStep, /--title "\$GITHUB_REF_NAME"/);
  assert.doesNotMatch(releaseStep, /--generate-notes/);
  assert.match(releaseStep, /--verify-tag/);
  assert.match(releaseStep, /\bdist\/main\.js\b/);
  assert.match(releaseStep, /\bmanifest\.json\b/);
  assert.doesNotMatch(releaseStep, /\.zip\b|\bstyles\.css\b/);
  assert.doesNotMatch(workflow, /actions\/(?:create-release|upload-release-asset)@/);
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
  const releaseIndex = steps.findIndex((step) => step.includes("gh release create"));
  assert.ok(buildIndex >= 0 && attestIndex > buildIndex && releaseIndex > attestIndex);
  const buildStep = steps[buildIndex];
  assert.match(buildStep, /npm run test:e2e:run/);
  assert.ok(
    buildStep.indexOf("npm run build") < buildStep.indexOf("npm run test:e2e:run"),
    "release E2E must exercise the staged release build"
  );

  const attestation = steps[attestIndex];
  assert.match(attestation, /uses: actions\/attest@[a-f0-9]{40}\b/);
  assert.doesNotMatch(attestation, /^\s*(?:if|continue-on-error):/m);
  const subjects = attestation.match(/subject-path: \|\n((?: {12}[^\n]+\n?)+)/)?.[1];
  assert.ok(subjects, "attestation must explicitly list release asset paths");
  const paths = subjects.trim().split(/\s+/).sort();
  assert.deepEqual(paths, ["dist/main.js", "manifest.json"]);
  const releaseStep = steps[releaseIndex];
  const uploadedPaths = ["dist/main.js", "manifest.json"]
    .filter((path) => releaseStep.includes(path))
    .sort();
  assert.deepEqual(paths, uploadedPaths);
});
