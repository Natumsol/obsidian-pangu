import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseObsidianVersions } from "wdio-obsidian-service";

const root = resolve(import.meta.dirname, "../..");
const cacheDir = resolve(root, ".obsidian-cache");
const resultsDir = resolve(root, "e2e-results");
const requestedVersions =
  process.env.OBSIDIAN_VERSIONS || "1.13.7/1.12.4";
const versions = await parseObsidianVersions(requestedVersions, { cacheDir });

mkdirSync(resultsDir, { recursive: true });

export const config = {
  runner: "local",
  framework: "mocha",
  specs: [resolve(import.meta.dirname, "specs/**/*.e2e.mjs")],
  maxInstances: 1,
  capabilities: versions.map(([appVersion, installerVersion]) => ({
    browserName: "obsidian",
    browserVersion: appVersion,
    "wdio:obsidianOptions": {
      installerVersion,
      plugins: [resolve(root, ".e2e/plugin")],
      vault: resolve(import.meta.dirname, "fixtures/base-vault"),
    },
  })),
  services: ["obsidian"],
  reporters: ["obsidian"],
  cacheDir,
  outputDir: resultsDir,
  logLevel: "warn",
  autoXvfb: true,
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  mochaOpts: {
    ui: "bdd",
    timeout: 120_000,
    retries: 0,
  },
  afterTest: async function (test, _context, result) {
    if (result.passed || !globalThis.browser?.sessionId) return;
    const name = test.title.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
    await globalThis.browser.saveScreenshot(resolve(resultsDir, `${name}.png`));
  },
};
