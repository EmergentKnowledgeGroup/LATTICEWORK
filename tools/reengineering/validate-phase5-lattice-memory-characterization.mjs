import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORK_ID = "LW-P5-MEM-CHAR-001";
const BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const MODULE_SHA256 =
  "a65dba17a30ab8a657e52423ab8b1ac58d5597a83fe4ee823aecb83dc9588052";
const DEFAULT_EVIDENCE =
  "reengineering/evidence/phase-5/LW-P5-MEM-CHAR-001";
const SENTINELS = [
  "P5_PRIVATE_SUMMARY",
  "P5_PRIVATE_REF",
  "P5_PRIVATE_TOKEN",
  "P5_PRIVATE_ERROR",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function isDescendant(candidate, root) {
  const relative = path.relative(root, candidate);
  return (
    relative.length > 0 &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function walkFiles(root) {
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`evidence traverses symbolic link: ${absolute}`);
    }
    if (entry.isDirectory()) output.push(...walkFiles(absolute));
    else if (entry.isFile()) output.push(absolute);
  }
  return output.sort();
}

function assertContentFree(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const sentinel of SENTINELS) {
    assert.equal(
      text.includes(sentinel),
      false,
      `${path.basename(filePath)} contains private sentinel`,
    );
  }
}

export function validatePhase5LatticeMemoryCharacterization({
  workspaceRoot,
  evidenceRoot = DEFAULT_EVIDENCE,
} = {}) {
  const root = path.resolve(workspaceRoot ?? process.cwd());
  const evidence = path.resolve(root, evidenceRoot);
  const failures = [];
  let atomCount = 0;
  let divergenceCount = 0;
  try {
    assert.equal(isDescendant(evidence, root), true, "evidence root must be inside repository");
    assert.equal(fs.lstatSync(evidence).isSymbolicLink(), false, "evidence root cannot be a symbolic link");
    const contract = readJson(
      path.join(root, "tests/characterization/fixtures/phase5-lattice-memory-contract.json"),
    );
    const expectedAtoms = contract.groups.flatMap((group) => group.atoms);
    assert.equal(expectedAtoms.length, 69, "contract must contain 69 atoms");
    assert.equal(new Set(expectedAtoms).size, 69, "contract atoms must be unique");
    assert.equal(
      sha256(path.join(root, "docs/modules/lattice-memory.js")),
      MODULE_SHA256,
      "immutable legacy module hash drifted",
    );

    const summary = readJson(path.join(evidence, "summary.json"));
    assert.equal(summary.schema, "latticework.phase5-lattice-memory-characterization.v1");
    assert.equal(summary.work_id, WORK_ID);
    assert.equal(summary.baseline_sha, BASELINE_SHA);
    assert.equal(summary.status, "GREEN");
    assert.equal(summary.external_egress, false);
    assert.equal(summary.synthetic_only, true);
    assert.deepEqual(summary.cleanup, {
      listener_closed: true,
      port_released: true,
      profiles_deleted: true,
      run_root_deleted: true,
    });
    assert.equal(summary.results.length, 69);
    assert.equal(new Set(summary.results.map((row) => row.id)).size, 69);

    const expectedDivergences = new Set(contract.accepted_divergence_candidates);
    for (const row of summary.results) {
      assert.equal(expectedAtoms.includes(row.id), true, `unexpected atom ${row.id}`);
      const group = contract.groups.find((item) => item.atoms.includes(row.id));
      assert.equal(row.group, group.id, `${row.id} group drifted`);
      assert.equal(row.status, "PASS", `${row.id} is not PASS`);
      assert.equal(
        row.disposition,
        expectedDivergences.has(row.id)
          ? "ACCEPTED_DIVERGENCE_CANDIDATE"
          : "MATCH",
        `${row.id} disposition drifted`,
      );
      for (const [kind, relative] of Object.entries(row.receipts)) {
        assert.equal(
          ["observation", "network", "storage"].includes(kind),
          true,
          `${row.id} unexpected receipt kind`,
        );
        const receiptPath = path.resolve(evidence, relative);
        assert.equal(isDescendant(receiptPath, evidence), true, `${row.id} receipt escapes evidence`);
        const receipt = readJson(receiptPath);
        assert.equal(receipt.atom_id, row.id, `${row.id} receipt identity drifted`);
        assert.equal(receipt.group_id, row.group, `${row.id} receipt group drifted`);
        assertContentFree(receiptPath);
        if (kind === "observation") {
          assert.equal(receipt.status, "PASS");
          assert.equal(receipt.disposition, row.disposition);
        } else if (kind === "network") {
          assert.equal(receipt.external_transmitted_count, 0);
          assert.equal(receipt.external_http_denied, true);
          assert.equal(receipt.websocket_denied, true);
          assert.equal(receipt.realtime_denied, true);
          assert.equal(receipt.beacon_denied, true);
          if (row.id === "P5-MEM-ISO-001") {
            assert.equal(receipt.external_http_blocked >= 2, true);
            assert.equal(receipt.websocket_blocked >= 1, true);
            assert.equal(receipt.beacon_blocked >= 1, true);
          }
        } else {
          assert.deepEqual(
            receipt.database_names.filter((name) => name !== "LatticeMemory"),
            [],
            `${row.id} touched another database`,
          );
          assert.equal(receipt.local_storage_key_count, 0);
          assert.equal(receipt.session_storage_key_count, 0);
          assert.equal(receipt.cache_name_count, 0);
          assert.equal("rows" in receipt, false, `${row.id} storage receipt contains raw rows`);
        }
      }
    }
    atomCount = summary.results.length;
    divergenceCount = summary.results.filter(
      (row) => row.disposition === "ACCEPTED_DIVERGENCE_CANDIDATE",
    ).length;

    const review = readJson(path.join(evidence, "independent-review.json"));
    assert.equal(review.verdict, "GREEN");
    assert.equal(review.independent, true);
    assert.equal(review.atom_count, 69);
    assert.equal(review.clean_worktree, true);

    const manifest = readJson(path.join(evidence, "manifest.json"));
    assert.equal(manifest.schema, "latticework.evidence.artifact-bundle.v1");
    const actual = walkFiles(evidence)
      .filter((filePath) => path.basename(filePath) !== "manifest.json")
      .map((filePath) => path.relative(evidence, filePath).replaceAll("\\", "/"));
    assert.deepEqual(
      manifest.artifacts.map((entry) => entry.path).sort(),
      actual,
      "manifest paths are incomplete",
    );
    for (const entry of manifest.artifacts) {
      const artifact = path.resolve(evidence, entry.path);
      assert.equal(isDescendant(artifact, evidence), true, "manifest artifact escapes evidence");
      assert.equal(sha256(artifact), entry.sha256, `${entry.path} hash drifted`);
      assertContentFree(artifact);
    }
  } catch (error) {
    failures.push(error.message);
  }
  return {
    schema: "latticework.phase5-lattice-memory-characterization-validation.v1",
    valid: failures.length === 0,
    evidenceRoot: path.relative(root, evidence).replaceAll("\\", "/"),
    atomCount,
    divergenceCount,
    failures,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  if (process.argv.length !== 2) {
    process.stderr.write(
      "Phase 5 LatticeMemory characterization validator accepts no CLI overrides.\n",
    );
    process.exitCode = 2;
  } else {
    const result = validatePhase5LatticeMemoryCharacterization();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  }
}
