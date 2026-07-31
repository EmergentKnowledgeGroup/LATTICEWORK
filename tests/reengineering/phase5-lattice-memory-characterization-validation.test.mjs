import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase5LatticeMemoryCharacterization } from "../../tools/reengineering/validate-phase5-lattice-memory-characterization.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TMP = path.join(ROOT, "runtime", "tmp", "phase5-memory-validation-tests");
const CONTRACT = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "tests/characterization/fixtures/phase5-lattice-memory-contract.json"),
    "utf8",
  ),
);

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function manifest(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && entry.name !== "manifest.json") files.push(absolute);
    }
  }
  walk(root);
  writeJson(path.join(root, "manifest.json"), {
    schema: "latticework.evidence.artifact-bundle.v1",
    artifacts: files
      .map((filePath) => ({
        path: path.relative(root, filePath).replaceAll("\\", "/"),
        sha256: hash(filePath),
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  });
}

function fixture(name) {
  const root = path.join(TMP, name);
  fs.rmSync(root, { recursive: true, force: true });
  const divergences = new Set(CONTRACT.accepted_divergence_candidates);
  const results = [];
  for (const group of CONTRACT.groups) {
    for (const atom of group.atoms) {
      const directory = path.join(root, "results", atom);
      const disposition = divergences.has(atom)
        ? "ACCEPTED_DIVERGENCE_CANDIDATE"
        : "MATCH";
      writeJson(path.join(directory, "observation.json"), {
        schema: "latticework.phase5.atomic-result.v1",
        atom_id: atom,
        group_id: group.id,
        status: "PASS",
        disposition,
        observed: { matched: true },
      });
      writeJson(path.join(directory, "network.json"), {
        schema: "latticework.phase5.network.v1",
        atom_id: atom,
        group_id: group.id,
        external_transmitted_count: 0,
        external_http_denied: true,
        websocket_denied: true,
        realtime_denied: true,
        beacon_denied: true,
        external_http_blocked: atom === "P5-MEM-ISO-001" ? 2 : 0,
        websocket_blocked: atom === "P5-MEM-ISO-001" ? 1 : 0,
        beacon_blocked: atom === "P5-MEM-ISO-001" ? 1 : 0,
      });
      writeJson(path.join(directory, "storage.json"), {
        schema: "latticework.phase5.storage.v1",
        atom_id: atom,
        group_id: group.id,
        database_names: ["LatticeMemory"],
        local_storage_key_count: 0,
        session_storage_key_count: 0,
        cache_name_count: 0,
      });
      results.push({
        id: atom,
        group: group.id,
        status: "PASS",
        disposition,
        receipts: {
          observation: `results/${atom}/observation.json`,
          network: `results/${atom}/network.json`,
          storage: `results/${atom}/storage.json`,
        },
      });
    }
  }
  writeJson(path.join(root, "summary.json"), {
    schema: "latticework.phase5-lattice-memory-characterization.v1",
    work_id: "LW-P5-MEM-CHAR-001",
    baseline_sha: "e7585999fc1af2707f410ae87356cf2b52e08d9c",
    status: "GREEN",
    synthetic_only: true,
    external_egress: false,
    cleanup: {
      listener_closed: true,
      port_released: true,
      profiles_deleted: true,
      run_root_deleted: true,
    },
    results,
  });
  writeJson(path.join(root, "independent-review.json"), {
    verdict: "GREEN",
    independent: true,
    atom_count: 69,
    clean_worktree: true,
  });
  manifest(root);
  return root;
}

test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

test("accepts a complete content-free 69-atom characterization bundle", () => {
  const evidence = fixture("green");
  const result = validatePhase5LatticeMemoryCharacterization({
    workspaceRoot: ROOT,
    evidenceRoot: path.relative(ROOT, evidence),
  });
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.atomCount, 69);
  assert.equal(
    result.divergenceCount,
    CONTRACT.accepted_divergence_candidates.length,
  );
});

for (const [name, mutate, expected] of [
  ["failed-atom", (root) => {
    const summary = JSON.parse(fs.readFileSync(path.join(root, "summary.json"), "utf8"));
    summary.results[0].status = "FAIL";
    writeJson(path.join(root, "summary.json"), summary);
  }, /not PASS/i],
  ["sentinel", (root) => {
    const target = path.join(root, "results", CONTRACT.groups[0].atoms[0], "observation.json");
    const value = JSON.parse(fs.readFileSync(target, "utf8"));
    value.private = "P5_PRIVATE_TOKEN";
    writeJson(target, value);
  }, /private sentinel/i],
  ["cleanup", (root) => {
    const summary = JSON.parse(fs.readFileSync(path.join(root, "summary.json"), "utf8"));
    summary.cleanup.run_root_deleted = false;
    writeJson(path.join(root, "summary.json"), summary);
  }, /cleanup|deep-equal/i],
  ["review", (root) => {
    fs.rmSync(path.join(root, "independent-review.json"));
  }, /independent-review/i],
  ["tamper", (root) => {
    fs.appendFileSync(path.join(root, "summary.json"), " ");
  }, /hash drifted/i],
]) {
  test(`rejects unsafe characterization evidence: ${name}`, () => {
    const evidence = fixture(name);
    mutate(evidence);
    if (!["tamper"].includes(name)) manifest(evidence);
    const result = validatePhase5LatticeMemoryCharacterization({
      workspaceRoot: ROOT,
      evidenceRoot: path.relative(ROOT, evidence),
    });
    assert.equal(result.valid, false);
    assert.match(result.failures.join("\n"), expected);
  });
}

test("canonical CLI rejects override arguments", () => {
  const result = spawnSync(
    process.execPath,
    ["tools/reengineering/validate-phase5-lattice-memory-characterization.mjs", "--evidence", "elsewhere"],
    { cwd: ROOT, encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /accepts no CLI overrides/i);
});
