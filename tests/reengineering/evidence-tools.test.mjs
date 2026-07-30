import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  countLines,
  isTextBuffer,
  sha256Buffer,
} from "../../tools/reengineering/evidence-common.mjs";
import { isFirstPartySource } from "../../tools/reengineering/capture-baseline.mjs";
import { manifestEvidenceDirectory } from "../../tools/reengineering/manifest-evidence-directory.mjs";
import { captureCommand } from "../../tools/reengineering/run-evidence-command.mjs";

const testRoot = path.resolve(process.env.LATTICEWORK_TEST_TMP ?? "runtime/tmp/evidence-tools-tests");

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
  assert.equal(manifest.artifacts[1].absolute_path, path.resolve(external));
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(outputPath, "utf8")));
});
