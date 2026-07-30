import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  countLines,
  isTextBuffer,
  sha256Buffer,
} from "../../tools/reengineering/evidence-common.mjs";
import { captureBaseline, isFirstPartySource } from "../../tools/reengineering/capture-baseline.mjs";
import { manifestEvidenceDirectory } from "../../tools/reengineering/manifest-evidence-directory.mjs";
import { captureCommand } from "../../tools/reengineering/run-evidence-command.mjs";

const testRoot = path.resolve(process.env.LATTICEWORK_TEST_TMP ?? "runtime/tmp/evidence-tools-tests");

function runGit(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("text and line helpers use the documented counting rule", () => {
  assert.equal(isTextBuffer(Buffer.from("a\nb\n")), true);
  assert.equal(isTextBuffer(Buffer.from([0, 1, 2])), false);
  assert.equal(countLines(Buffer.from("")), 0);
  assert.equal(countLines(Buffer.from("a\nb\n")), 2);
  assert.equal(countLines(Buffer.from("a\nb")), 2);
  assert.equal(
    sha256Buffer(Buffer.from("receipt")),
    "6f32860910ca0fb2a20c7fda143666b09dbf8db5238195c90a586fb542ff0cad",
  );
});

test("first-party source classification excludes tests, vendor, and generated buckets", () => {
  assert.equal(isFirstPartySource("docs/app.html"), true);
  assert.equal(isFirstPartySource("modules/chat.js"), true);
  assert.equal(isFirstPartySource("tests/smoke.js"), false);
  assert.equal(isFirstPartySource("lib/vendor.js"), false);
  assert.equal(isFirstPartySource("desktop/src-tauri/Cargo.lock"), false);
});

test("baseline archive reuse is SHA-safe", () => {
  const repo = path.join(testRoot, "baseline-repo");
  const output = path.join(testRoot, "baseline-output");
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(repo, { recursive: true });
  runGit(["init", "-q"], repo);
  runGit(["config", "user.name", "Fixture"], repo);
  runGit(["config", "user.email", "fixture@example.invalid"], repo);
  fs.writeFileSync(path.join(repo, "proof.txt"), "proof\n", "utf8");
  runGit(["add", "proof.txt"], repo);
  runGit(["commit", "-qm", "fixture"], repo);
  const sha = runGit(["rev-parse", "HEAD"], repo);

  const first = captureBaseline({ repo, outputDirectory: output, expectedSha: sha });
  const second = captureBaseline({ repo, outputDirectory: output, expectedSha: sha });
  assert.equal(JSON.parse(fs.readFileSync(path.join(output, "manifest.json"), "utf8")).archive_reused, true);
  fs.writeFileSync(first.archivePath, "wrong archive", "utf8");
  const third = captureBaseline({ repo, outputDirectory: output, expectedSha: sha });
  const manifest = JSON.parse(fs.readFileSync(path.join(output, "manifest.json"), "utf8"));

  assert.equal(second.archivePath, first.archivePath);
  assert.equal(third.archivePath, first.archivePath);
  assert.equal(manifest.archive_reused, false);
  assert.equal(sha256Buffer(fs.readFileSync(first.archivePath)), manifest.archive_sha256);
});

test("command receipt records exact command output, status, and hashes", () => {
  fs.mkdirSync(testRoot, { recursive: true });
  const output = path.join(testRoot, "command-receipt");
  fs.rmSync(output, { recursive: true, force: true });

  const { manifestPath, manifest } = captureCommand({
    cwd: process.cwd(),
    outputDirectory: output,
    receiptId: "test-command",
    command: [process.execPath, "-e", "process.stdout.write('proof'); process.stderr.write('note')"],
    baselineSha: "baseline",
    candidateSha: "candidate",
  });

  assert.equal(manifest.exit_code, 0);
  assert.equal(manifest.baseline_sha, "baseline");
  assert.equal(manifest.candidate_sha, "candidate");
  assert.equal(fs.readFileSync(path.join(output, "stdout.log"), "utf8"), "proof");
  assert.equal(fs.readFileSync(path.join(output, "stderr.log"), "utf8"), "note");
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  assert.equal(manifest.artifacts.length, 2);
});

test("command receipt preserves a nonzero command result for an explicit gate", () => {
  const output = path.join(testRoot, "nonzero-command-receipt");
  fs.rmSync(output, { recursive: true, force: true });

  const { manifest } = captureCommand({
    cwd: process.cwd(),
    outputDirectory: output,
    receiptId: "nonzero-command",
    command: [process.execPath, "-e", "process.stderr.write('expected failure'); process.exit(7)"],
  });

  assert.equal(manifest.exit_code, 7);
  assert.equal(fs.readFileSync(path.join(output, "stderr.log"), "utf8"), "expected failure");
});

test("command receipts record a bounded command timeout", () => {
  const output = path.join(testRoot, "timeout-command-receipt");
  fs.rmSync(output, { recursive: true, force: true });
  const { manifest } = captureCommand({
    cwd: process.cwd(),
    outputDirectory: output,
    receiptId: "timeout-command",
    timeoutMs: 1_000,
    command: [process.execPath, "-e", "process.stdout.write('proof')"],
  });

  assert.equal(manifest.timeout_ms, 1_000);
  assert.throws(
    () => captureCommand({ cwd: process.cwd(), outputDirectory: output, receiptId: "bad-timeout", timeoutMs: 0, command: [process.execPath, "--version"] }),
    /timeoutMs must be an integer/i,
  );
});

test("artifact bundle manifest hashes repository and external evidence", () => {
  const bundle = path.join(testRoot, "artifact-bundle");
  const external = path.join(testRoot, "external-receipt.bin");
  fs.rmSync(bundle, { recursive: true, force: true });
  fs.mkdirSync(path.join(bundle, "nested"), { recursive: true });
  fs.writeFileSync(path.join(bundle, "nested", "proof.txt"), "proof", "utf8");
  fs.writeFileSync(external, "external", "utf8");

  const outputPath = path.join(bundle, "manifest.json");
  const manifest = manifestEvidenceDirectory({
    directory: bundle,
    outputPath,
    receiptId: "bundle-test",
    baselineSha: "baseline",
    candidateSha: "candidate",
    externalPath: external,
  });

  assert.equal(manifest.artifacts.length, 2);
  assert.equal(manifest.artifacts[0].path, "nested/proof.txt");
  assert.equal(manifest.artifacts[0].repository_artifact, true);
  assert.equal(manifest.artifacts[1].repository_artifact, false);
  assert.equal(manifest.artifacts[1].path, "external-receipt.bin");
  assert.equal(manifest.artifacts[1].absolute_path, path.resolve(external));
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(outputPath, "utf8")));
});

test("artifact manifest rejects symbolic-link traversal", (t) => {
  const bundle = path.join(testRoot, "artifact-bundle-symlink");
  const target = path.join(testRoot, "artifact-bundle-symlink-target");
  fs.rmSync(bundle, { recursive: true, force: true });
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(bundle, { recursive: true });
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "proof.txt"), "proof", "utf8");
  try {
    fs.symlinkSync(target, path.join(bundle, "linked"), process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    t.skip(`symbolic-link fixture unavailable: ${error.code ?? error.message}`);
    return;
  }

  assert.throws(
    () => manifestEvidenceDirectory({
      directory: bundle,
      outputPath: path.join(bundle, "manifest.json"),
      receiptId: "bundle-test",
    }),
    /must not traverse symbolic links/i,
  );
});
