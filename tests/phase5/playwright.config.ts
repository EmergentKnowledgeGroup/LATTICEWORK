import { defineConfig } from "@playwright/test";
import { isAbsolute, relative, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");

function configuredPort(): number {
  const raw = process.env.LATTICEWORK_P5_PORT ?? "5195";
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw new Error("LATTICEWORK_P5_PORT must be an integer from 1024 through 65535.");
  }
  return value;
}

function insideWorkspace(target: string, label: string): string {
  const resolved = resolve(target);
  const rel = relative(workspaceRoot, resolved).replaceAll("\\", "/");
  if (rel.length === 0 || rel.startsWith("../") || isAbsolute(rel)) {
    throw new Error(`${label} must stay inside the workspace.`);
  }
  return resolved;
}

const port = configuredPort();
const baseURL = `http://127.0.0.1:${port}`;
const outputDir = insideWorkspace(
  resolve(workspaceRoot, "runtime/tmp/phase5-browser-agent/playwright"),
  "Phase 5 Playwright output",
);

export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir,
  reporter: [["list"], ["json", { outputFile: resolve(outputDir, "results.json") }]],
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 90_000,
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    // Evidence uses attached redacted JSON receipts; screenshots/traces can contain test content.
    screenshot: "off",
    trace: "off",
    video: "off",
    serviceWorkers: "block",
  },
  webServer: {
    // This serves only the static test harness. It is not an application listener.
    command: `node ../../node_modules/vite/bin/vite.js static --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: ".",
    reuseExistingServer: false,
    timeout: 30_000,
    url: baseURL,
  },
});
