import { defineConfig } from "@playwright/test";
import { isAbsolute, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const configuredPort = Number(process.env.LATTICEWORK_P3_PORT ?? "4193");
if (
  !Number.isInteger(configuredPort) ||
  configuredPort < 1024 ||
  configuredPort > 65535
) {
  throw new Error(
    "LATTICEWORK_P3_PORT must be an integer between 1024 and 65535.",
  );
}

function outputDirectory(): string {
  const configured = process.env.LATTICEWORK_P3_PLAYWRIGHT_OUTPUT?.trim();
  const resolved = configured
    ? isAbsolute(configured)
      ? configured
      : resolve(workspaceRoot, configured)
    : resolve(workspaceRoot, "output/lw-p3-001/playwright");
  const relative = resolved
    .slice(workspaceRoot.length)
    .replaceAll("\\", "/");
  if (!relative.startsWith("/") || relative.includes("/../")) {
    throw new Error("Phase 3 Playwright output must stay inside the repository.");
  }
  return resolved;
}

const baseURL = `http://127.0.0.1:${configuredPort}`;

export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
  outputDir: outputDirectory(),
  reporter: [
    ["list"],
    ["json", { outputFile: resolve(outputDirectory(), "results.json") }],
  ],
  testDir: ".",
  timeout: 45_000,
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: {
    command: "vite preview --config vite.config.ts",
    cwd: ".",
    reuseExistingServer: false,
    timeout: 30_000,
    url: baseURL,
  },
});
