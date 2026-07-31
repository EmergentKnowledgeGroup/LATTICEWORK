import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  phase5DeterministicPackageCommand,
  validatePhase5LatticeMemoryImplementationEvidence,
} from "../../tools/reengineering/validate-phase5-lattice-memory-implementation-evidence.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEST_ROOT = path.join(REPO_ROOT, "runtime", "tmp", "phase5-evidence-integrity-tests");
const CANDIDATE = "1".repeat(40);
const BASELINE = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const IMPLEMENTATION_BASE = "ac45408307e91ee8d850c24753ce6b4d6e903f12";
const GATES = ["environment", "install", "scope", "typecheck", "unit", "browser", "phase3_boundary", "phase4_verification", "repository_controls", "deterministic_build", "audit", "sbom", "hygiene"];
const cmd = (text) => ["cmd.exe", "/d", "/s", "/c", text];
const COMMANDS = {
  environment: cmd("node --version && npm --version && npx playwright --version && git --version"),
  install: cmd("npm ci --ignore-scripts"),
  scope: cmd("node tools/reengineering/validate-phase5-active-scope.mjs && node tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs"),
  typecheck: cmd("npm run p5:typecheck"), unit: cmd("npm run p5:test"), browser: cmd("npm run p5:browser"),
  phase3_boundary: cmd("npm run p3:boundary"),
  phase4_verification: cmd("node tools/reengineering/validate-phase4-active-scope.mjs && node tools/reengineering/validate-phase4-amendment.mjs && node tools/reengineering/validate-phase4-implementation-scope.mjs && npm run p4:typecheck && npm run p4:test && npm run p4:browser"),
  repository_controls: cmd("node --test --test-reporter=tap tests/reengineering/*.test.mjs"),
  audit: cmd("npm audit --workspaces --include-workspace-root --json"), sbom: cmd("npm sbom --sbom-format cyclonedx"),
  hygiene: cmd(`git diff --check ${IMPLEMENTATION_BASE} -- && node --check tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs && node --check tools/reengineering/validate-phase5-lattice-memory-implementation-evidence.mjs`),
};

function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function hash(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function refreshManifest(root) {
  const artifacts = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && path.relative(root, absolute).replaceAll("\\", "/") !== "manifest.json") artifacts.push({ path: path.relative(root, absolute).replaceAll("\\", "/"), bytes: fs.statSync(absolute).size, sha256: hash(absolute), repository_artifact: true });
    }
  };
  visit(root);
  writeJson(path.join(root, "manifest.json"), { schema: "latticework.evidence.artifact-bundle.v1", receipt_id: "LW-P5-MEM-001-bundle", baseline_sha: BASELINE, candidate_sha: CANDIDATE, directory: root, artifacts: artifacts.sort((a, b) => a.path.localeCompare(b.path)) });
}
function deterministicCommand() {
  return phase5DeterministicPackageCommand(REPO_ROOT, 5195);
}
function fixture(name) {
  const root = path.join(TEST_ROOT, name);
  fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(root, { recursive: true });
  const gatePaths = Object.fromEntries(GATES.map((gate) => [gate, `commands/${gate.replaceAll("_", "-")}/manifest.json`]));
  for (const gate of GATES) writeJson(path.join(root, gatePaths[gate]), { schema: "latticework.evidence.command.v1", receipt_id: `LW-P5-MEM-001-${gate.replaceAll("_", "-")}`, baseline_sha: BASELINE, candidate_sha: CANDIDATE, cwd: REPO_ROOT, exit_code: 0, signal: null, spawn_error: null, command: gate === "deterministic_build" ? deterministicCommand() : COMMANDS[gate], repository: { head: CANDIDATE }, artifacts: [] });
  writeJson(path.join(root, "browser", "results.json"), { stats: { expected: 4, unexpected: 0, flaky: 0, skipped: 0 } });
  for (let index = 0; index < 8; index += 1) writeJson(path.join(root, "browser", "attachments", `receipt-${index}.json`), { schema: "latticework.phase5.browser-receipt.v1", content_free: true });
  writeJson(path.join(root, "independent-review", "review.json"), { schema: "latticework.phase5-independent-review.v1", verdict: "GREEN", candidate_sha: CANDIDATE, findings: [] });
  writeJson(path.join(root, "summary.json"), { schema: "latticework.phase5-lattice-memory-implementation-summary.v1", evidence_label: "MEASURED", work_id: "LW-P5-MEM-001", valid: true, status: "GREEN", implementation_base_commit: IMPLEMENTATION_BASE, candidate_sha: CANDIDATE, safety: { real_user_data: "not-accessed", real_provider_traffic: "none", real_credentials: "none", application_listener: "none", test_listener: "exact-loopback-run-owned", candidate_activation: "none", deployment: "none", cutover: "none" }, repository_controls: { tests: 300, pass: 300, fail: 0, skipped: 0, todo: 0 }, browser: { expected: 4, unexpected: 0, flaky: 0, skipped: 0, content_free_receipts: 8 }, gates: gatePaths, independent_review: { verdict: "GREEN", candidate_sha: CANDIDATE, receipt: "independent-review/review.json" } });
  refreshManifest(root); return root;
}
async function validate(root) { return validatePhase5LatticeMemoryImplementationEvidence({ evidenceDirectory: root, candidateSha: CANDIDATE }); }
test.after(() => fs.rmSync(TEST_ROOT, { recursive: true, force: true }));

test("accepts a complete canonical hash-bound Phase 5 bundle", async () => { const result = await validate(fixture("complete")); assert.equal(result.valid, true, result.failures.join("\n")); });
test("rejects tampered artifact bytes", async () => { const root = fixture("tamper"); const file = path.join(root, "summary.json"); fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("\"GREEN\"", "\"GREEO\"")); const result = await validate(root); assert.equal(result.valid, false); assert.match(result.failures.join("\n"), /sha256 mismatch/i); });
test("rejects manifest omissions and additions", async () => { const root = fixture("inventory"); const file = path.join(root, "manifest.json"); const data = JSON.parse(fs.readFileSync(file)); data.artifacts = data.artifacts.filter((artifact) => artifact.path !== "summary.json"); writeJson(file, data); fs.writeFileSync(path.join(root, "extra.log"), "extra\n"); const result = await validate(root); assert.equal(result.valid, false); assert.match(result.failures.join("\n"), /omitted from manifest/i); });
test("rejects forged gate commands after rehashing", async () => { const root = fixture("forged-command"); const file = path.join(root, "commands", "unit", "manifest.json"); const data = JSON.parse(fs.readFileSync(file)); data.command[4] = "npm run unrelated"; writeJson(file, data); refreshManifest(root); const result = await validate(root); assert.equal(result.valid, false); assert.match(result.failures.join("\n"), /unit.*command/i); });
test("rejects empty or nonabsolute gate cwd", async () => { const root = fixture("cwd"); const file = path.join(root, "commands", "unit", "manifest.json"); const data = JSON.parse(fs.readFileSync(file)); data.cwd = ""; writeJson(file, data); refreshManifest(root); const result = await validate(root); assert.equal(result.valid, false); assert.match(result.failures.join("\n"), /unit.*identity/i); });
test("rejects repository_artifact false", async () => { const root = fixture("repository-artifact"); const file = path.join(root, "manifest.json"); const data = JSON.parse(fs.readFileSync(file)); data.artifacts[0].repository_artifact = false; writeJson(file, data); const result = await validate(root); assert.equal(result.valid, false); assert.match(result.failures.join("\n"), /repository_artifact/i); });
test("rejects independent review without its required schema", async () => { const root = fixture("review-schema"); const file = path.join(root, "independent-review", "review.json"); const data = JSON.parse(fs.readFileSync(file)); delete data.schema; writeJson(file, data); refreshManifest(root); const result = await validate(root); assert.equal(result.valid, false); assert.match(result.failures.join("\n"), /independent review receipt/i); });
test("rejects content-bearing browser receipt fields", async () => { const root = fixture("browser-content"); const file = path.join(root, "browser", "attachments", "receipt-0.json"); const data = JSON.parse(fs.readFileSync(file)); data.summary = "forbidden"; writeJson(file, data); refreshManifest(root); const result = await validate(root); assert.equal(result.valid, false); assert.match(result.failures.join("\n"), /forbidden field summary/i); });
test("rejects a symlink or reparse point when platform permits", async (t) => { const root = fixture("symlink"); try { fs.symlinkSync(path.join(root, "summary.json"), path.join(root, "linked.json"), "file"); } catch { t.skip("symlink creation unavailable"); return; } const result = await validate(root); assert.equal(result.valid, false); assert.match(result.failures.join("\n"), /symlink or reparse/i); });
