import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase3Evidence } from "../../tools/reengineering/validate-phase3-evidence.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEST_ROOT = path.join(
  REPO_ROOT,
  "runtime",
  "tmp",
  "phase3-evidence-validation-tests",
);
const BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const IMPLEMENTATION_BASE = "93a36626f786a880210c53b8486c961e8b86e9ea";
const CANDIDATE_SHA = "a".repeat(40);
const GATES = [
  "strict-typecheck",
  "node-unit",
  "browser-indexeddb",
  "provider-no-egress",
  "protected-boundary",
  "deterministic-build",
  "lockfile-replay",
  "supply-chain",
  "full-repository-controls",
  "evidence-manifest",
  "independent-clean-worktree",
  "diff-and-json-hygiene",
];
const INDEPENDENT_GATES = [
  "strict-typecheck",
  "node-unit",
  "browser-indexeddb",
  "provider-no-egress",
  "protected-boundary",
  "deterministic-build",
  "lockfile-replay",
  "supply-chain",
  "full-repository-controls",
  "diff-and-json-hygiene",
];
const REVIEW_WORKTREE = path.resolve(
  REPO_ROOT,
  "..",
  `LATTICEWORK_P3_QA_${CANDIDATE_SHA.slice(0, 8)}`,
);
const INDEPENDENT_COMMANDS = {
  "strict-typecheck": ["cmd.exe", "/d", "/s", "/c", "npm run p3:typecheck"],
  "node-unit": ["cmd.exe", "/d", "/s", "/c", "npm run p3:test"],
  "browser-indexeddb": ["cmd.exe", "/d", "/s", "/c", "npm run p3:browser"],
  "provider-no-egress": [
    "node.exe",
    "--test",
    "tests/reengineering/phase3-provider-boundary.test.mjs",
  ],
  "protected-boundary": [
    "node.exe",
    "tools/reengineering/verify-phase3-boundary.mjs",
  ],
  "deterministic-build": [
    "node.exe",
    "tools/reengineering/verify-phase2-build.mjs",
  ],
  "lockfile-replay": [
    "cmd.exe",
    "/d",
    "/s",
    "/c",
    "npm install --package-lock-only --ignore-scripts",
  ],
  "supply-chain": [
    "node.exe",
    "tools/reengineering/collect-phase2-supply-chain.mjs",
  ],
  "full-repository-controls": [
    "node.exe",
    "--test",
    "--test-reporter=tap",
    "tests/reengineering/*.test.mjs",
  ],
  "diff-and-json-hygiene": [
    "cmd.exe",
    "/d",
    "/s",
    "/c",
    "git diff --check && node tools/reengineering/validate-phase3-preflight.mjs",
  ],
};

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeIndependentReceipt(
  root,
  relativePath,
  command,
  cwd = REVIEW_WORKTREE,
) {
  writeJson(path.join(root, relativePath), {
    schema: "latticework.evidence.command.v1",
    receipt_id: `LW-P3-001-independent-${path.basename(path.dirname(relativePath))}`,
    baseline_sha: BASELINE_SHA,
    candidate_sha: CANDIDATE_SHA,
    cwd,
    exit_code: 0,
    command,
    repository: {
      head: CANDIDATE_SHA,
      status: "## HEAD (no branch)",
    },
    artifacts: [],
  });
}

function addIndependentReview(root) {
  const reviewRoot = path.join(root, "independent-review");
  const startReceipt = "commands/worktree-start/manifest.json";
  const installReceipt = "commands/install/manifest.json";
  const endReceipt = "commands/worktree-end/manifest.json";
  writeIndependentReceipt(reviewRoot, startReceipt, [
    "git",
    "status",
    "--porcelain",
  ]);
  fs.writeFileSync(
    path.join(reviewRoot, "commands", "worktree-start", "stdout.log"),
    "",
    "utf8",
  );
  writeIndependentReceipt(reviewRoot, installReceipt, [
    "cmd.exe",
    "/d",
    "/s",
    "/c",
    "npm ci --ignore-scripts",
  ]);
  writeIndependentReceipt(reviewRoot, endReceipt, [
    "git",
    "status",
    "--porcelain",
  ]);
  fs.writeFileSync(
    path.join(reviewRoot, "commands", "worktree-end", "stdout.log"),
    "",
    "utf8",
  );
  const gates = {};
  for (const gate of INDEPENDENT_GATES) {
    const receipt = `commands/${gate}/manifest.json`;
    gates[gate] = { valid: true, receipt };
    const cwd = gate === "lockfile-replay"
      ? path.join(
        REVIEW_WORKTREE,
        "runtime",
        "tmp",
        "phase3-verification-4196",
        "lockfile-replay",
      )
      : REVIEW_WORKTREE;
    writeIndependentReceipt(
      reviewRoot,
      receipt,
      INDEPENDENT_COMMANDS[gate],
      cwd,
    );
  }
  writeJson(path.join(reviewRoot, "automation.json"), {
    schema: "latticework.phase3-independent-review.v1",
    work_id: "LW-P3-001",
    evidence_label: "MEASURED",
    valid: true,
    verdict: "AUTOMATED_GATES_GREEN",
    baseline_sha: BASELINE_SHA,
    implementation_base_commit: IMPLEMENTATION_BASE,
    candidate_sha: CANDIDATE_SHA,
    worktree: {
      root: REVIEW_WORKTREE,
      clean_start: true,
      clean_end: true,
      start_receipt: startReceipt,
      install_receipt: installReceipt,
      end_receipt: endReceipt,
    },
    gates,
    repository_controls: {
      tests: 103,
      pass: 103,
      fail: 0,
      skipped: 0,
      todo: 0,
    },
  });
  fs.writeFileSync(
    path.join(reviewRoot, "REVIEW.md"),
    [
      "# Independent Phase 3 review",
      "",
      "**Verdict:** GREEN",
      `**Candidate:** \`${CANDIDATE_SHA}\``,
      `**Review worktree:** \`${REVIEW_WORKTREE}\``,
      "**Reviewer:** independent native Codex subagent",
      "",
      "## Findings",
      "",
      "None.",
      "",
    ].join("\n"),
    "utf8",
  );
}

function inventoryArtifacts(root) {
  const artifacts = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        const relativePath = path.relative(root, absolute).replaceAll("\\", "/");
        if (relativePath === "manifest.json") continue;
        artifacts.push({
          path: relativePath,
          bytes: fs.statSync(absolute).size,
          sha256: sha256(absolute),
          repository_artifact: true,
        });
      }
    }
  };
  visit(root);
  return artifacts.sort((left, right) => left.path.localeCompare(right.path));
}

function createFixture(name) {
  const root = path.join(TEST_ROOT, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  const gates = {};
  for (const gate of GATES) {
    const receipt = `commands/${gate}/manifest.json`;
    gates[gate] = { valid: true, receipt };
    writeJson(path.join(root, receipt), {
      schema: "latticework.evidence.command.v1",
      receipt_id: `LW-P3-001-${gate}`,
      baseline_sha: BASELINE_SHA,
      candidate_sha: CANDIDATE_SHA,
      exit_code: 0,
      command: ["synthetic", gate],
      artifacts: [],
    });
  }
  writeJson(path.join(root, "summary.json"), {
    schema: "latticework.phase3-summary.v1",
    work_id: "LW-P3-001",
    evidence_label: "MEASURED",
    valid: true,
    baseline_sha: BASELINE_SHA,
    implementation_base_commit: IMPLEMENTATION_BASE,
    candidate_sha: CANDIDATE_SHA,
    safety: {
      real_user_data: "not-accessed",
      real_provider_traffic: "none",
      real_credentials: "none",
      listener: "none",
      legacy_mutation: "none",
      candidate_activation: "none",
      cutover: "none",
    },
    gates,
  });
  addIndependentReview(root);
  const artifactFiles = inventoryArtifacts(root);
  writeJson(path.join(root, "manifest.json"), {
    schema: "latticework.evidence.artifact-bundle.v1",
    receipt_id: "LW-P3-001-bundle",
    baseline_sha: BASELINE_SHA,
    candidate_sha: CANDIDATE_SHA,
    directory: root,
    artifacts: artifactFiles,
  });
  return root;
}

test.after(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});

test("accepts a complete hash-bound Phase 3 evidence fixture", () => {
  const root = createFixture("complete");
  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
    requireIndependentReview: true,
  });

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.gates, 12);
  assert.equal(result.artifacts, 30);
  assert.equal(result.independentReviewRequired, true);
});

test("rejects a failed command receipt", () => {
  const root = createFixture("failed-receipt");
  const receiptPath = path.join(
    root,
    "commands",
    "node-unit",
    "manifest.json",
  );
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  receipt.exit_code = 1;
  writeJson(receiptPath, receipt);

  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /node-unit.*exit code/i);
});

test("rejects tampered artifact bytes", () => {
  const root = createFixture("tampered");
  fs.appendFileSync(path.join(root, "summary.json"), "tampered\n", "utf8");

  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /hash mismatch.*summary\.json/i);
});

test("rejects missing or non-independent final review", () => {
  const root = createFixture("review");
  fs.writeFileSync(
    path.join(root, "independent-review", "REVIEW.md"),
    "# Review\n\n**Verdict:** BLOCKED\n",
    "utf8",
  );

  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /independent review.*GREEN/i);
});

test("rejects secret-like content in receipted text", () => {
  const root = createFixture("secret");
  fs.appendFileSync(
    path.join(root, "independent-review", "REVIEW.md"),
    "\nSECRET_TOKEN_DO_NOT_COMMIT\n",
    "utf8",
  );

  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /secret-like content/i);
});

test("rejects files omitted from the artifact manifest", () => {
  const root = createFixture("unreceipted");
  fs.writeFileSync(
    path.join(root, "commands", "unreceipted.log"),
    "not in manifest\n",
    "utf8",
  );

  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /not receipted.*unreceipted\.log/i);
});

test("rejects a prose-only GREEN review without clean-worktree receipts", () => {
  const root = createFixture("prose-only-review");
  fs.rmSync(path.join(root, "independent-review", "automation.json"));

  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /automation.*missing/i);
});

test("rejects dirty or wrong-identity independent worktree receipts", () => {
  const root = createFixture("dirty-review-receipt");
  const receiptPath = path.join(
    root,
    "independent-review",
    "commands",
    "worktree-end",
    "manifest.json",
  );
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  receipt.repository.status = "## HEAD (no branch)\n M packages/storage/src/migration.ts";
  receipt.repository.head = "b".repeat(40);
  writeJson(receiptPath, receipt);

  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
  });

  assert.equal(result.valid, false);
  assert.match(
    result.failures.join("\n"),
    /worktree-end.*(candidate|clean)/i,
  );
});

test("rejects a lockfile replay receipt outside the independent worktree", () => {
  const root = createFixture("outside-lockfile-replay");
  const receiptPath = path.join(
    root,
    "independent-review",
    "commands",
    "lockfile-replay",
    "manifest.json",
  );
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  receipt.cwd = path.resolve(REPO_ROOT, "..", "unrelated-replay");
  writeJson(receiptPath, receipt);

  const result = validatePhase3Evidence({
    workspaceRoot: REPO_ROOT,
    evidenceDirectory: root,
  });

  assert.equal(result.valid, false);
  assert.match(
    result.failures.join("\n"),
    /lockfile-replay.*independent candidate worktree/i,
  );
});

test("verification runner produces and validates structured independent worktree evidence", () => {
  const runner = fs.readFileSync(
    path.join(
      REPO_ROOT,
      "tools",
      "reengineering",
      "run-phase3-verification.ps1",
    ),
    "utf8",
  );

  assert.match(runner, /\[switch\]\$IndependentReview/u);
  assert.match(runner, /phase3-independent-review-\$Port/u);
  assert.match(runner, /worktree-start\/manifest\.json/u);
  assert.match(runner, /worktree-end\/manifest\.json/u);
  assert.match(runner, /latticework\.phase3-independent-review\.v1/u);
  assert.match(runner, /--independent-review/u);
  assert.doesNotMatch(runner, /findstr/u);
  assert.match(
    runner,
    /-Command @\("git", "status", "--porcelain"\)/u,
  );
  assert.doesNotMatch(runner, /@\("git\.exe", "status", "--porcelain"\)/u);
  const installIndex = runner.indexOf("npm ci --ignore-scripts");
  const clearIgnoreScriptsIndex = runner.indexOf(
    "Remove-Item Env:npm_config_ignore_scripts -ErrorAction SilentlyContinue",
  );
  const browserIndex = runner.indexOf("npm run p3:browser");
  assert.ok(installIndex >= 0, "runner must install with lifecycle scripts disabled");
  assert.ok(
    clearIgnoreScriptsIndex > installIndex,
    "runner must clear npm_config_ignore_scripts after the clean install",
  );
  assert.ok(
    clearIgnoreScriptsIndex < browserIndex,
    "runner must restore workspace pretest scripts before the browser gate",
  );
});
