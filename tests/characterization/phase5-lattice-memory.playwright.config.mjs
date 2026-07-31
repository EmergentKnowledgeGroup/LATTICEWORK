import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const outputDir = path.resolve(process.env.LATTICEWORK_P5_PLAYWRIGHT_ROOT ?? path.join(root, "runtime", "tmp", "phase5-lattice-memory"));

export default defineConfig({
  testDir: path.join(here, "specs"),
  testMatch: "phase5-lattice-memory.spec.mjs",
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  outputDir,
  reporter: [["line"], ["json", { outputFile: path.join(outputDir, "playwright-results.json") }]],
  use: {
    browserName: "chromium",
    headless: true,
    screenshot: "off",
    trace: "off",
    video: "off",
    serviceWorkers: "block"
  },
  metadata: {
    evidence_label: "OBSERVED",
    browser_channel: "chrome",
    fixture_listener: "run-owned 127.0.0.1 port 0 static-baseline-only"
  }
});
