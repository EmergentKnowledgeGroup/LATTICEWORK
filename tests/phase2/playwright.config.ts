import { defineConfig } from "@playwright/test";
import { isAbsolute, resolve } from "node:path";
import {
  candidatePreviewPort,
  requireSafeRepositoryOutput,
} from "../../apps/web/vite.config.ts";

const workspaceRoot = resolve(import.meta.dirname, "../..");
export function phase2PlaywrightOutputDirectory(
  configuredOutput = process.env.LATTICEWORK_P2_PLAYWRIGHT_OUTPUT?.trim(),
): string {
  const target = configuredOutput
    ? isAbsolute(configuredOutput)
      ? configuredOutput
      : resolve(workspaceRoot, configuredOutput)
    : resolve(workspaceRoot, "output/lw-p2-001/playwright");
  return requireSafeRepositoryOutput(
    target,
    workspaceRoot,
    "Phase 2 Playwright output",
  );
}

const outputDir = phase2PlaywrightOutputDirectory();
const baseURL = `http://127.0.0.1:${candidatePreviewPort("production")}`;

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
