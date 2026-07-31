import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isStrictDescendant,
  parseNamedArgs,
  sha256File,
  writeJson,
} from "./evidence-common.mjs";

const ORIGINAL_RELATIVE =
  "reengineering/evidence/phase-4/LW-P4-CHAR-001";
const ORIGINAL_SUMMARY_SHA256 =
  "49f9913f20d99109900bb30c50afc0bec93c4209dfe38fe0d9a4a9006660dbaf";
const ORIGINAL_MANIFEST_SHA256 =
  "27badc2f9c4497084006539ea9e0805d9617225a8518b6a508aa0c67dcaf1564";
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
const RETEST_IDS = [
  "P4-A11Y-001A",
  "P4-A11Y-001B",
  "P4-A11Y-001C",
  "P4-CHAT-001A",
  "P4-CHAT-003B",
  "P4-CHAT-008A",
  "P4-CHAT-010A",
  "P4-CHAT-010B",
  "P4-DEG-001A",
  "P4-ONB-001C",
  "P4-RESP-001A",
];
const LOOPBACK_RETEST_IDS = new Set([
  "P4-CHAT-001A",
  "P4-CHAT-003B",
  "P4-CHAT-010A",
  "P4-CHAT-010B",
  "P4-RESP-001A",
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""));
}

function sameMembers(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index])
  );
}

export function buildAmendedDispositions(originalResults, retests) {
  const retestMap = new Map(retests.map((row) => [row.id, row]));
  const accepted = new Set(ACCEPTED_DIVERGENCES);
  return originalResults
    .map((row) => {
      let finalDisposition;
      let retestStatus = null;
      if (accepted.has(row.id)) {
        finalDisposition = "ACCEPTED_DIVERGENCE";
      } else if (retestMap.has(row.id)) {
        retestStatus = retestMap.get(row.id)?.status ?? null;
        finalDisposition = retestStatus === "PASS" ? "PASS" : "BLOCKED";
      } else {
        finalDisposition = row.status === "PASS" ? "PASS" : "BLOCKED";
      }
      return {
        id: row.id,
        group: row.group,
        original_status: row.status,
        retest_status: retestStatus,
        final_disposition: finalDisposition,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function validateManifest(evidenceRoot, failures) {
  const manifestPath = path.join(evidenceRoot, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    failures.push("amended artifact manifest is missing");
    return;
  }
  const manifest = readJson(manifestPath);
  if (
    manifest.schema !== "latticework.evidence.artifact-bundle.v1" ||
    manifest.receipt_id !== "LW-P4-RETEST-001-bundle"
  ) {
    failures.push("amended artifact manifest identity is invalid");
  }
  const seen = new Set();
  for (const artifact of manifest.artifacts ?? []) {
    if (
      typeof artifact?.path !== "string" ||
      artifact.path.includes("\\") ||
      artifact.path.startsWith("/") ||
      artifact.path.includes("..")
    ) {
      failures.push(`invalid amended artifact path: ${String(artifact?.path)}`);
      continue;
    }
    if (seen.has(artifact.path)) {
      failures.push(`duplicate amended artifact path: ${artifact.path}`);
      continue;
    }
    seen.add(artifact.path);
    const absolute = path.resolve(evidenceRoot, ...artifact.path.split("/"));
    if (!isStrictDescendant(absolute, evidenceRoot) || !fs.existsSync(absolute)) {
      failures.push(`missing amended artifact: ${artifact.path}`);
      continue;
    }
    if (
      fs.statSync(absolute).size !== artifact.bytes ||
      sha256File(absolute) !== artifact.sha256
    ) {
      failures.push(`amended artifact hash or byte drift: ${artifact.path}`);
    }
  }
  if (!seen.has("summary.json")) failures.push("summary.json is not manifested");
  for (const entry of fs.readdirSync(evidenceRoot, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || entry.name === "manifest.json") continue;
    const relative = path
      .relative(evidenceRoot, path.join(entry.parentPath, entry.name))
      .replaceAll("\\", "/");
    if (!seen.has(relative)) {
      failures.push(`unmanifested amended artifact: ${relative}`);
    }
  }
  return seen;
}

export function validatePhase4AmendedCharacterization({
  workspaceRoot,
  evidenceDirectory = null,
  summary: suppliedSummary = null,
  permitPendingIndependentReview = false,
}) {
  const root = path.resolve(workspaceRoot);
  const failures = [];
  const originalRoot = path.join(root, ...ORIGINAL_RELATIVE.split("/"));
  const originalSummaryPath = path.join(originalRoot, "summary.json");
  const originalManifestPath = path.join(originalRoot, "manifest.json");
  const original = readJson(originalSummaryPath);
  const evidenceRoot = evidenceDirectory ? path.resolve(evidenceDirectory) : null;
  if (evidenceRoot && !isStrictDescendant(evidenceRoot, root)) {
    failures.push("amended evidence directory must be a strict workspace descendant");
  }
  const summary =
    suppliedSummary ??
    (evidenceRoot ? readJson(path.join(evidenceRoot, "summary.json")) : null);
  if (!summary) {
    failures.push("amended summary is missing");
    return {
      schema: "latticework.phase4-amended-characterization-validation.v1",
      valid: false,
      finalCounts: {},
      failures,
    };
  }

  if (
    summary.schema !== "latticework.phase4-amended-characterization-summary.v1" ||
    summary.work_id !== "LW-P4-RETEST-001"
  ) {
    failures.push("amended summary identity is invalid");
  }
  if (
    sha256File(originalSummaryPath) !== ORIGINAL_SUMMARY_SHA256 ||
    sha256File(originalManifestPath) !== ORIGINAL_MANIFEST_SHA256 ||
    summary.original?.summary_sha256 !== sha256File(originalSummaryPath) ||
    summary.original?.manifest_sha256 !== sha256File(originalManifestPath)
  ) {
    failures.push("immutable original summary or manifest hash drift");
  }
  const expectedOriginal = new Map(
    original.results.map((row) => [row.id, row.status]),
  );
  const suppliedOriginal = new Map(
    (summary.original?.results ?? []).map((row) => [row.id, row.status]),
  );
  if (
    suppliedOriginal.size !== expectedOriginal.size ||
    [...expectedOriginal].some(
      ([id, status]) => suppliedOriginal.get(id) !== status,
    )
  ) {
    failures.push("original result drift: all 39 IDs and statuses must remain immutable");
  }
  if (!sameMembers(summary.accepted_divergence_ids, ACCEPTED_DIVERGENCES)) {
    failures.push("accepted divergence set drift");
  }
  const retests = Array.isArray(summary.retests) ? summary.retests : [];
  const retestMap = new Map(retests.map((row) => [row.id, row]));
  if (
    retestMap.size !== RETEST_IDS.length ||
    RETEST_IDS.some((id) => !retestMap.has(id))
  ) {
    failures.push("exact eleven-case retest set is required");
  }
  for (const id of RETEST_IDS) {
    const retest = retestMap.get(id);
    if (!retest) continue;
    if (retest.status !== "PASS") failures.push(`${id} retest must be PASS`);
    if (
      retest.profile_cleanup?.proven !== true ||
      retest.profile_cleanup?.deleted !== true ||
      retest.profile_cleanup?.no_reparse !== true
    ) {
      failures.push(`${id} profile cleanup is incomplete`);
    }
    if (retest.external_wire_transmissions !== 0) {
      failures.push(`${id} has external wire transmissions`);
    }
    if (retest.sentinel_leak) failures.push(`${id} leaked a private sentinel`);
    if (
      LOOPBACK_RETEST_IDS.has(id) &&
      retest.loopback_transport_count !== 1
    ) {
      failures.push(`${id} must have exactly one loopback fixture transport`);
    }
  }
  const absenceRequirements = new Map([
    ["P4-A11Y-001A", ["live_region", "ABSENT"]],
    ["P4-CHAT-008A", ["application_timeout", "ABSENT"]],
    ["P4-DEG-001A", ["offline_recovery", "ABSENT"]],
  ]);
  for (const [id, [field, value]] of absenceRequirements) {
    if (retestMap.get(id)?.observed_contract?.[field] !== value) {
      failures.push(`${id} observed_contract.${field} must be ${value}`);
    }
  }

  const listener = summary.listener;
  if (
    listener?.bind !== "127.0.0.1" ||
    listener?.os_selected_port !== true ||
    listener?.run_owned !== true ||
    listener?.fixture_only !== true ||
    listener?.synthetic_only !== true ||
    listener?.external_egress !== false ||
    listener?.started !== true ||
    listener?.stopped !== true ||
    listener?.port_released !== true
  ) {
    failures.push("loopback listener safety or teardown receipt is invalid");
  }
  if (summary.content_scan?.findings !== 0) {
    failures.push("promoted evidence contains a private sentinel or secret");
  }

  const expectedFinal = buildAmendedDispositions(original.results, retests);
  const suppliedFinal = Array.isArray(summary.final_dispositions)
    ? summary.final_dispositions
    : [];
  if (JSON.stringify(suppliedFinal) !== JSON.stringify(expectedFinal)) {
    failures.push("amended final dispositions do not derive from immutable originals");
  }
  const finalCounts = Object.fromEntries(
    ["PASS", "ACCEPTED_DIVERGENCE", "BLOCKED"].map((status) => [
      status,
      expectedFinal.filter((row) => row.final_disposition === status).length,
    ]),
  );
  if (
    finalCounts.PASS !== 31 ||
    finalCounts.ACCEPTED_DIVERGENCE !== 8 ||
    finalCounts.BLOCKED !== 0
  ) {
    failures.push("amended final counts must be 31 PASS, 8 ACCEPTED_DIVERGENCE, 0 BLOCKED");
  }

  const independent = summary.independent_reproduction;
  if (summary.status === "GREEN") {
    if (
      independent?.required !== true ||
      independent?.verdict !== "GREEN" ||
      typeof independent?.receipt !== "string"
    ) {
      failures.push("GREEN requires an independent reproduction receipt");
    }
    if (evidenceRoot && typeof independent?.receipt === "string") {
      const reviewPath = path.join(evidenceRoot, independent.receipt);
      if (!fs.existsSync(reviewPath)) {
        failures.push("independent reproduction receipt is missing");
      } else {
        const review = readJson(reviewPath);
        if (
          review.schema !== "latticework.phase4-amended-independent-review.v1" ||
          review.verdict !== "GREEN" ||
          review.candidate_sha !== summary.candidate_sha ||
          review.original_summary_sha256 !== ORIGINAL_SUMMARY_SHA256 ||
          review.original_manifest_sha256 !== ORIGINAL_MANIFEST_SHA256 ||
          review.clean_start !== true ||
          review.clean_end !== true
        ) {
          failures.push("independent reproduction receipt identity is invalid");
        }
      }
    }
  } else if (
    !permitPendingIndependentReview ||
    summary.status !== "PENDING_INDEPENDENT_REPRODUCTION" ||
    independent?.required !== true ||
    independent?.verdict !== "PENDING"
  ) {
    failures.push("amended status is not a permitted pending or GREEN state");
  }
  if (evidenceRoot) {
    const manifested = validateManifest(evidenceRoot, failures);
    for (const retest of retests) {
      for (const field of [
        "observation_receipt",
        "network_receipt",
        "storage_receipt",
      ]) {
        if (!manifested?.has(retest?.[field])) {
          failures.push(`${retest?.id ?? "unknown"} ${field} is not manifested`);
        }
      }
    }
    for (const field of ["startup_receipt", "teardown_receipt"]) {
      if (!manifested?.has(listener?.[field])) {
        failures.push(`listener ${field} is not manifested`);
      }
    }
    if (
      summary.status === "GREEN" &&
      !manifested?.has(independent?.receipt)
    ) {
      failures.push("independent reproduction receipt is not manifested");
    }
  }

  return {
    schema: "latticework.phase4-amended-characterization-validation.v1",
    valid: failures.length === 0,
    finalCounts,
    failures,
  };
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
    if (command.length || !options.evidence) {
      throw new Error(
        "Usage: validate-phase4-amended-characterization.mjs --evidence PATH [--permit-pending true] [--output PATH]",
      );
    }
    const workspaceRoot = process.cwd();
    const result = validatePhase4AmendedCharacterization({
      workspaceRoot,
      evidenceDirectory: path.resolve(workspaceRoot, options.evidence),
      permitPendingIndependentReview: options["permit-pending"] === "true",
    });
    if (options.output) {
      const output = path.resolve(workspaceRoot, options.output);
      if (!isStrictDescendant(output, workspaceRoot)) {
        throw new Error("output path must be a strict workspace descendant");
      }
      writeJson(output, result);
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
