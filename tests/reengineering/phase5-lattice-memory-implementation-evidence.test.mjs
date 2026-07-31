import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  validatePhase5LatticeMemoryImplementationEvidence,
} from "../../tools/reengineering/validate-phase5-lattice-memory-implementation-evidence.mjs";

const candidateSha = "1".repeat(40);
const implementationBase = "ac45408307e91ee8d850c24753ce6b4d6e903f12";

async function fixture(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "lw-p5-evidence-"));
  await mkdir(path.join(root, "browser", "attachments"), { recursive: true });
  const summary = {
    schema: "latticework.phase5-lattice-memory-implementation-summary.v1",
    evidence_label: "MEASURED",
    work_id: "LW-P5-MEM-001",
    valid: true,
    status: "GREEN",
    implementation_base_commit: implementationBase,
    candidate_sha: candidateSha,
    safety: {
      real_user_data: "not-accessed",
      real_provider_traffic: "none",
      real_credentials: "none",
      application_listener: "none",
      test_listener: "exact-loopback-run-owned",
      candidate_activation: "none",
      deployment: "none",
      cutover: "none",
    },
    repository_controls: { tests: 300, pass: 300, fail: 0, skipped: 0, todo: 0 },
    browser: { expected: 4, unexpected: 0, flaky: 0, skipped: 0, content_free_receipts: 8 },
    gates: {
      environment: "commands/environment/manifest.json",
      install: "commands/install/manifest.json",
      scope: "commands/scope/manifest.json",
      typecheck: "commands/typecheck/manifest.json",
      unit: "commands/unit/manifest.json",
      browser: "commands/browser/manifest.json",
      phase3_boundary: "commands/phase3-boundary/manifest.json",
      phase4_verification: "commands/phase4-verification/manifest.json",
      repository_controls: "commands/repository-controls/manifest.json",
      deterministic_build: "commands/deterministic-build/manifest.json",
      audit: "commands/audit/manifest.json",
      sbom: "commands/sbom/manifest.json",
      hygiene: "commands/hygiene/manifest.json",
    },
    independent_review: {
      verdict: "GREEN",
      candidate_sha: candidateSha,
      receipt: "independent-review/review.json",
    },
    ...overrides,
  };
  await writeFile(path.join(root, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(path.join(root, "manifest.json"), `${JSON.stringify({
    schema: "latticework.evidence-directory-manifest.v1",
    id: "LW-P5-MEM-001-bundle",
    candidate_sha: candidateSha,
    files: [],
  }, null, 2)}\n`);
  await writeFile(path.join(root, "browser", "results.json"), `${JSON.stringify({
    stats: { expected: 4, unexpected: 0, flaky: 0, skipped: 0 },
  })}\n`);
  for (let index = 0; index < 8; index += 1) {
    await writeFile(
      path.join(root, "browser", "attachments", `receipt-${index}.json`),
      `${JSON.stringify({ schema: "latticework.phase5.browser-receipt.v1", content_free: true, count: index })}\n`,
    );
  }
  await mkdir(path.join(root, "independent-review"), { recursive: true });
  await writeFile(path.join(root, "independent-review", "review.json"), `${JSON.stringify({
    schema: "latticework.phase5-independent-review.v1",
    verdict: "GREEN",
    candidate_sha: candidateSha,
    findings: [],
  }, null, 2)}\n`);
  for (const relative of Object.values(summary.gates)) {
    const absolute = path.join(root, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify({ exit_code: 0, candidate_sha: candidateSha })}\n`);
  }
  return root;
}

test("accepts a complete independently green synthetic-only evidence bundle", async () => {
  const evidence = await fixture();
  const result = await validatePhase5LatticeMemoryImplementationEvidence({
    evidenceDirectory: evidence,
    candidateSha,
    requireIndependent: true,
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.failures, []);
});

test("accepts a pending canonical bundle only when independent review is not required", async () => {
  const evidence = await fixture({
    status: "PENDING_INDEPENDENT_CLEAN_WORKTREE_REVIEW",
    independent_review: null,
  });
  const pending = await validatePhase5LatticeMemoryImplementationEvidence({
    evidenceDirectory: evidence,
    candidateSha,
    requireIndependent: false,
  });
  const final = await validatePhase5LatticeMemoryImplementationEvidence({
    evidenceDirectory: evidence,
    candidateSha,
    requireIndependent: true,
  });
  assert.equal(pending.valid, true);
  assert.equal(final.valid, false);
});

test("rejects missing independent review, unsafe authority drift, and content-bearing receipts", async () => {
  const evidence = await fixture({
    safety: {
      real_user_data: "accessed",
      real_provider_traffic: "none",
      real_credentials: "none",
      application_listener: "none",
      test_listener: "exact-loopback-run-owned",
      candidate_activation: "none",
      deployment: "none",
      cutover: "none",
    },
    independent_review: null,
  });
  await writeFile(
    path.join(evidence, "browser", "attachments", "receipt-0.json"),
    `${JSON.stringify({ schema: "latticework.phase5.browser-receipt.v1", content_free: false, summary: "forbidden" })}\n`,
  );
  const result = await validatePhase5LatticeMemoryImplementationEvidence({
    evidenceDirectory: evidence,
    candidateSha,
    requireIndependent: true,
  });
  assert.equal(result.valid, false);
  assert(result.failures.some((failure) => failure.includes("real_user_data")));
  assert(result.failures.some((failure) => failure.includes("independent")));
  assert(result.failures.some((failure) => failure.includes("content-free")));
});

test("rejects candidate mismatch and non-green gate receipts", async () => {
  const evidence = await fixture();
  await writeFile(
    path.join(evidence, "commands", "unit", "manifest.json"),
    `${JSON.stringify({ exit_code: 1, candidate_sha: candidateSha })}\n`,
  );
  const result = await validatePhase5LatticeMemoryImplementationEvidence({
    evidenceDirectory: evidence,
    candidateSha: "2".repeat(40),
    requireIndependent: true,
  });
  assert.equal(result.valid, false);
  assert(result.failures.some((failure) => failure.includes("candidate")));
  assert(result.failures.some((failure) => failure.includes("unit")));
});
