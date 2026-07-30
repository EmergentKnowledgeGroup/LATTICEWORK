import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const BASELINE_ROOT = "Z:\\LATTICEWORK_BASELINE_e7585999";

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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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
  const root = readJson("package.json");
  const web = readJson("apps/web/package.json");
  const contracts = readJson("packages/contracts/package.json");
  const kernel = readJson("packages/kernel/package.json");
  const browser = readJson("tests/phase2/package.json");

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

test("protected legacy files byte-match the immutable baseline", () => {
  for (const relativePath of PROTECTED_PATHS) {
    const candidate = path.join(REPO_ROOT, relativePath);
    const baseline = path.join(BASELINE_ROOT, relativePath);
    assert.equal(
      sha256(candidate),
      sha256(baseline),
      `${relativePath} differs from immutable baseline`,
    );
  }
});
