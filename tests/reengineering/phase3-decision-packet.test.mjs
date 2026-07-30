import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase3DecisionPacket } from "../../tools/reengineering/validate-phase3-decision-packet.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEST_ROOT = path.join(REPO_ROOT, "runtime", "tmp", "phase3-decision-packet-tests");
const REQUIRED_FILES = [
  "reengineering/PHASE3_DECISION_PACKET.json",
  "reengineering/PHASE3_DECISION_PACKET.md",
  "reengineering/PHASE3_BASELINE_PRESERVATION_IDS.json",
  "reengineering/BLOCKERBOARD.md",
  "reengineering/DATA_PRESERVATION_REGISTRY.json",
  "docs/decisions/0004-versioned-storage-and-migration.md",
  "docs/decisions/0005-provider-abstraction-and-provenance.md",
  "docs/decisions/0006-optional-local-proxy-security.md",
];

function copyFile(relativePath, fixtureRoot) {
  const destination = path.join(fixtureRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, relativePath), destination);
}

function createFixture(name) {
  const fixtureRoot = path.join(TEST_ROOT, name);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  for (const relativePath of REQUIRED_FILES) copyFile(relativePath, fixtureRoot);
  return fixtureRoot;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(root, relativePath, value) {
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

test.after(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});

test("canonical Phase 3 decision packet is complete, proposal-only, and scope-safe", () => {
  const result = validatePhase3DecisionPacket({
    workspaceRoot: REPO_ROOT,
    checkGitScope: true,
  });

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.deepEqual(result.checks, {
    adrs: 3,
    blockers: 3,
    preservation_rows: 252,
    required_invariants: 12,
  });
  assert.equal(result.status, "PROPOSED");
  assert.equal(result.implementation_authorized, false);
  assert.equal(result.git_scope_checked, true);
  assert.equal(
    result.git_scope_base,
    "6704dd502a140fce2fe8e06f8db336d0bd3839a5",
  );
});

test("validator rejects implementation authority without a maintainer disposition", () => {
  const fixtureRoot = createFixture("unauthorized");
  const packet = readJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json");
  packet.authority.implementation_authorized = true;
  writeJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json", packet);

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /implementation_authorized must remain false/i);
});

test("validator rejects a weakened preservation registry", () => {
  const fixtureRoot = createFixture("registry-weakened");
  const registry = readJson(
    fixtureRoot,
    "reengineering/DATA_PRESERVATION_REGISTRY.json",
  );
  const removed = registry.rows.pop();
  registry.counts.total = registry.rows.length;
  registry.counts.by_kind[removed.kind] -= 1;
  writeJson(
    fixtureRoot,
    "reengineering/DATA_PRESERVATION_REGISTRY.json",
    registry,
  );

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /removed pinned baseline obligation/i);
});

test("validator permits additive registry expansion while retaining the pinned floor", () => {
  const fixtureRoot = createFixture("registry-expanded");
  const registry = readJson(
    fixtureRoot,
    "reengineering/DATA_PRESERVATION_REGISTRY.json",
  );
  registry.rows.push({
    ...registry.rows.find((row) => row.kind === "localStorage"),
    id: "DATA-LOCALSTORAGE-ADDITIVE-TEST",
    name: "computed-prefix-example",
    runtime_observed: false,
    runtime_details: null,
  });
  registry.counts.total = registry.rows.length;
  registry.counts.by_kind.localStorage += 1;
  writeJson(
    fixtureRoot,
    "reengineering/DATA_PRESERVATION_REGISTRY.json",
    registry,
  );
  const packet = readJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json");
  packet.data_preservation.total_obligations = registry.rows.length;
  packet.data_preservation.unknown_preserve_obligations = registry.rows.length;
  packet.data_preservation.owner_approval_required_for_removal =
    registry.rows.length;
  packet.data_preservation.by_kind.localStorage += 1;
  writeJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json", packet);

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.checks.preservation_rows, 253);
});

test("validator rejects premature blocker closure", () => {
  const fixtureRoot = createFixture("blocker-closed");
  const blockerPath = path.join(fixtureRoot, "reengineering", "BLOCKERBOARD.md");
  const blockerboard = fs.readFileSync(blockerPath, "utf8");
  fs.writeFileSync(
    blockerPath,
    blockerboard.replace(
      /(\| `LW-BLK-005`[^\r\n]*\| )OPEN( \|)/,
      "$1CLOSED$2",
    ),
    "utf8",
  );

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /LW-BLK-005 must remain OPEN/i);
});

test("validator rejects an ADR marked Accepted without a decision receipt", () => {
  const fixtureRoot = createFixture("adr-accepted");
  const adrPath = path.join(
    fixtureRoot,
    "docs",
    "decisions",
    "0004-versioned-storage-and-migration.md",
  );
  const adr = fs.readFileSync(adrPath, "utf8");
  fs.writeFileSync(
    adrPath,
    adr.replace("**Status:** Proposed", "**Status:** Accepted"),
    "utf8",
  );

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /ADR-004 status must remain Proposed/i);
});

test("validator rejects removal of a required decision invariant", () => {
  const fixtureRoot = createFixture("invariant-removed");
  const packet = readJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json");
  packet.invariants = packet.invariants.filter(
    (invariant) => invariant.id !== "P3-INV-006",
  );
  writeJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json", packet);

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /missing required invariant P3-INV-006/i);
});

const structuredContractMutations = [
  [
    "unstable versioned dataset ID",
    (packet) => {
      packet.decision_contracts.storage.first_dataset.id = "conversation-v1";
    },
  ],
  [
    "credential-bearing export policy",
    (packet) => {
      packet.decision_contracts.storage.excluded_dataset_handling =
        "copy-when-explicit";
    },
  ],
  [
    "journal deletion during rollback",
    (packet) => {
      packet.decision_contracts.storage.rollback.journal_action =
        "delete-journal-record";
    },
  ],
  [
    "unstaged import promotion",
    (packet) => {
      packet.decision_contracts.storage.import.promotion =
        "write-directly-to-target";
    },
  ],
  [
    "exported real-data digests",
    (packet) => {
      packet.decision_contracts.storage.integrity.export_content_derived_digests =
        true;
    },
  ],
  [
    "real provider traffic",
    (packet) => {
      packet.decision_contracts.provider.real_provider_traffic_authorized = true;
    },
  ],
  [
    "implicit retry",
    (packet) => {
      packet.decision_contracts.provider.default_retry_count = 1;
    },
  ],
  [
    "credential resolution before an exact egress grant",
    (packet) => {
      packet.decision_contracts.provider.credential_resolution =
        "resolve-before-policy";
    },
  ],
  [
    "Phase 3 proxy listener",
    (packet) => {
      packet.decision_contracts.optional_proxy.phase3_listener_authorized = true;
    },
  ],
  [
    "ambient pairing bootstrap",
    (packet) => {
      packet.decision_contracts.optional_proxy.unauthenticated_routes[
        "pairing-bootstrap"
      ] = "unrestricted";
    },
  ],
  [
    "removed real-data prohibition",
    (packet) => {
      packet.phase3_execution_after_acceptance.still_forbidden =
        packet.phase3_execution_after_acceptance.still_forbidden.filter(
          (item) => item !== "Read or mutate real user data",
        );
    },
  ],
];

for (const [label, mutate] of structuredContractMutations) {
  test(`validator rejects ${label}`, () => {
    const fixtureRoot = createFixture(
      `contract-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    );
    const packet = readJson(
      fixtureRoot,
      "reengineering/PHASE3_DECISION_PACKET.json",
    );
    mutate(packet);
    writeJson(
      fixtureRoot,
      "reengineering/PHASE3_DECISION_PACKET.json",
      packet,
    );

    const result = validatePhase3DecisionPacket({
      workspaceRoot: fixtureRoot,
      checkGitScope: false,
    });

    assert.equal(result.valid, false);
    assert.match(
      result.failures.join("\n"),
      /decision_contracts|forbidden actions/i,
    );
  });
}

test("validator rejects a weakened blocker condition", () => {
  const fixtureRoot = createFixture("blocker-condition-weakened");
  const packet = readJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json");
  packet.blockers.find((item) => item.id === "LW-BLK-007").unblock_condition =
    "owner says okay";
  writeJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json", packet);

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /LW-BLK-007 must remain OPEN/i);
});

test("validator rejects a semantically weakened invariant statement", () => {
  const fixtureRoot = createFixture("invariant-weakened");
  const packet = readJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json");
  packet.invariants.find((item) => item.id === "P3-INV-005").statement =
    "Unknown values are usually preserved when practical.";
  writeJson(fixtureRoot, "reengineering/PHASE3_DECISION_PACKET.json", packet);

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(
    result.failures.join("\n"),
    /invariant P3-INV-005 statement is not exact/i,
  );
});

test("validator rejects removal of an ADR safety clause", () => {
  const fixtureRoot = createFixture("adr-safety-clause-removed");
  const adrPath = path.join(
    fixtureRoot,
    "docs",
    "decisions",
    "0006-optional-local-proxy-security.md",
  );
  const adr = fs.readFileSync(adrPath, "utf8");
  fs.writeFileSync(
    adrPath,
    adr.replace(
      "Only two narrowly scoped unauthenticated routes exist: a content-free health\nread and pairing bootstrap.",
      "Pairing is supported.",
    ),
    "utf8",
  );

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /missing required safety clause/i);
});

test("validator rejects Markdown that drifts from the structured packet", () => {
  const fixtureRoot = createFixture("markdown-drift");
  const markdownPath = path.join(
    fixtureRoot,
    "reengineering",
    "PHASE3_DECISION_PACKET.md",
  );
  const markdown = fs.readFileSync(markdownPath, "utf8");
  fs.writeFileSync(
    markdownPath,
    markdown.replace(
      "no Phase 3 listener; disabled by default; loopback only",
      "listener enabled on the LAN",
    ),
    "utf8",
  );

  const result = validatePhase3DecisionPacket({
    workspaceRoot: fixtureRoot,
    checkGitScope: false,
  });

  assert.equal(result.valid, false);
  assert.match(
    result.failures.join("\n"),
    /exact structured-contract projection/i,
  );
});

test("canonical CLI cannot disable or rebase Git scope validation", () => {
  const result = spawnSync(
    process.execPath,
    [
      "tools/reengineering/validate-phase3-decision-packet.mjs",
      "--check-git-scope",
      "false",
      "--base-sha",
      "HEAD",
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 2);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /always checks Git scope from the packet base commit/i,
  );
});

test("proposal validator permits only the claimed Phase 3 preflight control files", () => {
  const validator = fs.readFileSync(
    path.join(
      REPO_ROOT,
      "tools",
      "reengineering",
      "validate-phase3-decision-packet.mjs",
    ),
    "utf8",
  );

  for (const relativePath of [
    "docs/agents/claims/LW-P3-PREFLIGHT-001.md",
    "docs/agents/handoffs/LW-P3-PREFLIGHT-001.md",
    "reengineering/PHASE3_PREFLIGHT.json",
    "reengineering/PHASE3_PREFLIGHT.md",
    "tests/reengineering/phase3-preflight.test.mjs",
    "tools/reengineering/validate-phase3-preflight.mjs",
  ]) {
    assert.match(validator, new RegExp(relativePath.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(validator, /"packages\/storage\/"/);
  assert.doesNotMatch(validator, /"packages\/providers\/"/);
});
