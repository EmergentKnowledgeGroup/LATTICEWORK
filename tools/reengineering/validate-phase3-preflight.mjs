import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { isStrictDescendant, parseNamedArgs, writeJson } from "./evidence-common.mjs";

const EXPECTED_BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const EXPECTED_BASE_COMMIT = "6fa553ee3f5c7d1952f7aed836873467c4626068";
const EXPECTED_PACKAGES = [
  {
    name: "@latticework/storage",
    path: "packages/storage",
    dependencies: ["@latticework/contracts"],
    runtime_dependencies: [],
  },
  {
    name: "@latticework/providers",
    path: "packages/providers",
    dependencies: ["@latticework/contracts"],
    runtime_dependencies: [],
  },
];
const EXPECTED_NAMESPACES = [
  "latticework::conversation",
  "latticework::migration",
  "latticework::staging::<operation-id>::conversation",
];
const EXPECTED_FORBIDDEN_PREFIXES = [
  "app.html",
  "index.html",
  "docs/app.html",
  "modules/",
  "docs/modules/",
  "sw.js",
  "docs/sw.js",
  "server.js",
  "server.py",
  "desktop/",
  "worker/",
  "telegram-worker.js",
  "tests/smoke",
  "tests/characterization/",
  "apps/web/",
];
const EXPECTED_OWNED_PATHS = [
  "package.json",
  "package-lock.json",
  "packages/contracts/src/index.ts",
  "packages/contracts/src/storage.ts",
  "packages/contracts/src/provider.ts",
  "packages/storage/",
  "packages/providers/",
  "tests/phase3/",
  "tests/reengineering/phase3-storage-boundary.test.mjs",
  "tests/reengineering/phase3-provider-boundary.test.mjs",
  "tests/reengineering/phase3-evidence-validation.test.mjs",
  "tools/reengineering/run-phase3-verification.ps1",
  "tools/reengineering/verify-phase3-boundary.mjs",
  "tools/reengineering/validate-phase3-evidence.mjs",
  "reengineering/evidence/phase-3/LW-P3-001/",
  "docs/agents/claims/LW-P3-001.md",
  "docs/agents/handoffs/LW-P3-001.md",
  "PROJECT_STATE.md",
  "docs/ARCHITECTURE.md",
  "docs/COMPATIBILITY.md",
  "docs/DATA_AND_STORAGE.md",
  "docs/TESTING_AND_VERIFICATION.md",
  "reengineering/BLOCKERBOARD.md",
  "reengineering/DECISION_LOG.md",
  "reengineering/EXECUTION_CHECKLIST.md",
  "reengineering/MIGRATION_LEDGER.md",
  "runtime/checkpoints/LATEST.md",
  "runtime/checkpoints/LATEST.json",
  "reengineering/checkpoints/LATEST.md",
  "reengineering/checkpoints/LATEST.json",
];
const EXPECTED_GATES = [
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
const EXPECTED_SAFETY = {
  real_user_data: "forbidden",
  real_provider_traffic: "forbidden",
  real_credentials: "forbidden",
  listener: "forbidden",
  cutover: "forbidden",
  legacy_mutation: "forbidden",
  external_egress: "deny-by-test",
  fixtures: "synthetic-only",
  candidate_registration: "none",
  legacy_read_owner: "unchanged",
};
const ALLOWED_PREFLIGHT_SCOPE = new Set([
  "PROJECT_STATE.md",
  "docs/TESTING_AND_VERIFICATION.md",
  "docs/agents/claims/LW-P3-PREFLIGHT-001.md",
  "docs/agents/handoffs/LW-P3-PREFLIGHT-001.md",
  "reengineering/EXECUTION_CHECKLIST.md",
  "reengineering/PHASE3_PREFLIGHT.json",
  "reengineering/PHASE3_PREFLIGHT.md",
  "reengineering/checkpoints/LATEST.json",
  "reengineering/checkpoints/LATEST.md",
  "runtime/checkpoints/LATEST.json",
  "runtime/checkpoints/LATEST.md",
  "tests/reengineering/phase3-decision-packet.test.mjs",
  "tests/reengineering/phase3-preflight.test.mjs",
  "tools/reengineering/validate-phase3-decision-packet.mjs",
  "tools/reengineering/validate-phase3-preflight.mjs",
]);

function readJson(filePath, failures, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function validateAuthority(packet, failures) {
  if (packet?.schema !== "latticework.phase3-preflight.v1") {
    failures.push("preflight schema is invalid");
  }
  if (
    packet?.work_id !== "LW-P3-PREFLIGHT-001" ||
    packet?.status !== "READY_PENDING_ACCEPTANCE"
  ) {
    failures.push("preflight work ID/status is invalid");
  }
  if (
    packet?.baseline_sha !== EXPECTED_BASELINE_SHA ||
    packet?.base_commit !== EXPECTED_BASE_COMMIT
  ) {
    failures.push("preflight baseline/base commit is invalid");
  }
  const authority = packet?.authority;
  if (
    authority?.maintainer_disposition !== "PENDING" ||
    authority?.implementation_authorized !== false ||
    authority?.listener_authorized !== false ||
    authority?.cutover_authorized !== false ||
    !isDeepStrictEqual(authority?.required_accepted_adrs, ["ADR-004", "ADR-005"]) ||
    authority?.optional_proxy_contract_adr !== "ADR-006"
  ) {
    failures.push("implementation authority must remain pending ADR-004/ADR-005 acceptance");
  }
}

function validateScope(packet, failures) {
  if (!isDeepStrictEqual(packet?.packages, EXPECTED_PACKAGES)) {
    failures.push("exact two-package implementation surface is invalid");
  }
  if (!isDeepStrictEqual(packet?.scope?.implementation_owned_paths, EXPECTED_OWNED_PATHS)) {
    failures.push("owned implementation paths are not exact");
  }
  if (!isDeepStrictEqual(packet?.scope?.forbidden_path_prefixes, EXPECTED_FORBIDDEN_PREFIXES)) {
    failures.push("forbidden path prefixes are not exact");
  }
  if (
    !isDeepStrictEqual(packet?.scope?.immutable_external_roots, [
      "Z:\\LATTICEWORK_BASELINE_e7585999",
      "Z:\\FreeLattice",
    ])
  ) {
    failures.push("immutable external roots are not exact");
  }
}

function validateSafety(packet, failures) {
  if (!isDeepStrictEqual(packet?.safety, EXPECTED_SAFETY)) {
    failures.push("safety boundary is not exact");
  }
}

function validateStorage(packet, failures) {
  const storage = packet?.storage;
  const dataset = storage?.dataset;
  if (
    dataset?.id !== "conversation" ||
    dataset?.schema_version !== 1 ||
    dataset?.source_database !== "FreeLatticeDB" ||
    dataset?.source_database_version !== 3 ||
    !isDeepStrictEqual(dataset?.owned_legacy_stores, ["conversations", "messages"]) ||
    !isDeepStrictEqual(dataset?.characterization_only_stores, ["meta", "memoryIndex"]) ||
    dataset?.target_database !== "latticework::conversation" ||
    dataset?.target_activation !== "forbidden"
  ) {
    failures.push("conversation dataset contract is not exact");
  }
  if (!isDeepStrictEqual(storage?.namespaces, EXPECTED_NAMESPACES)) {
    failures.push("candidate storage namespaces are not exact");
  }
  if (
    storage?.unknown_value_policy !==
      "typed-projection-plus-native-structured-clone" ||
    storage?.migration?.mode !== "copy-on-write" ||
    storage?.migration?.legacy_writes !== 0 ||
    storage?.migration?.activation !== "not-part-of-phase3" ||
    storage?.transfer?.hostile_input_staging_required !== true ||
    storage?.transfer?.arbitrary_names_from_input !== false ||
    storage?.transfer?.excluded_dataset_export !== false ||
    storage?.rollback?.journal !== "retain-immutable-terminal-receipt" ||
    storage?.rollback?.legacy !== "untouched"
  ) {
    failures.push("storage migration/transfer/rollback contract is not exact");
  }
}

function validateProviders(packet, failures) {
  const providers = packet?.providers;
  if (
    !isDeepStrictEqual(providers?.adapters, [
      "deterministic-local-mock",
      "deterministic-cloud-mock",
    ]) ||
    providers?.transport !== "in-process-scripted-no-fetch" ||
    providers?.wire_attempts_per_adapter_invocation !== 1 ||
    providers?.identity?.operation_id !== "stable-per-logical-request" ||
    providers?.identity?.attempt_id !== "unique-per-attempt" ||
    providers?.retry?.owner !== "router" ||
    providers?.retry?.default_count !== 0 ||
    providers?.retry?.after_first_delta !== false ||
    providers?.fallback?.implicit !== false ||
    providers?.credentials?.kind !== "synthetic-reference-only" ||
    providers?.credentials?.resolve_after_grant !== true ||
    providers?.credentials?.secret_material !== "never-present" ||
    providers?.terminal_outcome_count !== 1 ||
    providers?.provenance !== "content-free-per-operation-and-attempt" ||
    providers?.legacy_registration !== "none"
  ) {
    failures.push("provider contract is not exact");
  }
}

function validateVerification(packet, failures) {
  if (!isDeepStrictEqual(packet?.verification?.required_gates, EXPECTED_GATES)) {
    failures.push("required verification gates are not exact");
  }
  if (
    packet?.verification?.evidence_path !==
      "reengineering/evidence/phase-3/LW-P3-001" ||
    packet?.verification?.independent_review_required !== true
  ) {
    failures.push("evidence and independent-review gates are invalid");
  }
  if (
    !isDeepStrictEqual(packet?.dependencies?.new_runtime_dependencies, []) ||
    packet?.dependencies?.indexeddb_test_runtime !==
      "native-browser-via-playwright"
  ) {
    failures.push("dependency restraint is invalid");
  }
}

function validateMarkdown(root, failures) {
  let markdown = "";
  try {
    markdown = fs.readFileSync(
      path.join(root, "reengineering", "PHASE3_PREFLIGHT.md"),
      "utf8",
    );
  } catch (error) {
    failures.push(`Phase 3 preflight Markdown cannot be read: ${error.message}`);
    return;
  }
  const required = [
    "**Status:** READY PENDING MAINTAINER ACCEPTANCE",
    "- implementation authorized: false",
    "- real user data: forbidden",
    "- real provider traffic: forbidden",
    "- real credentials: forbidden",
    "- listener: forbidden",
    "- cutover: forbidden",
    "- legacy mutation: forbidden",
    "- stable dataset ID: `conversation`",
    "- dataset schema version: `1`",
    "- candidate namespace: `latticework::conversation`",
    "- adapters: deterministic local mock and deterministic cloud mock",
    "- default retry count: `0`",
    "No new runtime dependency is permitted.",
    "`reengineering/evidence/phase-3/LW-P3-001/`",
  ];
  for (const fragment of required) {
    if (!markdown.includes(fragment)) {
      failures.push(`Markdown projection is missing exact fragment: ${fragment}`);
    }
  }
}

function runGit(root, args, failures, label) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    failures.push(`${label} failed: ${result.stderr?.trim() || "unknown Git error"}`);
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateGitScope(root, failures) {
  const ancestry = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", EXPECTED_BASE_COMMIT, "HEAD"],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
  if (ancestry.status !== 0) {
    failures.push(`base commit ${EXPECTED_BASE_COMMIT} is not an ancestor of HEAD`);
    return;
  }
  const changed = runGit(
    root,
    ["diff", "--name-only", EXPECTED_BASE_COMMIT, "--"],
    failures,
    "changed-path query",
  );
  const untracked = runGit(
    root,
    ["ls-files", "--others", "--exclude-standard"],
    failures,
    "untracked-path query",
  );
  for (const relativePath of new Set([...changed, ...untracked])) {
    if (relativePath.startsWith("runtime/tmp/")) continue;
    if (!ALLOWED_PREFLIGHT_SCOPE.has(relativePath)) {
      failures.push(`preflight-only scope contains an unauthorized path: ${relativePath}`);
    }
  }
}

export function validatePhase3Preflight({
  workspaceRoot,
  packetPath = "reengineering/PHASE3_PREFLIGHT.json",
  checkGitScope = true,
}) {
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, packetPath);
  if (!isStrictDescendant(resolved, root)) {
    throw new Error("preflight path must be a strict workspace descendant");
  }
  const failures = [];
  const packet = readJson(resolved, failures, "Phase 3 preflight");
  if (packet) {
    validateAuthority(packet, failures);
    validateScope(packet, failures);
    validateSafety(packet, failures);
    validateStorage(packet, failures);
    validateProviders(packet, failures);
    validateVerification(packet, failures);
  }
  validateMarkdown(root, failures);
  if (checkGitScope) validateGitScope(root, failures);
  return {
    schema: "latticework.phase3-preflight-validation.v1",
    valid: failures.length === 0,
    status: packet?.status ?? null,
    implementationAuthorized:
      packet?.authority?.implementation_authorized ?? null,
    gitScopeChecked: checkGitScope,
    gitScopeBase: checkGitScope ? EXPECTED_BASE_COMMIT : null,
    checks: {
      packages: EXPECTED_PACKAGES.length,
      requiredAcceptedAdrs: 2,
      namespaces: EXPECTED_NAMESPACES.length,
      requiredGates: EXPECTED_GATES.length,
      forbiddenPathPrefixes: EXPECTED_FORBIDDEN_PREFIXES.length,
    },
    failures,
  };
}

function isMain() {
  return (
    process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  );
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length > 0) throw new Error("Unexpected command arguments");
    if (
      Object.prototype.hasOwnProperty.call(options, "check-git-scope") ||
      Object.prototype.hasOwnProperty.call(options, "base-sha")
    ) {
      throw new Error(
        "canonical CLI validation always checks Git scope from the preflight base commit",
      );
    }
    const workspaceRoot = options["workspace-root"]
      ? path.resolve(options["workspace-root"])
      : process.cwd();
    const output = options.output
      ? path.resolve(workspaceRoot, options.output)
      : null;
    if (output && !isStrictDescendant(output, workspaceRoot)) {
      throw new Error("output path must be a strict workspace descendant");
    }
    const result = validatePhase3Preflight({ workspaceRoot });
    if (output) writeJson(output, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
