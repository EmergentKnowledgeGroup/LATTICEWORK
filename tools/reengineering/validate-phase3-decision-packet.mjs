import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { isStrictDescendant, parseNamedArgs, writeJson } from "./evidence-common.mjs";

const EXPECTED_BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const EXPECTED_BASE_COMMIT = "6704dd502a140fce2fe8e06f8db336d0bd3839a5";
const BASELINE_PRESERVATION_IDS_PATH =
  "reengineering/PHASE3_BASELINE_PRESERVATION_IDS.json";
const EXPECTED_BASELINE_IDS_SHA256 =
  "113999f75b413ddd9dc9bcb60bb57ab05085c25e3d4e57bb4307c7ef760d4aa6";
const REQUIRED_ADRS = [
  {
    id: "ADR-004",
    number: "0004",
    path: "docs/decisions/0004-versioned-storage-and-migration.md",
    requiredFor: ["LW-P3-001"],
  },
  {
    id: "ADR-005",
    number: "0005",
    path: "docs/decisions/0005-provider-abstraction-and-provenance.md",
    requiredFor: ["LW-P3-001"],
  },
  {
    id: "ADR-006",
    number: "0006",
    path: "docs/decisions/0006-optional-local-proxy-security.md",
    requiredFor: ["LW-P7-001"],
  },
];
const REQUIRED_BLOCKERS = ["LW-BLK-005", "LW-BLK-006", "LW-BLK-007"];
const REQUIRED_INVARIANTS = Array.from(
  { length: 12 },
  (_, index) => `P3-INV-${String(index + 1).padStart(3, "0")}`,
);
const REQUIRED_ADR_HEADINGS = [
  "## Context",
  "## Decision",
  "## Invariants",
  "## Alternatives considered",
  "## Consequences",
  "## Compatibility impact",
  "## Data and migration impact",
  "## Security and privacy impact",
  "## Verification plan",
  "## Rollback",
  "## Review date",
];
const EXPECTED_DECISION_CONTRACTS = {
  storage: {
    candidate_namespace_pattern: "latticework::<dataset-id>",
    migration_database: "latticework::migration",
    staging_namespace_pattern:
      "latticework::staging::<operation-id>::<dataset-id>",
    first_dataset: {
      id: "conversation",
      schema_version: 1,
      target_database: "latticework::conversation",
      owned_legacy_stores: ["conversations", "messages"],
      fixture_characterization_only_stores: ["meta", "memoryIndex"],
      real_data_authorized: false,
    },
    migration_mode: "copy-on-write-journaled",
    unknown_preservation_scope: "authorized-in-scope-datasets-only",
    excluded_dataset_classes: [
      "credentials",
      "device-derived-key-material",
      "identity-and-cryptography",
      "wallet-and-chain",
      "session-only-tokens",
      "cache-storage",
      "desktop-state",
      "remote-state",
    ],
    excluded_dataset_handling: "legacy-parse-only-no-copy-or-export-writer",
    rollback: {
      candidate_action:
        "close-then-delete-or-quarantine-exact-dataset-namespace",
      journal_action: "retain-immutable-terminal-receipt",
      legacy_action: "untouched",
    },
    import: {
      promotion: "complete-validation-before-verified-promotion",
      cleanup: "journaled-delete-or-quarantine",
    },
    integrity: {
      synthetic_fixtures: "ordinary-content-derived-hashes-permitted",
      real_data:
        "non-exported-keyed-verification-or-opaque-local-migration-id",
      export_content_derived_digests: false,
    },
  },
  provider: {
    seams: ["adapter", "router", "credential-source", "egress-policy"],
    phase3_endpoints: "deterministic-mocks-only",
    real_credentials_authorized: false,
    real_provider_traffic_authorized: false,
    wire_attempts_per_adapter_invocation: 1,
    retry_owner: "router",
    default_retry_count: 0,
    post_dispatch_retry:
      "proven-provider-idempotency-or-explicit-caller-authorization",
    identity: {
      operation_id: "stable-per-logical-request",
      attempt_id: "unique-per-wire-attempt",
    },
    fallback: "explicit-visible-consented",
    cross_trust_fallback:
      "forbidden-without-explicit-visible-consent",
    retry_after_first_delta: false,
    terminal_outcome_count: 1,
    credential_resolution:
      "immutable-egress-grant-before-resolution-with-exact-binding-match",
    credential_binding_fields: [
      "provider-id",
      "adapter-id-and-version",
      "exact-origin",
      "trust-class",
      "authentication-scheme",
    ],
    cancellation_scopes: [
      "transport-aborted",
      "provider-cancel-acknowledged",
    ],
    provenance: "required-content-free-per-operation-and-attempt",
  },
  optional_proxy: {
    phase3_listener_authorized: false,
    enabled_by_default: false,
    default_bind: ["127.0.0.1", "::1"],
    lan_bind_authorized: false,
    authentication: "paired-scoped-expiring-bearer-session",
    unauthenticated_routes: {
      health: "content-free-read-only",
      "pairing-bootstrap":
        "exact-origin-non-get-single-use-short-lived-code-rate-limited-no-upstream-sanitized",
    },
    request_identity: {
      operation_id: "stable-across-authorized-retry",
      attempt_id: "unique-replay-rejected-for-token-lifetime",
    },
    origin_policy: "exact-allowlist",
    route_policy: "exact-method-and-path-allowlist",
    upstream_policy: "parsed-trust-classified-explicit-allowlist",
    diagnostics: "content-free",
    broader_trust_gate: "ADR-012",
  },
};
const EXPECTED_BLOCKER_CONDITIONS = {
  "LW-BLK-005":
    "ADR-004 accepted and the expanded inventory plus synthetic migration fixtures independently verified",
  "LW-BLK-006":
    "ADR-006 and ADR-012 accepted with gateway/LAN/worker/peer/Telegram security tests",
  "LW-BLK-007":
    "ADR-009 accepted after parity, migration, rollback, release evidence, and verbatim owner approval naming affected capability IDs",
};
const EXPECTED_INVARIANT_STATEMENTS = {
  "P3-INV-001":
    "Legacy data and storage schemas remain authoritative and untouched during Phase 3.",
  "P3-INV-002":
    "All 252 baseline preservation-registry rows and every newly discovered row remain unknown-preserve obligations.",
  "P3-INV-003":
    "Migration is backup-first or copy-on-write and never an in-place legacy rewrite.",
  "P3-INV-004":
    "Migration steps are versioned, adjacent, idempotent, resumable, and interruption-safe.",
  "P3-INV-005":
    "Unknown records, keys, fields, nested values, and falsey values in an authorized in-scope dataset survive copy, export, restore, and rollback; excluded datasets remain untouched and unexported.",
  "P3-INV-006":
    "Migrated UI and feature view code never access durable browser or platform storage directly.",
  "P3-INV-007":
    "Provider selection and fallback are explicit; no prompt is silently resent to another provider.",
  "P3-INV-008":
    "Every terminal provider result has content-free provenance and exactly one terminal outcome.",
  "P3-INV-009":
    "Features use credential references; secrets and private content never enter logs, evidence, fixtures, or build output.",
  "P3-INV-010":
    "Any future local proxy is optional, disabled by default, loopback-only, authenticated, origin-allowlisted, and not an open proxy.",
  "P3-INV-011":
    "Phase 3 provider/storage tests use synthetic fixtures and deterministic mocks with external egress denied.",
  "P3-INV-012":
    "No default route, deployment mirror, service worker, legacy capability, or cutover changes are authorized.",
};
const EXPECTED_PERMITTED = [
  "Add strict storage and provider contracts",
  "Add a namespaced candidate repository and journal against synthetic fixtures",
  "Add deterministic local and cloud mock provider adapters",
  "Add redacted diagnostics and provenance",
  "Add staged import/export and migration verification tooling",
  "Create evidence only under reengineering/evidence/phase-3/LW-P3-001",
];
const EXPECTED_FORBIDDEN = [
  "Read or mutate real user data",
  "Use real credentials or call a real provider",
  "Change legacy storage versions, values, routes, modules, gateways, workers, service workers, desktop code, or deployment mirrors",
  "Start a local proxy or expose a LAN listener",
  "Migrate Chat or any legacy feature",
  "Retire a capability or cut over a default route",
];
const REQUIRED_ADR_CLAUSES = {
  "ADR-004": [
    "The first proposed implementation dataset has stable ID `conversation`, `schemaVersion: 1`, and target database `latticework::conversation`.",
    "`latticework::staging::<operation-id>::<dataset-id>`",
    "They are unconditionally excluded from Phase 3 copy/export writers.",
    "Ordinary content-derived hashes are permitted only for synthetic fixtures.",
    "The shared migration database is never deleted.",
    "An immutable terminal `rolled-back` or `discarded` journal receipt",
  ],
  "ADR-005": [
    "One adapter invocation performs exactly one wire attempt.",
    "The default retry count is zero.",
    "`CredentialSource.resolve(ref, grant)`",
    "`transport-aborted` or `provider-cancel-acknowledged`",
  ],
  "ADR-006": [
    "Only two narrowly scoped unauthenticated routes exist: a content-free health read and pairing bootstrap.",
    "Pairing bootstrap uses an exact configured Origin, a non-GET method, a single-use short-lived code",
    "every upstream attempt includes a unique `attempt_id`",
  ],
};
const ALLOWED_SCOPE_PATHS = new Set([
  "PROJECT_STATE.md",
  "ROADMAP.md",
  "docs/ARCHITECTURE.md",
  "docs/COMPATIBILITY.md",
  "docs/DATA_AND_STORAGE.md",
  "docs/KNOWN_LIMITATIONS.md",
  "docs/TESTING_AND_VERIFICATION.md",
  "docs/agents/claims/LW-P3-DEC-001.md",
  "docs/agents/handoffs/LW-P3-DEC-001.md",
  "docs/decisions/README.md",
  "docs/decisions/0004-versioned-storage-and-migration.md",
  "docs/decisions/0005-provider-abstraction-and-provenance.md",
  "docs/decisions/0006-optional-local-proxy-security.md",
  "reengineering/BLOCKERBOARD.md",
  "reengineering/DATA_INVENTORY.md",
  "reengineering/DECISION_LOG.md",
  "reengineering/EXECUTION_CHECKLIST.md",
  "reengineering/MIGRATION_LEDGER.md",
  "reengineering/PHASE3_BASELINE_PRESERVATION_IDS.json",
  "reengineering/PHASE3_DECISION_PACKET.json",
  "reengineering/PHASE3_DECISION_PACKET.md",
  "reengineering/SECURITY_BOUNDARY_MAP.md",
  "reengineering/checkpoints/LATEST.json",
  "reengineering/checkpoints/LATEST.md",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/README.md",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/independent-review.md",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/manifest.json",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/controls/manifest.json",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/controls/stderr.log",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/controls/stdout.log",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/focused/manifest.json",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/focused/stderr.log",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/focused/stdout.log",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/validator/manifest.json",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/validator/stderr.log",
  "reengineering/evidence/phase-3/LW-P3-DEC-001/commands/validator/stdout.log",
  "runtime/checkpoints/LATEST.json",
  "runtime/checkpoints/LATEST.md",
  "tests/reengineering/phase3-decision-packet.test.mjs",
  "tools/reengineering/validate-phase3-decision-packet.mjs",
]);
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:PRIVATE|SECRET)_(?:SENTINEL|TOKEN|KEY)(?:_[A-Z0-9_]+)?\b/,
];

function readJson(filePath, failures, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function readText(filePath, failures, label) {
  try {
    return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    failures.push(`${label} cannot be read: ${error.message}`);
    return "";
  }
}

function runGit(workspaceRoot, args, failures, label) {
  const result = spawnSync("git", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    failures.push(`${label} failed: ${result.stderr?.trim() || "unknown Git error"}`);
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((item) => item.trim().replaceAll("\\", "/"))
    .filter(Boolean);
}

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function renderStructuredContractSummary(packet) {
  const storage = packet?.decision_contracts?.storage;
  const provider = packet?.decision_contracts?.provider;
  const proxy = packet?.decision_contracts?.optional_proxy;
  if (!storage || !provider || !proxy) return "";
  const dataset = storage.first_dataset;
  return [
    "<!-- BEGIN PHASE3 STRUCTURED CONTRACT SUMMARY -->",
    `- Storage: dataset \`${dataset.id}\` schema \`${dataset.schema_version}\` targets \`${dataset.target_database}\`; owned legacy stores are ${dataset.owned_legacy_stores.map((item) => `\`${item}\``).join(", ")}; staging uses \`${storage.staging_namespace_pattern}\`.`,
    `- Exclusions: ${storage.excluded_dataset_classes.join(", ")} are legacy-parse-only with no Phase 3 copy or export writer.`,
    "- Rollback: close then delete or quarantine only the exact candidate dataset namespace; retain an immutable terminal journal receipt; leave legacy state untouched.",
    `- Provider: deterministic mocks only; one wire attempt per adapter invocation; router-owned zero-default retry; stable operation ID and unique attempt ID; no real credentials or traffic.`,
    "- Credentials: an immutable egress grant and exact provider, adapter, origin, trust-class, and authentication-scheme binding are required before resolution.",
    "- Proxy: no Phase 3 listener; disabled by default; loopback only; pairing bootstrap is exact-origin, non-GET, single-use, short-lived, rate-limited, upstream-free, and sanitized.",
    "<!-- END PHASE3 STRUCTURED CONTRACT SUMMARY -->",
  ].join("\n");
}

function validateStructuredContracts(packet, failures) {
  if (!isDeepStrictEqual(packet?.decision_contracts, EXPECTED_DECISION_CONTRACTS)) {
    failures.push("decision_contracts must match the exact Phase 3 safety contract");
  }
  const execution = packet?.phase3_execution_after_acceptance;
  if (!isDeepStrictEqual(execution?.permitted, EXPECTED_PERMITTED)) {
    failures.push("Phase 3 permitted actions must match the exact bounded list");
  }
  if (!isDeepStrictEqual(execution?.still_forbidden, EXPECTED_FORBIDDEN)) {
    failures.push("Phase 3 forbidden actions must match the exact safety list");
  }
}

function validatePacketMarkdown(workspaceRoot, packet, failures) {
  const markdown = readText(
    path.join(workspaceRoot, "reengineering", "PHASE3_DECISION_PACKET.md"),
    failures,
    "Phase 3 decision packet Markdown",
  );
  if (!markdown) return;
  const expectedSummary = renderStructuredContractSummary(packet);
  if (!expectedSummary || !markdown.includes(expectedSummary)) {
    failures.push(
      "Phase 3 decision packet Markdown must contain the exact structured-contract projection",
    );
  }
  if (!markdown.includes("**Status:** PROPOSED — MAINTAINER DISPOSITION REQUIRED")) {
    failures.push("Phase 3 decision packet Markdown must remain proposal-only");
  }
  if (!markdown.includes(`**Base commit:** \`${packet.base_commit}\``)) {
    failures.push("Phase 3 decision packet Markdown base commit is out of sync");
  }
}

function validateAdrs(workspaceRoot, packet, failures) {
  const decisions = Array.isArray(packet?.decision_records)
    ? packet.decision_records
    : [];
  if (decisions.length !== REQUIRED_ADRS.length) {
    failures.push("decision_records must contain exactly ADR-004 through ADR-006");
  }

  for (const required of REQUIRED_ADRS) {
    const decision = decisions.find((item) => item?.id === required.id);
    if (!decision) {
      failures.push(`missing decision record ${required.id}`);
      continue;
    }
    if (
      decision.path !== required.path ||
      decision.status !== "Proposed" ||
      !isDeepStrictEqual(decision.required_for, required.requiredFor)
    ) {
      failures.push(`${required.id} packet path/status must match the Proposed ADR`);
    }

    const adrPath = path.join(workspaceRoot, required.path);
    const text = readText(adrPath, failures, required.id);
    if (!text) continue;
    if (!text.startsWith(`# ADR ${required.number} `) && !text.startsWith(`# ADR ${required.number} —`)) {
      failures.push(`${required.id} title/number is invalid`);
    }
    const status = text.match(/^\*\*Status:\*\*\s*(.+)$/m)?.[1]?.trim();
    if (status !== "Proposed") {
      failures.push(`${required.id} status must remain Proposed without a maintainer disposition`);
    }
    if (!/^\*\*Decision receipt:\*\*\s+\*\*PENDING\*\*/m.test(text)) {
      failures.push(`${required.id} must contain a PENDING decision receipt`);
    }
    if (/^\*\*Accepted:\*\*/m.test(text)) {
      failures.push(`${required.id} cannot contain an Accepted date while Proposed`);
    }
    for (const heading of REQUIRED_ADR_HEADINGS) {
      if (!text.includes(heading)) failures.push(`${required.id} is missing ${heading}`);
    }
    const normalizedText = normalizeWhitespace(text);
    for (const clause of REQUIRED_ADR_CLAUSES[required.id] ?? []) {
      if (!normalizedText.includes(normalizeWhitespace(clause))) {
        failures.push(`${required.id} is missing required safety clause: ${clause}`);
      }
    }
    if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
      failures.push(`${required.id} contains secret-like text`);
    }
  }
}

function validateRegistry(workspaceRoot, packet, failures) {
  const registry = readJson(
    path.join(workspaceRoot, "reengineering", "DATA_PRESERVATION_REGISTRY.json"),
    failures,
    "data preservation registry",
  );
  const baseline = readJson(
    path.join(workspaceRoot, BASELINE_PRESERVATION_IDS_PATH),
    failures,
    "Phase 3 baseline preservation IDs",
  );
  const rows = Array.isArray(registry?.rows) ? registry.rows : [];
  if (registry?.schema !== "latticework.data-preservation-registry.v1") {
    failures.push("data preservation registry schema is invalid");
  }
  const baselineIds = Array.isArray(baseline?.ids) ? baseline.ids : [];
  const baselineHash = crypto
    .createHash("sha256")
    .update(baselineIds.join("\n"))
    .digest("hex");
  if (
    baseline?.schema !== "latticework.phase3-baseline-preservation-ids.v1" ||
    baseline?.baseline_commit !== EXPECTED_BASE_COMMIT ||
    baseline?.source_registry_schema !== registry?.schema ||
    baseline?.baseline_total !== 252 ||
    baselineIds.length !== 252 ||
    new Set(baselineIds).size !== baselineIds.length ||
    baseline?.ids_sha256 !== EXPECTED_BASELINE_IDS_SHA256 ||
    baselineHash !== EXPECTED_BASELINE_IDS_SHA256
  ) {
    failures.push("pinned Phase 3 baseline preservation ID set is invalid");
  }
  const rowIds = new Set();
  const computedKindCounts = {};
  let computedRuntimeObserved = 0;
  for (const row of rows) {
    if (!row?.id || rowIds.has(row.id)) failures.push("data preservation row IDs must be unique");
    rowIds.add(row?.id);
    if (typeof row?.kind !== "string" || row.kind.length === 0) {
      failures.push(`data preservation row lacks kind: ${row?.id ?? "unknown"}`);
    } else {
      computedKindCounts[row.kind] = (computedKindCounts[row.kind] ?? 0) + 1;
    }
    if (row?.runtime_observed === true) computedRuntimeObserved += 1;
    if (row?.migration_rule !== "PRESERVE_UNKNOWN_STORE_RECORD_AND_FIELD") {
      failures.push(`data preservation row weakens unknown preservation: ${row?.id ?? "unknown"}`);
    }
    if (row?.owner_approval_required_for_removal !== true) {
      failures.push(`data preservation row lacks removal approval gate: ${row?.id ?? "unknown"}`);
    }
  }
  for (const baselineId of baselineIds) {
    if (!rowIds.has(baselineId)) {
      failures.push(`data preservation registry removed pinned baseline obligation: ${baselineId}`);
    }
  }
  if (
    registry?.counts?.total !== rows.length ||
    registry?.counts?.runtime_observed !== computedRuntimeObserved ||
    !isDeepStrictEqual(registry?.counts?.by_kind, computedKindCounts)
  ) {
    failures.push("data preservation registry counts must be computed from live rows");
  }

  const preservation = packet?.data_preservation;
  if (
    preservation?.registry_schema !== registry?.schema ||
    preservation?.baseline_ids_path !== BASELINE_PRESERVATION_IDS_PATH ||
    preservation?.baseline_minimum_obligations !== 252 ||
    preservation?.registry_may_expand !== true ||
    preservation?.total_obligations !== rows.length ||
    preservation?.unknown_preserve_obligations !== rows.length ||
    preservation?.owner_approval_required_for_removal !== rows.length ||
    preservation?.runtime_observed !== computedRuntimeObserved ||
    !isDeepStrictEqual(preservation?.by_kind, computedKindCounts) ||
    preservation?.first_candidate_dataset !== "conversation" ||
    preservation?.first_candidate_schema_version !== 1
  ) {
    failures.push(
      "packet preservation metadata must match the live registry and pinned 252-row floor",
    );
  }
  return rows.length;
}

function validateBlockers(workspaceRoot, packet, failures) {
  const blockerboard = readText(
    path.join(workspaceRoot, "reengineering", "BLOCKERBOARD.md"),
    failures,
    "blockerboard",
  );
  const packetBlockers = Array.isArray(packet?.blockers) ? packet.blockers : [];
  if (packetBlockers.length !== REQUIRED_BLOCKERS.length) {
    failures.push("packet must list exactly LW-BLK-005 through LW-BLK-007");
  }
  for (const blockerId of REQUIRED_BLOCKERS) {
    const line = blockerboard
      .split(/\r?\n/)
      .find((candidate) => candidate.includes(`\`${blockerId}\``));
    if (!line || !/\|\s*OPEN\s*\|\s*$/.test(line)) {
      failures.push(`${blockerId} must remain OPEN in the blockerboard`);
    }
    const packetBlocker = packetBlockers.find((item) => item?.id === blockerId);
    if (
      !packetBlocker ||
      packetBlocker.status !== "OPEN" ||
      packetBlocker.unblock_condition !== EXPECTED_BLOCKER_CONDITIONS[blockerId]
    ) {
      failures.push(`${blockerId} must remain OPEN in the decision packet`);
    }
  }
}

function validateInvariants(packet, failures) {
  const invariants = Array.isArray(packet?.invariants) ? packet.invariants : [];
  const ids = new Set(invariants.map((item) => item?.id));
  if (invariants.length !== REQUIRED_INVARIANTS.length || ids.size !== invariants.length) {
    failures.push("packet must contain exactly 12 unique required invariants");
  }
  for (const invariantId of REQUIRED_INVARIANTS) {
    if (!ids.has(invariantId)) failures.push(`missing required invariant ${invariantId}`);
  }
  for (const invariant of invariants) {
    if (invariant?.statement !== EXPECTED_INVARIANT_STATEMENTS[invariant?.id]) {
      failures.push(`invariant ${invariant?.id ?? "unknown"} statement is not exact`);
    }
  }
}

function validateAuthority(packet, failures) {
  if (packet?.schema !== "latticework.phase3-decision-packet.v1") {
    failures.push("packet schema must be latticework.phase3-decision-packet.v1");
  }
  if (packet?.work_id !== "LW-P3-DEC-001" || packet?.status !== "PROPOSED") {
    failures.push("packet work ID/status must be LW-P3-DEC-001 / PROPOSED");
  }
  if (
    packet?.baseline_sha !== EXPECTED_BASELINE_SHA ||
    packet?.base_commit !== EXPECTED_BASE_COMMIT
  ) {
    failures.push("packet baseline/base commit identity is invalid");
  }
  if (packet?.authority?.maintainer_disposition !== "PENDING") {
    failures.push("maintainer disposition must remain PENDING");
  }
  if (packet?.authority?.implementation_authorized !== false) {
    failures.push("implementation_authorized must remain false without a maintainer disposition");
  }
  if (
    packet?.authority?.runtime_semantics_changed !== false ||
    packet?.authority?.cutover_authorized !== false
  ) {
    failures.push("runtime semantics and cutover must remain unauthorized");
  }
  const required = packet?.phase3_execution_after_acceptance?.required_accepted_adrs;
  if (
    !Array.isArray(required) ||
    required.length !== 2 ||
    required[0] !== "ADR-004" ||
    required[1] !== "ADR-005"
  ) {
    failures.push("Phase 3 execution must require accepted ADR-004 and ADR-005");
  }
  const futures = Array.isArray(packet?.future_decisions)
    ? packet.future_decisions
    : [];
  for (const id of ["ADR-009", "ADR-012"]) {
    const future = futures.find((item) => item?.id === id);
    if (
      !future ||
      future.status !== "NOT_STARTED" ||
      future.owner_approval_required !== true
    ) {
      failures.push(`${id} must remain a not-started owner-approval gate`);
    }
  }
  validateStructuredContracts(packet, failures);
}

function validateGitScope(workspaceRoot, baseSha, failures) {
  const ancestry = spawnSync("git", ["merge-base", "--is-ancestor", baseSha, "HEAD"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (ancestry.status !== 0) {
    failures.push(`base commit ${baseSha} is not an ancestor of HEAD`);
    return;
  }
  const changed = runGit(
    workspaceRoot,
    ["diff", "--name-only", baseSha, "--"],
    failures,
    "changed-path query",
  );
  const untracked = runGit(
    workspaceRoot,
    ["ls-files", "--others", "--exclude-standard"],
    failures,
    "untracked-path query",
  );
  const scope = new Set([...changed, ...untracked]);
  for (const relativePath of scope) {
    if (relativePath.startsWith("runtime/tmp/")) continue;
    if (!ALLOWED_SCOPE_PATHS.has(relativePath)) {
      failures.push(`Phase 3 decision-only scope contains an unauthorized path: ${relativePath}`);
    }
  }
}

export function validatePhase3DecisionPacket({
  workspaceRoot,
  packetPath = "reengineering/PHASE3_DECISION_PACKET.json",
  checkGitScope = true,
  baseSha,
}) {
  const root = path.resolve(workspaceRoot);
  const resolvedPacket = path.resolve(root, packetPath);
  if (!isStrictDescendant(resolvedPacket, root)) {
    throw new Error("decision packet path must be a strict workspace descendant");
  }
  const failures = [];
  const packet = readJson(resolvedPacket, failures, "Phase 3 decision packet");
  if (packet) {
    validateAuthority(packet, failures);
    validateAdrs(root, packet, failures);
    validatePacketMarkdown(root, packet, failures);
    validateBlockers(root, packet, failures);
    validateInvariants(packet, failures);
  }
  const preservationRows = packet ? validateRegistry(root, packet, failures) : 0;
  const gitScopeBase =
    baseSha ?? packet?.base_commit ?? EXPECTED_BASE_COMMIT;
  if (checkGitScope) validateGitScope(root, gitScopeBase, failures);

  return {
    schema: "latticework.phase3-decision-packet-validation.v1",
    valid: failures.length === 0,
    status: packet?.status ?? null,
    implementation_authorized:
      packet?.authority?.implementation_authorized ?? null,
    git_scope_checked: checkGitScope,
    git_scope_base: checkGitScope ? gitScopeBase : null,
    checks: {
      adrs: REQUIRED_ADRS.length,
      blockers: REQUIRED_BLOCKERS.length,
      preservation_rows: preservationRows,
      required_invariants: REQUIRED_INVARIANTS.length,
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
        "canonical CLI validation always checks Git scope from the packet base commit",
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
    const result = validatePhase3DecisionPacket({
      workspaceRoot,
      packetPath:
        options.packet ?? "reengineering/PHASE3_DECISION_PACKET.json",
      checkGitScope: true,
    });
    if (output) writeJson(output, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
