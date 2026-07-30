#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sha256File } from "./evidence-common.mjs";

const REQUIRED_DOCUMENTS = [
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

const UNRESOLVED_PLACEHOLDER =
  /\[(?:DATE|VALUE|SHA|LINK|TEXT|ENV_LINK|VERSIONS|REVIEW|CLAIM|POPULATE[^\]]*|WRITE_ONLY[^\]]*|TODO|TBD)\]/i;

const REQUIRED_ADR_SECTIONS = [
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

const REQUIRED_ADRS = [
  "docs/decisions/0001-canonical-source-and-build-strategy.md",
  "docs/decisions/0002-typescript-module-architecture.md",
  "docs/decisions/0003-ui-rendering-strategy.md",
];

const REQUIRED_CHECKPOINTS = [
  "runtime/checkpoints/LATEST.json",
  "reengineering/checkpoints/LATEST.json",
];

const CAPABILITY_REGISTRY_PATH = "reengineering/CAPABILITY_PRESERVATION_REGISTRY.json";
const DATA_REGISTRY_PATH = "reengineering/DATA_PRESERVATION_REGISTRY.json";

const REQUIRED_REGISTRY_FIELDS = [
  "id",
  "category",
  "name",
  "slug",
  "baseline_evidence_label",
  "runtime_reachability",
  "compatibility_level",
  "preservation",
  "owner_approval_required_for_retirement",
  "details",
];

const KEY_EVIDENCE_MANIFESTS = [
  "reengineering/evidence/phase-0/LW-P0-001/manifest.json",
  "reengineering/evidence/phase-0/LW-P0-001-environment/manifest.json",
  "reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json",
  "reengineering/evidence/phase-0/LW-P0-002-smoke-history/manifest.json",
  "reengineering/evidence/phase-0/LW-P0-003-browser/manifest.json",
  "reengineering/evidence/phase-0/LW-M0-INV-001/manifest.json",
  "reengineering/evidence/phase-0/LW-M0-BEH-001/manifest.json",
];

const REQUIRED_TRACK_FIELDS = [
  "track",
  "step",
  "note",
  "branch",
  "head",
  "next_cmd",
  "validations",
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toPosixPath(value) {
  return value.replaceAll("\\", "/");
}

function isInsideDirectory(candidate, directory) {
  const relative = path.relative(directory, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function createReport(repoRoot) {
  return {
    schema: "latticework.phase0-control-validation.v1",
    valid: true,
    repo_root: toPosixPath(repoRoot),
    checks: {
      documents: [],
      adrs: [],
      checkpoints: [],
      capability_registry: null,
      data_registry: null,
      evidence_manifests: [],
    },
    failures: [],
  };
}

function addFailure(report, code, relativePath, message) {
  report.failures.push({ code, path: relativePath, message });
}

function resolvePath(repoRoot, relativePath) {
  return path.resolve(repoRoot, relativePath);
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function readJson(report, repoRoot, relativePath, codePrefix) {
  const filePath = resolvePath(repoRoot, relativePath);
  if (!isFile(filePath)) {
    addFailure(report, `${codePrefix}-missing`, relativePath, "Required file is missing.");
    return null;
  }

  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!isPlainObject(value)) {
      addFailure(report, `${codePrefix}-invalid-schema`, relativePath, "Control JSON must be an object.");
      return null;
    }
    return value;
  } catch {
    addFailure(report, `${codePrefix}-invalid-json`, relativePath, "File does not contain valid JSON.");
    return null;
  }
}

function validateDocuments(report, repoRoot) {
  for (const relativePath of REQUIRED_DOCUMENTS) {
    const filePath = resolvePath(repoRoot, relativePath);
    const exists = isFile(filePath);
    const entry = {
      path: relativePath,
      exists,
      bytes: null,
      sha256: null,
      unresolved_placeholder: false,
    };
    report.checks.documents.push(entry);
    if (!exists) {
      addFailure(report, "document-missing", relativePath, "Required canonical document is missing.");
      continue;
    }
    const stats = fs.statSync(filePath);
    entry.bytes = stats.size;
    entry.sha256 = sha256File(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    if (UNRESOLVED_PLACEHOLDER.test(content)) {
      entry.unresolved_placeholder = true;
      addFailure(report, "document-placeholder-unresolved", relativePath, "Living control document contains an unresolved bracket placeholder.");
    }
  }
}

function validateAdrs(report, repoRoot) {
  for (const relativePath of REQUIRED_ADRS) {
    const filePath = resolvePath(repoRoot, relativePath);
    const entry = {
      path: relativePath,
      bytes: null,
      sha256: null,
      status: null,
      missing_sections: [],
    };
    report.checks.adrs.push(entry);

    if (!isFile(filePath)) {
      addFailure(report, "adr-missing", relativePath, "Required Phase 0 ADR is missing.");
      continue;
    }

    const stats = fs.statSync(filePath);
    entry.bytes = stats.size;
    entry.sha256 = sha256File(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const status = content.match(/^\*\*Status:\*\*\s*(.+?)\s*$/m)?.[1]?.trim();
    entry.status = status ?? null;
    if (!status) {
      addFailure(report, "adr-status-missing", relativePath, "ADR must declare a non-empty Status field.");
    }

    for (const section of REQUIRED_ADR_SECTIONS) {
      const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const heading = new RegExp(`^## ${escapedSection}\\s*$`, "m");
      if (!heading.test(content)) {
        entry.missing_sections.push(section);
        addFailure(report, "adr-section-missing", relativePath, `ADR is missing required section: ${section}.`);
      }
    }
  }
}

function validateCheckpoints(report, repoRoot) {
  for (const relativePath of REQUIRED_CHECKPOINTS) {
    const checkpoint = readJson(report, repoRoot, relativePath, "checkpoint");
    const entry = {
      path: relativePath,
      bytes: null,
      sha256: null,
      current_track: null,
      track_count: 0,
    };
    report.checks.checkpoints.push(entry);
    if (!checkpoint) continue;
    const checkpointPath = resolvePath(repoRoot, relativePath);
    entry.bytes = fs.statSync(checkpointPath).size;
    entry.sha256 = sha256File(checkpointPath);

    if (!isPlainObject(checkpoint)) {
      addFailure(report, "checkpoint-invalid-schema", relativePath, "Checkpoint must be a JSON object.");
      continue;
    }

    entry.current_track = checkpoint.current_track ?? null;
    if (!isNonEmptyString(checkpoint.current_track)) {
      addFailure(report, "checkpoint-current-track-invalid", relativePath, "Checkpoint must declare a non-empty current_track.");
    }
    if (!isPlainObject(checkpoint.tracks) || Object.keys(checkpoint.tracks).length === 0) {
      addFailure(report, "checkpoint-tracks-invalid", relativePath, "Checkpoint must declare a non-empty tracks object.");
      continue;
    }

    const trackNames = Object.keys(checkpoint.tracks).sort();
    entry.track_count = trackNames.length;
    if (isNonEmptyString(checkpoint.current_track) && !Object.hasOwn(checkpoint.tracks, checkpoint.current_track)) {
      addFailure(report, "checkpoint-current-track-unresolved", relativePath, "current_track must name an entry in tracks.");
    }

    for (const trackName of trackNames) {
      const track = checkpoint.tracks[trackName];
      if (!isPlainObject(track)) {
        addFailure(report, "checkpoint-track-invalid", relativePath, `Track ${trackName} must be an object.`);
        continue;
      }
      if (track.track !== trackName) {
        addFailure(report, "checkpoint-track-name-mismatch", relativePath, `Track ${trackName} must identify itself in track.`);
      }
      for (const field of REQUIRED_TRACK_FIELDS) {
        if (!(field in track)) {
          addFailure(report, "checkpoint-track-field-missing", relativePath, `Track ${trackName} is missing required field: ${field}.`);
        }
      }
    }
  }
}

function validateCapabilityRegistry(report, repoRoot) {
  const registry = readJson(report, repoRoot, CAPABILITY_REGISTRY_PATH, "capability-registry");
  const entry = {
    path: CAPABILITY_REGISTRY_PATH,
    bytes: null,
    sha256: null,
    row_count: 0,
    duplicate_ids: [],
  };
  report.checks.capability_registry = entry;
  if (!registry) return;
  const registryPath = resolvePath(repoRoot, CAPABILITY_REGISTRY_PATH);
  entry.bytes = fs.statSync(registryPath).size;
  entry.sha256 = sha256File(registryPath);

  if (!isPlainObject(registry)) {
    addFailure(report, "capability-registry-invalid-schema", CAPABILITY_REGISTRY_PATH, "Registry must be a JSON object.");
    return;
  }

  for (const field of ["schema", "baseline_sha", "source_work_id", "evidence_scope", "counts", "rows"]) {
    if (!(field in registry)) {
      addFailure(report, "capability-registry-field-missing", CAPABILITY_REGISTRY_PATH, `Registry is missing required field: ${field}.`);
    }
  }
  if (!Array.isArray(registry.rows)) {
    addFailure(report, "capability-registry-rows-invalid", CAPABILITY_REGISTRY_PATH, "Registry rows must be an array.");
    return;
  }

  entry.row_count = registry.rows.length;
  const seenIds = new Set();
  for (let index = 0; index < registry.rows.length; index += 1) {
    const row = registry.rows[index];
    const rowPath = `${CAPABILITY_REGISTRY_PATH}#rows[${index}]`;
    if (!isPlainObject(row)) {
      addFailure(report, "capability-registry-row-invalid", rowPath, "Registry row must be an object.");
      continue;
    }
    for (const field of REQUIRED_REGISTRY_FIELDS) {
      if (!(field in row)) {
        addFailure(report, "capability-registry-row-field-missing", rowPath, `Registry row is missing required field: ${field}.`);
      }
    }
    if (!isNonEmptyString(row.id)) {
      addFailure(report, "capability-registry-row-id-invalid", rowPath, "Registry row id must be a non-empty string.");
    } else if (seenIds.has(row.id)) {
      entry.duplicate_ids.push(row.id);
      addFailure(report, "capability-registry-duplicate-id", rowPath, `Registry row id is duplicated: ${row.id}.`);
    } else {
      seenIds.add(row.id);
    }
    for (const field of ["category", "name", "slug", "baseline_evidence_label", "runtime_reachability", "compatibility_level", "preservation"]) {
      if (field in row && !isNonEmptyString(row[field])) {
        addFailure(report, "capability-registry-row-value-invalid", rowPath, `Registry row field must be a non-empty string: ${field}.`);
      }
    }
    if ("source" in row && !(isNonEmptyString(row.source) || (Array.isArray(row.source) && row.source.length > 0))) {
      addFailure(report, "capability-registry-row-value-invalid", rowPath, "Registry row source must be a non-empty string or array when present.");
    }
    if ("owner_approval_required_for_retirement" in row && typeof row.owner_approval_required_for_retirement !== "boolean") {
      addFailure(report, "capability-registry-row-value-invalid", rowPath, "Registry row approval flag must be boolean.");
    }
  }

  entry.duplicate_ids.sort();
  if (isPlainObject(registry.counts) && Number.isInteger(registry.counts.total) && registry.counts.total !== registry.rows.length) {
    addFailure(report, "capability-registry-count-mismatch", CAPABILITY_REGISTRY_PATH, "Registry counts.total must equal the number of rows.");
  }
}

function validateDataRegistry(report, repoRoot) {
  const registry = readJson(report, repoRoot, DATA_REGISTRY_PATH, "data-registry");
  const entry = {
    path: DATA_REGISTRY_PATH,
    bytes: null,
    sha256: null,
    row_count: 0,
    duplicate_ids: [],
  };
  report.checks.data_registry = entry;
  if (!registry) return;
  const registryPath = resolvePath(repoRoot, DATA_REGISTRY_PATH);
  entry.bytes = fs.statSync(registryPath).size;
  entry.sha256 = sha256File(registryPath);

  if (!isPlainObject(registry) || !Array.isArray(registry.rows)) {
    addFailure(report, "data-registry-invalid-schema", DATA_REGISTRY_PATH, "Registry must be an object with a rows array.");
    return;
  }

  entry.row_count = registry.rows.length;
  const seenIds = new Set();
  for (let index = 0; index < registry.rows.length; index += 1) {
    const row = registry.rows[index];
    const rowPath = `${DATA_REGISTRY_PATH}#rows[${index}]`;
    if (!isPlainObject(row)) {
      addFailure(report, "data-registry-row-invalid", rowPath, "Registry row must be an object.");
      continue;
    }
    for (const field of [
      "id",
      "kind",
      "name",
      "static_paths",
      "runtime_observed",
      "owner",
      "sensitivity",
      "retention",
      "record_schema",
      "migration_rule",
      "owner_approval_required_for_removal",
      "evidence",
    ]) {
      if (!(field in row)) {
        addFailure(report, "data-registry-row-field-missing", rowPath, `Registry row is missing required field: ${field}.`);
      }
    }
    if (!isNonEmptyString(row.id)) {
      addFailure(report, "data-registry-row-id-invalid", rowPath, "Registry row id must be a non-empty string.");
    } else if (seenIds.has(row.id)) {
      entry.duplicate_ids.push(row.id);
      addFailure(report, "data-registry-duplicate-id", rowPath, `Registry row id is duplicated: ${row.id}.`);
    } else {
      seenIds.add(row.id);
    }
    if (row.migration_rule !== "PRESERVE_UNKNOWN_STORE_RECORD_AND_FIELD") {
      addFailure(report, "data-registry-migration-rule-invalid", rowPath, "Every unresolved row must preserve unknown stores, records, and fields.");
    }
    if (row.owner_approval_required_for_removal !== true) {
      addFailure(report, "data-registry-removal-approval-invalid", rowPath, "Every unresolved row must require owner approval for removal.");
    }
  }

  entry.duplicate_ids.sort();
  if (isPlainObject(registry.counts) && Number.isInteger(registry.counts.total) && registry.counts.total !== registry.rows.length) {
    addFailure(report, "data-registry-count-mismatch", DATA_REGISTRY_PATH, "Registry counts.total must equal the number of rows.");
  }
}

function validateEvidenceManifests(report, repoRoot) {
  for (const relativePath of KEY_EVIDENCE_MANIFESTS) {
    const manifest = readJson(report, repoRoot, relativePath, "evidence-manifest");
    const entry = { path: relativePath, artifact_count: 0, repository_artifacts_checked: 0 };
    report.checks.evidence_manifests.push(entry);
    if (!manifest) continue;

    if (!isPlainObject(manifest)) {
      addFailure(report, "evidence-manifest-invalid-schema", relativePath, "Evidence manifest must be a JSON object.");
      continue;
    }
    if (!Array.isArray(manifest.artifacts)) {
      addFailure(report, "evidence-manifest-artifacts-invalid", relativePath, "Evidence manifest artifacts must be an array.");
      continue;
    }

    entry.artifact_count = manifest.artifacts.length;
    const manifestDirectory = path.dirname(resolvePath(repoRoot, relativePath));
    for (let index = 0; index < manifest.artifacts.length; index += 1) {
      const artifact = manifest.artifacts[index];
      const artifactPath = `${relativePath}#artifacts[${index}]`;
      if (!isPlainObject(artifact) || !isNonEmptyString(artifact.path)) {
        addFailure(report, "evidence-artifact-invalid", artifactPath, "Artifact must declare a non-empty path.");
        continue;
      }
      if (artifact.repository_artifact === false) continue;

      const resolvedArtifact = path.resolve(manifestDirectory, artifact.path);
      entry.repository_artifacts_checked += 1;
      if (!isInsideDirectory(resolvedArtifact, repoRoot)) {
        addFailure(report, "evidence-artifact-outside-repository", artifactPath, "In-repository artifact path resolves outside the repository.");
      } else if (!isFile(resolvedArtifact)) {
        addFailure(report, "evidence-artifact-missing", artifactPath, `Referenced in-repository artifact is missing: ${artifact.path}.`);
      } else {
        const stats = fs.statSync(resolvedArtifact);
        if (Number.isInteger(artifact.bytes) && artifact.bytes !== stats.size) {
          addFailure(report, "evidence-artifact-size-mismatch", artifactPath, `Artifact byte count does not match the manifest: ${artifact.path}.`);
        }
        if (isNonEmptyString(artifact.sha256) && artifact.sha256.toLowerCase() !== sha256File(resolvedArtifact)) {
          addFailure(report, "evidence-artifact-hash-mismatch", artifactPath, `Artifact SHA-256 does not match the manifest: ${artifact.path}.`);
        }
      }
    }
  }
}

export function validatePhase0Control({ repoRoot = process.cwd() } = {}) {
  const normalizedRoot = path.resolve(repoRoot);
  const report = createReport(normalizedRoot);
  validateDocuments(report, normalizedRoot);
  validateAdrs(report, normalizedRoot);
  validateCheckpoints(report, normalizedRoot);
  validateCapabilityRegistry(report, normalizedRoot);
  validateDataRegistry(report, normalizedRoot);
  validateEvidenceManifests(report, normalizedRoot);
  report.failures.sort((left, right) =>
    left.path.localeCompare(right.path) || left.code.localeCompare(right.code) || left.message.localeCompare(right.message),
  );
  report.valid = report.failures.length === 0;
  return report;
}

function parseArgs(argv) {
  if (argv.length === 0) return { repoRoot: process.cwd() };
  if (argv.length === 2 && argv[0] === "--repo-root") return { repoRoot: argv[1] };
  throw new Error("Usage: validate-phase0-control.mjs [--repo-root PATH]");
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  let report;
  try {
    report = validatePhase0Control(parseArgs(process.argv.slice(2)));
  } catch (error) {
    report = {
      schema: "latticework.phase0-control-validation.v1",
      valid: false,
      repo_root: null,
      checks: {},
      failures: [{ code: "validator-usage-error", path: null, message: error.message }],
    };
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}
