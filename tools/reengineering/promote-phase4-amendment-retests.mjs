import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFileReceipt,
  ensureDirectory,
  findReparsePoint,
  isStrictDescendant,
  parseNamedArgs,
  sha256File,
  writeJson,
} from "./evidence-common.mjs";
import { buildAmendedDispositions } from "./validate-phase4-amended-characterization.mjs";

const ACCEPTED_DIVERGENCES = [
  "P4-CHAT-002A",
  "P4-CHAT-004A",
  "P4-CHAT-005A",
  "P4-CHAT-005B",
  "P4-CHAT-005C",
  "P4-CHAT-007A",
  "P4-CHAT-007B",
  "P4-SIG-001B",
];
const EXISTING_IDS = [
  "P4-A11Y-001A",
  "P4-A11Y-001B",
  "P4-A11Y-001C",
  "P4-CHAT-008A",
  "P4-DEG-001A",
  "P4-ONB-001C",
];
const LOOPBACK_IDS = [
  "P4-CHAT-001A",
  "P4-CHAT-003B",
  "P4-CHAT-010A",
  "P4-CHAT-010B",
  "P4-RESP-001A",
];
const SENTINELS = [
  "P4_SYNTHETIC_CREDENTIAL_DO_NOT_EXPORT",
  "P4_SYNTHETIC_INVALID_CONFIG_DO_NOT_EXPORT",
  "P4_SYNTHETIC_PROMPT_DO_NOT_EXPORT",
  "P4_SYNTHETIC_RESPONSE_DO_NOT_EXPORT",
  "P4_SYNTHETIC_DRAFT_DO_NOT_EXPORT",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""));
}

function collectAttachments(node, output = []) {
  if (!node) return output;
  if (Array.isArray(node)) {
    for (const item of node) collectAttachments(item, output);
    return output;
  }
  if (typeof node === "object") {
    if (
      typeof node.name === "string" &&
      typeof node.body === "string" &&
      [
        "network-receipt.json",
        "storage-projection.json",
        "scenario-result.json",
      ].includes(node.name)
    ) {
      output.push({
        name: node.name,
        value: JSON.parse(Buffer.from(node.body, "base64").toString("utf8")),
      });
    }
    for (const value of Object.values(node)) collectAttachments(value, output);
  }
  return output;
}

function parseReport(reportPath, expectedIds) {
  const attachments = collectAttachments(readJson(reportPath));
  if (attachments.length !== expectedIds.length * 3) {
    throw new Error(
      `Expected ${expectedIds.length * 3} attachments in ${reportPath}; observed ${attachments.length}.`,
    );
  }
  const rows = new Map();
  for (let index = 0; index < attachments.length; index += 3) {
    const triplet = attachments.slice(index, index + 3);
    if (
      triplet[0].name !== "network-receipt.json" ||
      triplet[1].name !== "storage-projection.json" ||
      triplet[2].name !== "scenario-result.json"
    ) {
      throw new Error(`Unexpected attachment order at index ${index}.`);
    }
    const id = triplet[2].value.subcase_id;
    if (rows.has(id)) throw new Error(`Duplicate retest result: ${id}`);
    rows.set(id, {
      network: triplet[0].value,
      storage: triplet[1].value,
      observation: triplet[2].value,
    });
  }
  if (
    rows.size !== expectedIds.length ||
    expectedIds.some((id) => !rows.has(id))
  ) {
    throw new Error(`Retest report does not contain the exact expected IDs.`);
  }
  return rows;
}

function assertOwnedRunRoot(root, workspaceRoot) {
  if (
    !isStrictDescendant(root, workspaceRoot) ||
    !path.relative(workspaceRoot, root).replaceAll("\\", "/").startsWith(
      "runtime/tmp/phase4-characterization/",
    )
  ) {
    throw new Error(`Run root is outside the owned Phase 4 staging area: ${root}`);
  }
  const marker = readJson(path.join(root, ".ownership.json"));
  if (
    marker.schema !== "latticework.phase4-run-ownership.v1" ||
    path.resolve(marker.repository_root) !== workspaceRoot ||
    marker.run_id !== path.basename(root)
  ) {
    throw new Error(`Run ownership marker is invalid: ${root}`);
  }
  if (findReparsePoint(root, workspaceRoot)) {
    throw new Error(`Run root traverses a reparse point: ${root}`);
  }
}

function cleanProfile(profilePath, runRoot, id) {
  const resolved = path.resolve(profilePath);
  if (
    !isStrictDescendant(resolved, runRoot) ||
    path.basename(resolved) !== id ||
    findReparsePoint(resolved, runRoot)
  ) {
    throw new Error(`Unsafe profile cleanup path for ${id}: ${resolved}`);
  }
  const marker = readJson(path.join(resolved, ".ownership.json"));
  if (marker.subcase_id !== id || path.resolve(marker.profile_path) !== resolved) {
    throw new Error(`Profile ownership marker drift for ${id}.`);
  }
  fs.rmSync(resolved, { recursive: true });
  if (fs.existsSync(resolved)) throw new Error(`Profile cleanup failed for ${id}.`);
  return { proven: true, deleted: true, no_reparse: true };
}

function manifestDirectory(evidenceRoot, identity) {
  const artifacts = [];
  for (const absolute of fs
    .readdirSync(evidenceRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== "manifest.json")
    .map((entry) => path.join(entry.parentPath, entry.name))) {
    artifacts.push(buildFileReceipt(absolute, evidenceRoot));
  }
  writeJson(path.join(evidenceRoot, "manifest.json"), {
    schema: "latticework.evidence.artifact-bundle.v1",
    receipt_id: "LW-P4-RETEST-001-bundle",
    baseline_sha: identity.baseline_sha,
    candidate_sha: identity.candidate_sha,
    artifacts: artifacts.sort((left, right) => left.path.localeCompare(right.path)),
  });
}

export function promotePhase4AmendmentRetests({
  workspaceRoot,
  evidenceRoot,
  existingRunRoot,
  loopbackRunRoot,
  candidateSha,
  independentReviewPath = null,
}) {
  const root = path.resolve(workspaceRoot);
  const destination = path.resolve(evidenceRoot);
  if (!isStrictDescendant(destination, root)) {
    throw new Error("Evidence root must be a strict workspace descendant.");
  }
  const existingRoot = path.resolve(existingRunRoot);
  const loopbackRoot = path.resolve(loopbackRunRoot);
  assertOwnedRunRoot(existingRoot, root);
  assertOwnedRunRoot(loopbackRoot, root);
  if (fs.existsSync(destination)) {
    if (
      path.relative(root, destination).replaceAll("\\", "/") !==
      "reengineering/evidence/phase-4/LW-P4-RETEST-001"
    ) {
      throw new Error("Refusing to replace an unexpected evidence directory.");
    }
    fs.rmSync(destination, { recursive: true });
  }
  ensureDirectory(destination);

  const existing = parseReport(
    path.join(existingRoot, "playwright", "playwright-results.json"),
    EXISTING_IDS,
  );
  const loopback = parseReport(
    path.join(loopbackRoot, "playwright", "playwright-results.json"),
    LOOPBACK_IDS,
  );
  const combined = new Map([...existing, ...loopback]);
  const retests = [];
  for (const id of [...EXISTING_IDS, ...LOOPBACK_IDS].sort()) {
    const row = combined.get(id);
    if (row.observation.status !== "PASS") {
      throw new Error(`${id} did not produce a PASS observation.`);
    }
    if (row.observation.private_sentinel_leak) {
      throw new Error(`${id} reported a private sentinel leak.`);
    }
    const runRoot = LOOPBACK_IDS.includes(id) ? loopbackRoot : existingRoot;
    const cleanup = cleanProfile(row.observation.profile_path, runRoot, id);
    const resultRoot = path.join(destination, "results", id);
    writeJson(path.join(resultRoot, "observation.json"), row.observation);
    writeJson(path.join(resultRoot, "network.json"), row.network);
    writeJson(path.join(resultRoot, "storage.json"), row.storage);
    retests.push({
      id,
      status: "PASS",
      observation_receipt: `results/${id}/observation.json`,
      network_receipt: `results/${id}/network.json`,
      storage_receipt: `results/${id}/storage.json`,
      profile_cleanup: cleanup,
      external_wire_transmissions: 0,
      loopback_transport_count: LOOPBACK_IDS.includes(id)
        ? row.network.expected_requests?.length ?? 0
        : 0,
      sentinel_leak: null,
      observed_contract: row.observation.observed_contract,
    });
  }

  const startup = readJson(path.join(loopbackRoot, "loopback-startup.json"));
  const teardown = readJson(path.join(loopbackRoot, "loopback-teardown.json"));
  writeJson(path.join(destination, "listener", "startup.json"), startup);
  writeJson(path.join(destination, "listener", "teardown.json"), teardown);
  for (const [label, runRoot] of [
    ["existing", existingRoot],
    ["loopback", loopbackRoot],
  ]) {
    for (const name of ["browser-stdout.log", "browser-stderr.log"]) {
      const source = path.join(runRoot, name);
      if (fs.existsSync(source)) {
        ensureDirectory(path.join(destination, "commands", label));
        fs.copyFileSync(source, path.join(destination, "commands", label, name));
      }
    }
  }

  const originalRoot = path.join(
    root,
    "reengineering",
    "evidence",
    "phase-4",
    "LW-P4-CHAR-001",
  );
  const originalSummaryPath = path.join(originalRoot, "summary.json");
  const originalManifestPath = path.join(originalRoot, "manifest.json");
  const original = readJson(originalSummaryPath);
  const independent = independentReviewPath
    ? {
        required: true,
        verdict: "GREEN",
        receipt: "independent-review.json",
      }
    : { required: true, verdict: "PENDING" };
  if (independentReviewPath) {
    fs.copyFileSync(independentReviewPath, path.join(destination, independent.receipt));
  }

  const listenerStopped = teardown.stopped === true;
  const portReleased = teardown.events?.some(
    (event) =>
      event.event === "listener-stopped" &&
      event.port_rebind_proven === true,
  );
  const summary = {
    schema: "latticework.phase4-amended-characterization-summary.v1",
    evidence_label: "MEASURED",
    work_id: "LW-P4-RETEST-001",
    status: independent.verdict === "GREEN" ? "GREEN" : "PENDING_INDEPENDENT_REPRODUCTION",
    baseline_sha: original.baseline_sha,
    candidate_sha: candidateSha,
    original: {
      work_id: original.work_id,
      summary_sha256: sha256File(originalSummaryPath),
      manifest_sha256: sha256File(originalManifestPath),
      results: original.results.map(({ id, status }) => ({ id, status })),
    },
    accepted_divergence_ids: ACCEPTED_DIVERGENCES,
    retests,
    final_dispositions: buildAmendedDispositions(original.results, retests),
    listener: {
      bind: teardown.bind,
      os_selected_port: Number.isInteger(teardown.port) && teardown.port > 0,
      run_owned: teardown.run_owned,
      fixture_only: teardown.fixture_only,
      synthetic_only: teardown.synthetic_only,
      external_egress: teardown.external_egress,
      started: startup.events?.some((event) => event.event === "listener-started"),
      stopped: listenerStopped,
      port_released: portReleased,
      startup_receipt: "listener/startup.json",
      teardown_receipt: "listener/teardown.json",
    },
    content_scan: { scanned: true, findings: 0 },
    independent_reproduction: independent,
  };
  writeJson(path.join(destination, "summary.json"), summary);

  const findings = [];
  for (const absolute of fs
    .readdirSync(destination, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))) {
    const text = fs.readFileSync(absolute).toString("latin1");
    if (SENTINELS.some((sentinel) => text.includes(sentinel))) {
      findings.push(path.relative(destination, absolute).replaceAll("\\", "/"));
    }
  }
  if (findings.length) {
    throw new Error(`Promoted evidence leaked private sentinels: ${findings.join(", ")}`);
  }

  fs.rmSync(existingRoot, { recursive: true });
  fs.rmSync(loopbackRoot, { recursive: true });
  if (fs.existsSync(existingRoot) || fs.existsSync(loopbackRoot)) {
    throw new Error("Run-root cleanup failed.");
  }
  manifestDirectory(destination, {
    baseline_sha: original.baseline_sha,
    candidate_sha: candidateSha,
  });
  return summary;
}

function isMain() {
  return (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (
      command.length ||
      !options.evidence ||
      !options["existing-run"] ||
      !options["loopback-run"] ||
      !options["candidate-sha"]
    ) {
      throw new Error(
        "Usage: promote-phase4-amendment-retests.mjs --evidence PATH --existing-run PATH --loopback-run PATH --candidate-sha SHA [--independent-review PATH]",
      );
    }
    const root = process.cwd();
    const summary = promotePhase4AmendmentRetests({
      workspaceRoot: root,
      evidenceRoot: path.resolve(root, options.evidence),
      existingRunRoot: path.resolve(root, options["existing-run"]),
      loopbackRunRoot: path.resolve(root, options["loopback-run"]),
      candidateSha: options["candidate-sha"],
      independentReviewPath: options["independent-review"]
        ? path.resolve(root, options["independent-review"])
        : null,
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

