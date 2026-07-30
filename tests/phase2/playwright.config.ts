import { defineConfig } from "@playwright/test";
import { isAbsolute, relative, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const configuredOutput = process.env.LATTICEWORK_P2_PLAYWRIGHT_OUTPUT?.trim();
const outputDir = resolve(
  workspaceRoot,
  configuredOutput && !isAbsolute(configuredOutput)
    ? configuredOutput
    : configuredOutput || "output/lw-p2-001/playwright",
);
const outputRelative = relative(workspaceRoot, outputDir);
if (
  outputRelative.length === 0 ||
  outputRelative.startsWith("..") ||
  isAbsolute(outputRelative)
) {
  throw new Error("Phase 2 Playwright output must stay inside the LATTICEWORK repository.");
}
const configuredPort = Number(process.env.LATTICEWORK_P2_PORT ?? "4174");
if (!Number.isInteger(configuredPort) || configuredPort < 1024 || configuredPort > 65535) {
  throw new Error("LATTICEWORK_P2_PORT must be an integer between 1024 and 65535.");
}
const baseURL = `http://127.0.0.1:${configuredPort}`;

export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
  outputDir,
  reporter: [
    ["list"],
    ["json", { outputFile: resolve(outputDir, "results.json") }],
  ],
  testDir: ".",
  timeout: 30_000,
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off"
  },
  webServer: {
    command: "npm --prefix ../.. run p2:preview",
    cwd: ".",
    reuseExistingServer: false,
    timeout: 30_000,
    url: baseURL
  }
});
