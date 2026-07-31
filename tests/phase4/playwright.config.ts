import { defineConfig } from "@playwright/test";
import { isAbsolute, relative, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");

function configuredPort(): number {
  const raw = process.env.LATTICEWORK_P4_PORT ?? "4194";
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw new Error("LATTICEWORK_P4_PORT must be an integer from 1024 through 65535.");
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

function p4Output(): string {
  return insideWorkspace(
    resolve(workspaceRoot, "runtime/tmp/p4-browser-agent/playwright"),
    "Phase 4 Playwright output",
  );
}

const port = configuredPort();
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  outputDir: p4Output(),
  reporter: [["list"], ["json", { outputFile: resolve(p4Output(), "results.json") }]],
  testDir: ".",
  testMatch: "**/*.spec.ts",
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
    // Deliberately serves only the candidate web root; this is not an app listener.
    command: `node ../../node_modules/vite/bin/vite.js ../../apps/web --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: ".",
    reuseExistingServer: false,
    timeout: 30_000,
    url: baseURL,
  },
});
