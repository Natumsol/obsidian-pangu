const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { ESLint } = require("eslint");

const cwd = path.join(__dirname, "..");
const rule = "obsidianmd/no-unsupported-api";

test("declared minimum Obsidian version passes the official API rule", async () => {
  const eslint = new ESLint({ cwd });
  const results = await eslint.lintFiles(["src/**/*.ts"]);
  assert.ok(results.length >= 2, "both plugin and formatter must be checked");
  for (const result of results) {
    const config = await eslint.calculateConfigForFile(result.filePath);
    assert.equal(config.rules[rule]?.[0], 2, "API rule must remain enabled");
    assert.equal(
      config.rules[rule]?.[1]?.minAppVersion,
      undefined,
      "the normal check must read manifest.json, not override its minimum"
    );
  }
  assert.deepEqual(
    results.flatMap((result) => result.messages),
    []
  );
});

test("official API check rejects the previously advertised 0.9.12 minimum", () => {
  // In CI, typescript-eslint treats a second parse in the same process as an
  // autofix and uses an isolated Program without dependency declarations.
  // A fresh CLI process keeps this negative control fully type-aware.
  const eslintBin = path.join(
    path.dirname(require.resolve("eslint/package.json")),
    "bin",
    "eslint.js"
  );
  const result = spawnSync(
    process.execPath,
    [
      eslintBin,
      "src/main.ts",
      "--format",
      "json",
      "--rule",
      JSON.stringify({ [rule]: ["error", { minAppVersion: "0.9.12" }] }),
    ],
    {
      cwd,
      encoding: "utf8",
      timeout: 60000,
    }
  );
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  const messages = JSON.parse(result.stdout).flatMap(
    (result) => result.messages
  );
  assert.ok(messages.length > 0, "negative control must not silently pass");
  assert.ok(messages.every((message) => message.ruleId === rule));
  assert.ok(
    messages.some((message) =>
      message.message.includes("Workspace.getActiveViewOfType")
    )
  );
  assert.ok(
    messages.some((message) => message.message.includes("Setting.setName"))
  );
});
