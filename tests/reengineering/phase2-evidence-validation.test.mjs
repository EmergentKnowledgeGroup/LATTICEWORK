import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase2Evidence } from "../../tools/reengineering/validate-phase2-evidence.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEST_ROOT = path.join(REPO_ROOT, "runtime", "tmp", "phase2-evidence-validation-tests");
const BASELINE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CANDIDATE = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const COMMANDS = ["environment", "lockfile-generate", "install", "typecheck", "unit", "controls", "build-1", "build-2", "build-comparison", "browser-install", "browser", "audit", "sbom", "supply-chain", "boundary", "control-validator"];

function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function hash(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function write(file, value = "fixture\n") { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); }

function createBundle(name) {
  const root = path.join(TEST_ROOT, name);
  fs.rmSync(root, { recursive: true, force: true });
  const bundle = path.join(root, "evidence");
  for (const command of COMMANDS) writeJson(path.join(bundle, "commands", command, "manifest.json"), { schema: "latticework.evidence.command.v1", exit_code: 0, baseline_sha: BASELINE, candidate_sha: CANDIDATE });
  writeJson(path.join(bundle, "summary.json"), {
    schema: "latticework.phase2-summary.v1",
    valid: true,
    work_id: "LW-P2-001",
    baseline_sha: BASELINE,
    candidate_sha: CANDIDATE,
    lockfile_reproducible: true,
    browser: { expected: 6, unexpected: 0, skipped: 0, flaky: 0 },
    repository_controls: { tests: 52, passed: 52, failed: 0, skipped: 0 },
  });
  const file = { path: "assets/index.js", bytes: 12, gzip_bytes: 8, brotli_bytes: 7 };
  writeJson(path.join(bundle, "build-comparison.json"), { schema: "latticework.phase2-build-comparison.v1", valid: true, first: { files: [file] }, second: { files: [file] } });
  const protectedFiles = ["app.html", "index.html", "docs/app.html", "docs/sw.js", "sw.js", "server.js", "server.py", "tests/smoke.js"].map((item) => ({ path: item }));
  writeJson(path.join(bundle, "boundary.json"), { schema: "latticework.phase2-boundary.v1", valid: true, protected_files: protectedFiles });
  writeJson(path.join(bundle, "supply-chain.json"), { schema: "latticework.phase2-supply-chain.v1", valid: true });
  writeJson(path.join(bundle, "npm-audit.json"), { metadata: { vulnerabilities: { total: 0 } } });
  writeJson(path.join(bundle, "sbom.cdx.json"), { bomFormat: "CycloneDX" });
  write(path.join(bundle, "package-lock.snapshot.json"), "same lockfile\n");
  write(path.join(bundle, "package-lock.replayed.json"), "same lockfile\n");
  const lockfileHash = hash(path.join(bundle, "package-lock.snapshot.json"));
  writeJson(path.join(bundle, "lockfile-comparison.json"), { schema: "latticework.phase2-lockfile-comparison.v1", valid: true, canonical_sha256: lockfileHash, replayed_sha256: lockfileHash });
  writeJson(path.join(bundle, "browser", "results.json"), { suites: [] });
  writeJson(path.join(bundle, "browser", "candidate-browser-boundary.json"), {
    browserBoundary: {
      blockedCapabilities: [],
      blockedOutOfOriginRequests: [],
      consoleErrors: [],
      openedWebSockets: [],
      outOfOriginRequests: [],
      pageErrors: [],
      sameOriginRequests: ["/", "/assets/index.js", "/assets/index.css"],
    },
    runtimeState: {
      cacheNames: [],
      indexedDatabases: [],
      localStorageEntries: 0,
      sessionStorageEntries: 0,
      serviceWorkers: [],
    },
  });
  writeJson(path.join(bundle, "browser", "candidate-performance.json"), {
    domContentLoaded: 100,
    load: 150,
    longTaskCount: 0,
    transferSize: 500,
  });
  for (const name of ["candidate-desktop.png", "candidate-desktop-aria.yml", "candidate-mobile-390x844.png", "candidate-mobile-390x844-aria.yml", "candidate-forced-colors.png", "candidate-forced-colors-aria.yml"]) write(path.join(bundle, "browser", name));
  refreshManifest(bundle);
  return { root, bundle };
}

function refreshManifest(bundle) {
  const artifacts = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (entry.isFile() && entry.name !== "manifest.json") artifacts.push({ path: path.relative(bundle, target).replaceAll("\\", "/"), bytes: fs.statSync(target).size, sha256: hash(target) });
    }
  }
  walk(bundle);
  writeJson(path.join(bundle, "manifest.json"), { schema: "latticework.evidence.artifact-bundle.v1", receipt_id: "LW-P2-001", baseline_sha: BASELINE, candidate_sha: CANDIDATE, artifacts });
}

function validate(bundle) { return validatePhase2Evidence({ directory: bundle, workspaceRoot: REPO_ROOT, baselineSha: BASELINE, candidateSha: CANDIDATE }); }

test("accepts a complete, repository-descendant Phase 2 fixture bundle", () => {
  const { bundle } = createBundle("valid");
  const result = validate(bundle);
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.checks.command_receipts, 16);
  assert.equal(result.checks.protected_paths, 8);
});

test("rejects manifest traversal and tampered artifact hashes", () => {
  const { bundle } = createBundle("manifest-tamper");
  const manifestPath = path.join(bundle, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.artifacts[0].path = "../outside.txt";
  writeJson(manifestPath, manifest);
  let result = validate(bundle);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /escapes bundle/i);
  createBundle("hash-tamper");
  const second = path.join(TEST_ROOT, "hash-tamper", "evidence");
  write(path.join(second, "browser", "results.json"), "tampered\n");
  result = validate(second);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /SHA-256 mismatch/i);
});

test("rejects gate failures, wrong receipts, missing visual evidence, and secret sentinels", () => {
  const { bundle } = createBundle("gate-failures");
  const summaryPath = path.join(bundle, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.browser.flaky = 1;
  summary.repository_controls.skipped = 1;
  writeJson(summaryPath, summary);
  writeJson(path.join(bundle, "commands", "audit", "manifest.json"), { schema: "latticework.evidence.command.v1", exit_code: 1, baseline_sha: BASELINE, candidate_sha: CANDIDATE });
  fs.rmSync(path.join(bundle, "browser", "candidate-forced-colors.png"));
  writeJson(path.join(bundle, "browser", "results.json"), { note: "PRIVATE_SENTINEL" });
  refreshManifest(bundle);
  const result = validate(bundle);
  assert.equal(result.valid, false);
  const report = result.failures.join("\n");
  assert.match(report, /browser stats/i);
  assert.match(report, /repository control stats/i);
  assert.match(report, /did not exit 0/i);
  assert.match(report, /missing browser artifact/i);
  assert.match(report, /sentinel or secret/i);
});

test("rejects malformed audit receipts and scans NUL-containing text while excluding PNG artifacts", () => {
  const { bundle } = createBundle("nul-secret-and-audit");
  writeJson(path.join(bundle, "npm-audit.json"), { metadata: { vulnerabilities: { total: "0" } } });
  write(path.join(bundle, "notes.txt"), "sk-\0abcdefghijklmnopqrstuvwxyz");
  write(path.join(bundle, "browser", "candidate-desktop.png"), Buffer.concat([
    Buffer.from("sk-\0abcdefghijklmnopqrstuvwxyz"),
    Buffer.from([0]),
  ]));
  refreshManifest(bundle);

  const result = validate(bundle);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /npm audit vulnerability total must be an integer 0/);
  assert.match(result.failures.join("\n"), /sentinel or secret/i);
});

test("refuses evidence and output paths outside the repository", () => {
  const { bundle } = createBundle("path-safety");
  assert.throws(() => validatePhase2Evidence({ directory: path.resolve(REPO_ROOT, ".."), workspaceRoot: REPO_ROOT, baselineSha: BASELINE, candidateSha: CANDIDATE }), /strict repository descendant/i);
  assert.throws(() => validatePhase2Evidence({ directory: bundle, workspaceRoot: REPO_ROOT, baselineSha: BASELINE, candidateSha: CANDIDATE, outputPath: path.resolve(REPO_ROOT, "..", "escaped.json") }), /strict repository descendant/i);
});

test("fails closed when browser evidence is behind a symbolic link", (t) => {
  const { bundle } = createBundle("browser-symlink");
  const browser = path.join(bundle, "browser");
  const target = path.join(path.dirname(bundle), "real-browser");
  fs.renameSync(browser, target);
  try {
    fs.symlinkSync(target, browser, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    t.skip(`symbolic-link fixture unavailable: ${error.code ?? error.message}`);
    return;
  }

  const result = validate(bundle);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /symbolic link or junction/i);
});
