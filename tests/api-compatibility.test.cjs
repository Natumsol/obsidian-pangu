const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
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

test("official API check rejects the previously advertised 0.9.12 minimum", async () => {
  const results = await new ESLint({
    cwd,
    overrideConfig: {
      rules: { [rule]: ["error", { minAppVersion: "0.9.12" }] },
    },
  }).lintFiles(["src/main.ts"]);
  const messages = results.flatMap((result) => result.messages);
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
