import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase4Characterization } from "../../tools/reengineering/validate-phase4-characterization.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEST_ROOT = path.join(REPO_ROOT, "runtime", "tmp", "phase4-characterization-validation-tests");
const BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const BASE_COMMIT = "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd";
const CANDIDATE_SHA = "a".repeat(40);
const GATES = [
  "phase-closed-scope", "immutable-baseline", "fixture-schema",
  "onboarding-provider-setup", "chat-send-stream-cancel-retry-error",
  "conversation-persistence-reload-recovery", "signal-report-privacy-clipboard",
  "responsive-accessibility", "offline-denied-egress", "content-free-scan",
  "repository-controls", "evidence-manifest", "independent-clean-worktree", "hygiene",
];
const SUBCASES = [
  ["P4-ONB-001A", "P4-ONB-001"], ["P4-ONB-001B", "P4-ONB-001"], ["P4-ONB-001C", "P4-ONB-001"],
  ["P4-CHAT-001A", "P4-CHAT-001"], ["P4-CHAT-002A", "P4-CHAT-002"],
  ["P4-CHAT-003A", "P4-CHAT-003"], ["P4-CHAT-003B", "P4-CHAT-003"],
  ["P4-CHAT-004A", "P4-CHAT-004"], ["P4-CHAT-005A", "P4-CHAT-005"],
  ["P4-CHAT-005B", "P4-CHAT-005"], ["P4-CHAT-005C", "P4-CHAT-005"],
  ["P4-CHAT-006A", "P4-CHAT-006"], ["P4-CHAT-006B", "P4-CHAT-006"],
  ["P4-CHAT-007A", "P4-CHAT-007"], ["P4-CHAT-007B", "P4-CHAT-007"],
  ["P4-CHAT-008A", "P4-CHAT-008"], ["P4-CHAT-008B", "P4-CHAT-008"],
  ["P4-CHAT-009A", "P4-CHAT-009"], ["P4-CHAT-009B", "P4-CHAT-009"],
  ["P4-CHAT-009C", "P4-CHAT-009"], ["P4-CHAT-009D", "P4-CHAT-009"], ["P4-CHAT-009E", "P4-CHAT-009"],
  ["P4-CHAT-010A", "P4-CHAT-010"], ["P4-CHAT-010B", "P4-CHAT-010"],
  ["P4-SIG-001A", "P4-SIG-001"], ["P4-SIG-001B", "P4-SIG-001"], ["P4-SIG-001C", "P4-SIG-001"],
  ["P4-RESP-001A", "P4-RESP-001"], ["P4-A11Y-001A", "P4-A11Y-001"],
  ["P4-A11Y-001B", "P4-A11Y-001"], ["P4-A11Y-001C", "P4-A11Y-001"],
  ["P4-DEG-001A", "P4-DEG-001"], ["P4-EGR-001A", "P4-EGR-001"],
  ["P4-EGR-001B", "P4-EGR-001"], ["P4-EGR-001C", "P4-EGR-001"],
  ["P4-EGR-001D", "P4-EGR-001"], ["P4-EGR-001E", "P4-EGR-001"],
  ["P4-EGR-001F", "P4-EGR-001"], ["P4-EGR-001G", "P4-EGR-001"],
];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function inventory(root) {
  const artifacts = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      if (entry.isFile()) {
        const relative = path.relative(root, absolute).replaceAll("\\", "/");
        if (relative !== "manifest.json") artifacts.push({ path: relative, bytes: fs.statSync(absolute).size, sha256: sha256(absolute) });
      }
    }
  };
  visit(root);
  return artifacts.sort((a, b) => a.path.localeCompare(b.path));
}

function createFixture(name) {
  const root = path.join(TEST_ROOT, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  const runRoot = path.join(TEST_ROOT, `${name}-run`);
  fs.rmSync(runRoot, { recursive: true, force: true });
  const gates = {};
  for (const gate of GATES) {
    const receipt = `commands/${gate}/receipt.json`;
    gates[gate] = { status: "PASS", receipt };
    writeJson(path.join(root, receipt), { schema: "latticework.evidence.command.v1", exit_code: 0, baseline_sha: BASELINE_SHA, base_commit: BASE_COMMIT, candidate_sha: CANDIDATE_SHA, command: ["synthetic", gate] });
  }
  const results = SUBCASES.map(([id, group]) => ({
    id, group, status: "PASS",
    profile: { id: `P4-PROFILE-${id}`, path: path.join(runRoot, "profiles", id), synthetic: true, empty_at_creation: true, ownership_marker: "phase4-run-marker-v1", created_for_subcase: id, cleanup: { proven: true, deleted: true, no_reparse: true } },
    network: {
      denied_egress: true, unexpected_transmissions: 0,
      expected_fixture_requests: id === "P4-CHAT-001A" ? [{ target: "http://localhost:11434/v1/chat/completions", observed: true, transmitted: false }]
        : id === "P4-CHAT-002A" ? [{ target: "https://api.openai.com/v1/chat/completions", observed: true, transmitted: false }]
          : [],
      expected_abort: id.startsWith("P4-EGR-001"), wire_transmissions: 0,
    },
    operation: { post_delta_retry: false, duplicate_terminal: false },
  }));
  writeJson(path.join(root, "independent-review.json"), {
    schema: "latticework.phase4-independent-review.v1", verdict: "GREEN", reviewer: "independent clean-worktree reviewer",
    baseline_sha: BASELINE_SHA, base_commit: BASE_COMMIT, candidate_sha: CANDIDATE_SHA,
    worktree: { root: path.resolve(REPO_ROOT, "..", "LATTICEWORK_P4_QA_a"), clean_start: true, clean_end: true },
  });
  writeJson(path.join(root, "summary.json"), {
    schema: "latticework.phase4-characterization-summary.v1", work_id: "LW-P4-CHAR-001", status: "GREEN",
    baseline_sha: BASELINE_SHA, base_commit: BASE_COMMIT, candidate_sha: CANDIDATE_SHA,
    machine_lock: { schema: "latticework.phase4-characterization-preflight.v1", base_commit: BASE_COMMIT, phase3_terminal_commit: BASE_COMMIT, baseline_sha: BASELINE_SHA, work_id: "LW-P4-CHAR-001", implementation_work_id: "LW-P4-001", implementation_packet_id: "LW-P4-IMPL-PREFLIGHT-001", implementation_authorized: false, real_data_authorized: false, real_credentials_authorized: false, real_provider_traffic_authorized: false, provider_fixtures: ["P4-PRV-OLLAMA", "P4-PRV-OPENAI"], caller_paths: ["primary-chat"], playwright_workers: 1, playwright_retries: 0, mandatory_scenario_groups: 16, mandatory_atomic_subcases: 39, green_requires_all_pass: true, evidence_root: "reengineering/evidence/phase-4/LW-P4-CHAR-001" },
    results, gates,
    content_scan: { scanned: true, findings: 0 },
    run: { staging_root: runRoot, ownership_marker: "phase4-run-marker-v1", cleanup: { proven: true, deleted: true, no_reparse: true }, static_server: { bind: "127.0.0.1", started: true, stopped: true, startup_receipt: "commands/immutable-baseline/receipt.json", cleanup_receipt: "commands/hygiene/receipt.json" } },
    independent_review: { receipt: "independent-review.json", required: true },
  });
  writeJson(path.join(root, "manifest.json"), { schema: "latticework.evidence.artifact-bundle.v1", receipt_id: "LW-P4-CHAR-001-bundle", baseline_sha: BASELINE_SHA, base_commit: BASE_COMMIT, candidate_sha: CANDIDATE_SHA, artifacts: inventory(root) });
  return root;
}

function validate(root) {
  return validatePhase4Characterization({ workspaceRoot: REPO_ROOT, evidenceDirectory: root });
}

test.after(() => fs.rmSync(TEST_ROOT, { recursive: true, force: true }));

test("accepts a complete, locked, content-free Phase 4 characterization bundle", () => {
  const result = validate(createFixture("complete"));
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.atomicPasses, 39);
  assert.equal(result.groups, 16);
  assert.equal(result.gates, 14);
});

test("rejects lock drift, non-PASS state, duplicate profiles, and missing expected provider request", () => {
  const root = createFixture("atomic-invariants");
  const summaryPath = path.join(root, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.machine_lock.playwright_workers = 2;
  summary.results[0].status = "UNKNOWN";
  summary.results[1].profile.id = summary.results[0].profile.id;
  summary.results.find((result) => result.id === "P4-CHAT-001A").network.expected_fixture_requests = [];
  writeJson(summaryPath, summary);
  const result = validate(root);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /machine lock|must be PASS|fresh unique profile|expected fixture request/i);
});

test("rejects unsafe profiles, egress, retries, duplicate terminals, and skipped work", () => {
  const root = createFixture("unsafe-receipts");
  const summaryPath = path.join(root, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.results[0].profile.path = "..\\outside";
  summary.results[0].profile.synthetic = false;
  summary.results[0].profile.empty_at_creation = false;
  summary.results[0].network.unexpected_transmissions = 1;
  summary.results[0].operation.post_delta_retry = true;
  summary.results[0].operation.duplicate_terminal = true;
  summary.gates.hygiene.status = "SKIP";
  writeJson(summaryPath, summary);
  const result = validate(root);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /profile|egress|post-delta retry|duplicate terminal|gate/i);
});

test("rejects leaked content, incomplete manifests, tampering, and a non-independent review", () => {
  const root = createFixture("bundle-integrity");
  fs.writeFileSync(path.join(root, "leak.log"), "PRIVATE_SENTINEL_SHOULD_NOT_APPEAR", "utf8");
  const summaryPath = path.join(root, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.independent_review.required = false;
  writeJson(summaryPath, summary);
  const result = validate(root);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /content|not receipted|independent/i);
});

test("rejects reparse traversal where the recorded profile path still exists", { skip: process.platform !== "win32" }, () => {
  const root = createFixture("reparse");
  const summaryPath = path.join(root, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const target = path.join(TEST_ROOT, "reparse-target");
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(summary.run.staging_root, { recursive: true });
  const link = path.join(summary.run.staging_root, "profiles");
  fs.rmSync(link, { recursive: true, force: true });
  fs.symlinkSync(target, link, "junction");
  summary.results[0].profile.path = path.join(link, "profile");
  writeJson(summaryPath, summary);
  const result = validate(root);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /reparse|symbolic link/i);
});

test("rejects cleanup receipts while recorded profile or run paths still exist", () => {
  const root = createFixture("cleanup-paths-exist");
  const summaryPath = path.join(root, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  fs.mkdirSync(summary.run.staging_root, { recursive: true });
  fs.mkdirSync(summary.results[0].profile.path, { recursive: true });
  const result = validate(root);
  assert.equal(result.valid, false);
  assert.match(
    result.failures.join("\n"),
    /profile cleanup claims deletion|run cleanup claims deletion/i,
  );
});

test("CLI rejects a traversal evidence root", () => {
  const result = validatePhase4Characterization({ workspaceRoot: REPO_ROOT, evidenceDirectory: path.resolve(REPO_ROOT, "..") });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /strict repository descendant/i);
});

test("runner propagates observed operations and proves cleanup before summary", () => {
  const source = fs.readFileSync(
    path.join(
      REPO_ROOT,
      "tools",
      "reengineering",
      "run-phase4-characterization.ps1",
    ),
    "utf8",
  );
  assert.match(source, /\[string\]\$IndependentReviewPath/u);
  assert.match(
    source,
    /post_delta_retry = \$rawResult\.operation\.post_delta_retry/u,
  );
  assert.match(
    source,
    /duplicate_terminal = \$rawResult\.operation\.duplicate_terminal/u,
  );
  assert.doesNotMatch(source, /post_delta_retry = \$null/u);
  const deleteRun = source.indexOf(
    "[System.IO.Directory]::Delete($RunRoot, $true)",
  );
  const writeSummary = source.indexOf(
    'Write-Json -Path (Join-Path $EvidenceRoot "summary.json")',
  );
  assert.ok(deleteRun >= 0 && writeSummary > deleteRun);
});

test("browser probe counts terminal assistant outcomes, not progress notices", () => {
  const source = fs.readFileSync(
    path.join(
      REPO_ROOT,
      "tests",
      "characterization",
      "specs",
      "phase4-chat.spec.mjs",
    ),
    "utf8",
  );
  assert.match(
    source,
    /#chatMessages \.chat-message\.assistant/u,
  );
  assert.match(
    source,
    /result\.terminal_count = Math\.max\(\s*0,\s*assistantMessagesAfter - assistantMessagesBefore/u,
  );
  assert.doesNotMatch(
    source,
    /result\.message_count_after - messagesBefore - 1/u,
  );
});
