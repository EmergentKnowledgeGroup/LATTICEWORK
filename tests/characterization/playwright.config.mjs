import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

const harnessRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(harnessRoot, "..", "..");
const baselineRoot = path.resolve(
  process.env.LATTICEWORK_BASELINE_ROOT ?? "Z:\\LATTICEWORK_BASELINE_e7585999",
);
const evidenceRoot = path.resolve(
  process.env.LATTICEWORK_PHASE1_EVIDENCE_ROOT ??
    path.join(
      repositoryRoot,
      "reengineering",
      "evidence",
      "phase-1",
      "LW-P1-001",
      "playwright",
    ),
);
const baseURL =
  process.env.LATTICEWORK_CHARACTERIZATION_BASE_URL ??
  "http://127.0.0.1:4174";
const serverUrl = new URL(baseURL);
if (
  serverUrl.protocol !== "http:" ||
  serverUrl.hostname !== "127.0.0.1" ||
  !serverUrl.port
) {
  throw new Error(
    `Characterization base URL must be an explicit 127.0.0.1 HTTP port: ${baseURL}`,
  );
}

const baselineEntry = path.join(baselineRoot, "docs", "app.html");
if (!fs.existsSync(baselineEntry)) {
  throw new Error(`Immutable baseline entry is missing: ${baselineEntry}`);
}

export default defineConfig({
  testDir: path.join(harnessRoot, "specs"),
  testMatch: "**/*.spec.mjs",
  outputDir: path.join(evidenceRoot, "test-results"),
  snapshotPathTemplate: path.join(
    harnessRoot,
    "snapshots",
    "{testFilePath}",
    "{arg}{ext}",
  ),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 12_000,
  },
  forbidOnly: true,
  reporter: [
    ["line"],
    [
      "json",
      {
        outputFile: path.join(evidenceRoot, "playwright-results.json"),
      },
    ],
  ],
  metadata: {
    baseline_sha:
      process.env.LATTICEWORK_BASELINE_SHA ??
      "e7585999fc1af2707f410ae87356cf2b52e08d9c",
    baseline_root: baselineRoot,
    allowed_origin: new URL(baseURL).origin,
    evidence_label: "OBSERVED",
  },
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    locale: "en-US",
    timezoneId: "UTC",
    permissions: ["clipboard-read", "clipboard-write"],
    serviceWorkers: "allow",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    launchOptions: {
      args: [
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-sync",
        "--no-default-browser-check",
      ],
    },
  },
  webServer: {
    command: `python -m http.server ${serverUrl.port} --bind 127.0.0.1`,
    cwd: baselineRoot,
    url: `${baseURL}/docs/app.html`,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: "ignore",
    stderr: "ignore",
  },
});
