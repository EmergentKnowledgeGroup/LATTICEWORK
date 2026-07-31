import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const BASELINE_ROOT = process.env.LATTICEWORK_BASELINE_ROOT;
const PHASE2_TERMINAL = "7e928bba605e0309273989bf8fd1303d2a822923";

const PROTECTED_PATHS = [
  "app.html",
  "index.html",
  "docs/app.html",
  "docs/sw.js",
  "sw.js",
  "server.js",
  "server.py",
  "tests/smoke.js",
];

const FORBIDDEN_RUNTIME_PATTERNS = [
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,
  /\bcaches\b/,
  /\bserviceWorker\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bRTCPeerConnection\b/,
  /\bWebTransport\b/,
  /\bBroadcastChannel\b/,
  /\bnavigator\.gpu\b/,
  /\bAudioContext\b/,
  /\bshowOpenFilePicker\b/,
  /\bclipboard\b/,
  /\bNotification\b/,
];

function readJsonAt(commit, relativePath) {
  const result = spawnSync("git", ["show", `${commit}:${relativePath}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(
    result.status,
    0,
    `Unable to read ${relativePath} at ${commit}: ${result.stderr?.trim() || "unknown Git error"}`,
  );
  return JSON.parse(result.stdout);
}

function gitBlobOid(repositoryRoot, relativePath) {
  const result = spawnSync("git", ["rev-parse", `HEAD:${relativePath}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(
    result.status,
    0,
    `Unable to resolve committed blob for ${relativePath}: ${result.stderr?.trim() || "unknown Git error"}`,
  );
  return result.stdout.trim();
}

function walkSource(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSource(entryPath));
    } else if (entry.isFile() && /\.(?:ts|js|mjs|html|css)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

test("Phase 2 direct dependency set is exact and workspace-scoped", () => {
  const root = readJsonAt(PHASE2_TERMINAL, "package.json");
  const web = readJsonAt(PHASE2_TERMINAL, "apps/web/package.json");
  const contracts = readJsonAt(PHASE2_TERMINAL, "packages/contracts/package.json");
  const kernel = readJsonAt(PHASE2_TERMINAL, "packages/kernel/package.json");
  const browser = readJsonAt(PHASE2_TERMINAL, "tests/phase2/package.json");

  assert.deepEqual(root.devDependencies, {
    typescript: "6.0.3",
    vite: "8.1.5",
  });
  assert.deepEqual(web.dependencies, {
    "@latticework/contracts": "0.0.0",
    "@latticework/kernel": "0.0.0",
    lit: "3.3.3",
  });
  assert.deepEqual(kernel.dependencies, {
    "@latticework/contracts": "0.0.0",
  });
  assert.equal(contracts.dependencies, undefined);
  assert.deepEqual(browser.devDependencies, {
    "@playwright/test": "1.62.0",
  });
});

test("candidate and kernel source contain no privileged or durable runtime APIs", () => {
  const roots = [
    path.join(REPO_ROOT, "apps", "web", "src"),
    path.join(REPO_ROOT, "packages", "contracts", "src"),
    path.join(REPO_ROOT, "packages", "kernel", "src"),
  ];
  const failures = [];
  for (const filePath of roots.flatMap(walkSource)) {
    const text = fs.readFileSync(filePath, "utf8");
    for (const pattern of FORBIDDEN_RUNTIME_PATTERNS) {
      if (pattern.test(text)) {
        failures.push(`${path.relative(REPO_ROOT, filePath)} matched ${pattern}`);
      }
    }
    if (/from\s+["'][^"']*(?:docs\/|modules\/|app\.html|sw\.js)/.test(text)) {
      failures.push(`${path.relative(REPO_ROOT, filePath)} imports legacy runtime code`);
    }
  }
  assert.deepEqual(failures, []);
});

test("candidate build target stays outside deployment mirrors", () => {
  const config = fs.readFileSync(path.join(REPO_ROOT, "apps", "web", "vite.config.ts"), "utf8");
  assert.match(config, /output[\\/]lw-p2-001[\\/]web|LATTICEWORK_P2_OUT_DIR/);
  assert.doesNotMatch(config, /outDir\s*:\s*["'][^"']*docs/i);
  assert.match(config, /base\s*:\s*["']\.\/["']/);
});

test("protected legacy committed blobs byte-match the immutable baseline", {
  skip: BASELINE_ROOT
    ? false
    : "LATTICEWORK_BASELINE_ROOT is required for immutable baseline comparison",
}, () => {
  for (const relativePath of PROTECTED_PATHS) {
    assert.equal(fs.existsSync(path.join(REPO_ROOT, relativePath)), true, `${relativePath} is missing`);
    assert.equal(fs.existsSync(path.join(BASELINE_ROOT, relativePath)), true, `${relativePath} is missing from baseline`);
    assert.equal(
      gitBlobOid(REPO_ROOT, relativePath),
      gitBlobOid(BASELINE_ROOT, relativePath),
      `${relativePath} differs from immutable baseline`,
    );
  }
});
