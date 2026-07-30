import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { validatePhase0Control } from "../../tools/reengineering/validate-phase0-control.mjs";

const testRoot = path.resolve("runtime/tmp/phase0-control-validation-tests");
const validatorPath = path.resolve("tools/reengineering/validate-phase0-control.mjs");

const requiredDocuments = [
  "AGENTS.md",
  "PROJECT_STATE.md",
  "PROJECT_CHARTER.md",
  "PRINCIPLES.md",
  "docs/BASELINE.md",
  "docs/COMPATIBILITY.md",
  "docs/ARCHITECTURE.md",
  "docs/TESTING_AND_VERIFICATION.md",
  "docs/METRICS_AND_BENCHMARKS.md",
  "docs/COMPARISON.md",
  "docs/CLAIMS_LEDGER.md",
  "PROVENANCE.md",
  "reengineering/BASELINE_CAPABILITY_CONTRACT.md",
  "reengineering/BASELINE_TEST_REQUIREMENT_MANIFEST.md",
  "reengineering/DATA_INVENTORY.md",
  "reengineering/SECURITY_BOUNDARY_MAP.md",
  "reengineering/LEGACY_SOURCE_MAP.md",
  "reengineering/FEATURE_STATUS_REGISTRY.md",
  "reengineering/PARITY_MATRIX.md",
  "reengineering/EXECUTION_CHECKLIST.md",
  "reengineering/BLOCKERBOARD.md",
  "reengineering/RELEASE_READINESS.md",
  "reengineering/PERFORMANCE_PLAN.md",
  "reengineering/PLATFORM_SUPPORT_MATRIX.md",
];

const requiredAdrs = [
  "0001-canonical-source-and-build-strategy.md",
  "0002-typescript-module-architecture.md",
  "0003-ui-rendering-strategy.md",
];

const requiredSections = [
  "Context",
  "Decision",
  "Invariants",
  "Alternatives considered",
  "Consequences",
  "Compatibility impact",
  "Data and migration impact",
  "Security and privacy impact",
  "Verification plan",
  "Rollback",
  "Review date",
];

function writeFile(root, relativePath, content = "proof") {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeJson(root, relativePath, value) {
  writeFile(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function makeTrack(name) {
  return {
    track: name,
    step: "phase-start",
    note: "fixture",
    branch: "fixture",
    head: "fixture",
    next_cmd: "fixture",
    validations: [],
  };
}

function makeRegistryRow(id) {
  return {
    id,
    category: "fixture",
    name: "Fixture",
    slug: "fixture",
    baseline_evidence_label: "OBSERVED",
    runtime_reachability: "UNKNOWN",
    compatibility_level: "C0",
    preservation: "REQUIRED_UNTIL_DISPOSITIONED",
    owner_approval_required_for_retirement: true,
    source: "fixture",
    details: null,
  };
}

function makeDataRegistryRow(id) {
  return {
    id,
    kind: "localStorage",
    name: "fixture",
    static_paths: ["fixture.html"],
    runtime_observed: false,
    runtime_details: null,
    owner: "UNKNOWN",
    sensitivity: "UNKNOWN_TREAT_AS_HIGH",
    retention: "UNKNOWN",
    record_schema: "UNKNOWN",
    migration_rule: "PRESERVE_UNKNOWN_STORE_RECORD_AND_FIELD",
    owner_approval_required_for_removal: true,
    evidence: ["fixture"],
  };
}

function createFixture({ missingArtifact = false } = {}) {
  fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(testRoot, { recursive: true });

  for (const documentPath of requiredDocuments) writeFile(testRoot, documentPath, "# fixture\n");
  const adrContent = ["# ADR", "**Status:** Proposed", ...requiredSections.map((section) => `## ${section}\nfixture`)].join("\n\n");
  for (const adrName of requiredAdrs) writeFile(testRoot, path.join("docs/decisions", adrName), adrContent);

  const track = makeTrack("FIXTURE WORK");
  for (const checkpointPath of ["runtime/checkpoints/LATEST.json", "reengineering/checkpoints/LATEST.json"]) {
    writeJson(testRoot, checkpointPath, { current_track: "FIXTURE WORK", tracks: { "FIXTURE WORK": track } });
  }
  writeJson(testRoot, "reengineering/CAPABILITY_PRESERVATION_REGISTRY.json", {
    schema: "fixture",
    baseline_sha: "fixture",
    source_work_id: "fixture",
    evidence_scope: "fixture",
    counts: { total: 1 },
    rows: [makeRegistryRow("PRES-FIXTURE-001")],
  });
  writeJson(testRoot, "reengineering/DATA_PRESERVATION_REGISTRY.json", {
    schema: "fixture",
    counts: { total: 1 },
    rows: [makeDataRegistryRow("DATA-FIXTURE-001")],
  });

  const manifestRoots = [
    "LW-P0-001",
    "LW-P0-001-environment",
    "LW-P0-002-smoke",
    "LW-P0-002-smoke-history",
    "LW-P0-003-browser",
    "LW-M0-INV-001",
    "LW-M0-BEH-001",
  ];
  for (const manifestRoot of manifestRoots) {
    const manifestPath = path.join("reengineering/evidence/phase-0", manifestRoot, "manifest.json");
    writeJson(testRoot, manifestPath, {
      artifacts: [{
        path: "proof.txt",
        bytes: 5,
        sha256: "c1cda26362828b69266512052b97cb3729e3b052e4ade47c0a1e3383defe73c7",
        repository_artifact: true,
      }],
    });
    if (!(missingArtifact && manifestRoot === "LW-P0-003-browser")) {
      writeFile(testRoot, path.join("reengineering/evidence/phase-0", manifestRoot, "proof.txt"));
    }
  }
}

test.after(() => fs.rmSync(testRoot, { recursive: true, force: true }));

test("validates the repository control plane deterministically", () => {
  const first = validatePhase0Control({ repoRoot: process.cwd() });
  const second = validatePhase0Control({ repoRoot: process.cwd() });

  assert.equal(first.valid, true, JSON.stringify(first.failures, null, 2));
  assert.deepEqual(first, second);
  assert.equal(first.checks.documents.length, requiredDocuments.length);
  assert.equal(first.checks.adrs.length, 3);
  assert.equal(first.checks.checkpoints.length, 2);
  assert.equal(first.checks.capability_registry.row_count, 278);
  assert.ok(first.checks.data_registry.row_count >= 210);
  assert.equal(first.checks.evidence_manifests.length, 7);
});

test("CLI emits JSON and fails for a missing in-repository evidence artifact", () => {
  createFixture({ missingArtifact: true });
  const command = spawnSync(process.execPath, [validatorPath, "--repo-root", testRoot], {
    encoding: "utf8",
  });
  const report = JSON.parse(command.stdout);

  assert.equal(command.status, 1);
  assert.equal(report.valid, false);
  assert.ok(report.failures.some((failure) => failure.code === "evidence-artifact-missing"));
});

test("accepts a complete fixture without writing to it", () => {
  createFixture();
  const before = fs.readdirSync(testRoot, { recursive: true }).sort();
  const report = validatePhase0Control({ repoRoot: testRoot });
  const after = fs.readdirSync(testRoot, { recursive: true }).sort();

  assert.equal(report.valid, true, JSON.stringify(report.failures, null, 2));
  assert.deepEqual(after, before);
});

test("fails when a declared evidence hash no longer matches", () => {
  createFixture();
  writeFile(
    testRoot,
    "reengineering/evidence/phase-0/LW-M0-INV-001/proof.txt",
    "changed",
  );

  const report = validatePhase0Control({ repoRoot: testRoot });

  assert.equal(report.valid, false);
  assert.ok(report.failures.some((failure) => failure.code === "evidence-artifact-size-mismatch"));
  assert.ok(report.failures.some((failure) => failure.code === "evidence-artifact-hash-mismatch"));
});

test("rejects control JSON that is valid JSON but not an object", () => {
  createFixture();
  writeFile(testRoot, "runtime/checkpoints/LATEST.json", "[]\n");

  const report = validatePhase0Control({ repoRoot: testRoot });

  assert.equal(report.valid, false);
  assert.ok(report.failures.some((failure) => failure.code === "checkpoint-invalid-schema"));
});

test("fails when a living control document retains an unresolved placeholder", () => {
  createFixture();
  writeFile(testRoot, "docs/COMPARISON.md", "# Comparison\n\n[VALUE]\n");

  const report = validatePhase0Control({ repoRoot: testRoot });

  assert.equal(report.valid, false);
  assert.ok(
    report.failures.some(
      (failure) =>
        failure.code === "document-placeholder-unresolved"
        && failure.path === "docs/COMPARISON.md",
    ),
  );
});
