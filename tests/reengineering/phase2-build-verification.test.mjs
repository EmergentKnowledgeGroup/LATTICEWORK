import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  candidatePreviewPort,
  requireSafeRepositoryOutput,
} from "../../apps/web/vite.config.ts";
import { phase2PlaywrightOutputDirectory } from "../phase2/playwright.config.ts";
import { verifyPhase2Build } from "../../tools/reengineering/verify-phase2-build.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEST_ROOT = path.join(REPO_ROOT, "runtime", "tmp", "phase2-build-verifier-tests");

test.after(() => fs.rmSync(TEST_ROOT, { recursive: true, force: true }));

function resetDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(path.join(directory, ".vite"), { recursive: true });
  fs.mkdirSync(path.join(directory, "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(directory, "index.html"),
    '<!doctype html><script type="module" src="./assets/main-abc.js"></script>\n',
  );
  fs.writeFileSync(path.join(directory, "assets", "main-abc.js"), "export {};\n");
  fs.writeFileSync(
    path.join(directory, ".vite", "manifest.json"),
    '{"index.html":{"file":"assets/main-abc.js","isEntry":true}}\n',
  );
}

function fixture(name) {
  const root = path.join(TEST_ROOT, name);
  const first = path.join(root, "first");
  const second = path.join(root, "second");
  const output = path.join(root, "summary.json");
  resetDirectory(first);
  resetDirectory(second);
  return { root, first, second, output };
}

test("accepts two complete byte-identical candidate builds", () => {
  const { first, second, output } = fixture("identical");

  const result = verifyPhase2Build({
    workspaceRoot: REPO_ROOT,
    firstDirectory: first,
    secondDirectory: second,
    outputPath: output,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(
    result.first.files.map((entry) => entry.path),
    [".vite/manifest.json", "assets/main-abc.js", "index.html"],
  );
  assert.deepEqual(result.first.files, result.second.files);
  const script = result.first.files.find((entry) => entry.path.endsWith(".js"));
  assert.ok(script.gzip_bytes > 0);
  assert.ok(script.brotli_bytes > 0);
  assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).valid, true);
});

test("rejects a build whose bytes differ at the same declared path", () => {
  const { first, second, output } = fixture("mismatch");
  fs.writeFileSync(path.join(second, "assets", "main-abc.js"), "export const changed = true;\n");

  const result = verifyPhase2Build({
    workspaceRoot: REPO_ROOT,
    firstDirectory: first,
    secondDirectory: second,
    outputPath: output,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /artifact mismatch.*assets\/main-abc\.js/i);
});

test("rejects missing required Vite build artifacts", () => {
  const { first, second, output } = fixture("missing-manifest");
  fs.rmSync(path.join(second, ".vite", "manifest.json"));

  const result = verifyPhase2Build({
    workspaceRoot: REPO_ROOT,
    firstDirectory: first,
    secondDirectory: second,
    outputPath: output,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /missing required artifact.*\.vite\/manifest\.json/i);
});

test("refuses build and summary paths outside the repository", () => {
  const { first, second } = fixture("path-safety");

  assert.throws(
    () =>
      verifyPhase2Build({
        workspaceRoot: REPO_ROOT,
        firstDirectory: first,
        secondDirectory: second,
        outputPath: path.resolve(REPO_ROOT, "..", "escaped-phase2-summary.json"),
      }),
    /strict repository descendant/i,
  );
});

test("preview script delegates its port to the guarded Vite configuration", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "apps", "web", "package.json"), "utf8"),
  );

  assert.equal(
    packageJson.scripts.preview,
    "vite preview --host 127.0.0.1 --strictPort",
  );
  assert.doesNotMatch(packageJson.scripts.preview, /--port\b/);
});

test("candidate output rejects a repository-local reparse point", () => {
  const root = path.join(TEST_ROOT, "reparse-output");
  const target = path.join(root, "real-target");
  const link = path.join(root, "linked-output");
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");

  assert.throws(
    () => requireSafeRepositoryOutput(path.join(link, "candidate"), REPO_ROOT, "Candidate output"),
    /symbolic link or junction/i,
  );
});

test("Playwright output rejects a repository-local reparse point", () => {
  const root = path.join(TEST_ROOT, "playwright-reparse-output");
  const target = path.join(root, "real-target");
  const link = path.join(root, "linked-output");
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");

  assert.throws(
    () => phase2PlaywrightOutputDirectory(link),
    /symbolic link or junction/i,
  );
});

test("Playwright resolves its preview port through the Vite configuration", () => {
  const config = fs.readFileSync(
    path.join(REPO_ROOT, "tests", "phase2", "playwright.config.ts"),
    "utf8",
  );

  assert.match(config, /candidatePreviewPort\("production"\)/);
  assert.doesNotMatch(config, /Number\(process\.env\.LATTICEWORK_P2_PORT/);
});

test("Vite preview port resolver accepts configured values and defaults empty values", () => {
  const prior = process.env.LATTICEWORK_P2_PORT;
  try {
    process.env.LATTICEWORK_P2_PORT = "4175";
    assert.equal(candidatePreviewPort("production"), 4175);
    process.env.LATTICEWORK_P2_PORT = "";
    assert.equal(candidatePreviewPort("production"), 4174);
  } finally {
    if (prior === undefined) {
      delete process.env.LATTICEWORK_P2_PORT;
    } else {
      process.env.LATTICEWORK_P2_PORT = prior;
    }
  }
});

test("verification runner replays the lockfile and validates the final bundle", () => {
  const runner = fs.readFileSync(
    path.join(REPO_ROOT, "tools", "reengineering", "run-phase2-verification.ps1"),
    "utf8",
  );

  assert.doesNotMatch(runner, /[^\x00-\x7f]/);
  assert.match(runner, /LW-P2-001-lockfile-generate/);
  assert.match(runner, /npm install --package-lock-only --ignore-scripts/);
  assert.match(runner, /latticework\.phase2-lockfile-comparison\.v1/);
  assert.match(runner, /\$env:LATTICEWORK_BASELINE_ROOT = \$BaselineRoot/);
  assert.match(runner, /--test-reporter=tap/);
  assert.match(runner, /52 tests, 52 passed, 0 failed, and 0 skipped/);
  assert.match(runner, /validate-phase2-evidence\.mjs/);
});
