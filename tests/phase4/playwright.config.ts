import { defineConfig } from "@playwright/test";
import { isAbsolute, relative, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const configuredPort = 4194;

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

const baseURL = `http://127.0.0.1:${configuredPort}`;

export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
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
    command: `npm exec --prefix ../.. vite -- ../../apps/web --host 127.0.0.1 --port ${configuredPort} --strictPort`,
    cwd: ".",
    reuseExistingServer: false,
    timeout: 30_000,
    url: baseURL,
  },
});
