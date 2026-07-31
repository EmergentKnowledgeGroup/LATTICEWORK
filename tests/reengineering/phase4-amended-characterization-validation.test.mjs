import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { sha256File } from "../../tools/reengineering/evidence-common.mjs";
import {
  buildAmendedDispositions,
  validatePhase4AmendedCharacterization,
} from "../../tools/reengineering/validate-phase4-amended-characterization.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TMP = path.join(ROOT, "runtime", "tmp", "phase4-amended-validation-tests");
const ORIGINAL = path.join(
  ROOT,
  "reengineering",
  "evidence",
  "phase-4",
  "LW-P4-CHAR-001",
);

test("warm-offline retest proves exact worker/cache readiness with bounded navigation", () => {
  const source = fs.readFileSync(
    path.join(
      ROOT,
      "tests",
      "characterization",
      "specs",
      "phase4-chat.spec.mjs",
    ),
    "utf8",
  );
  const warmOffline = source.slice(
    source.indexOf("async function observeWarmOfflineFailure"),
    source.indexOf("async function observeEmptySend"),
  );

  assert.doesNotMatch(
    warmOffline,
    /await navigator\.serviceWorker\.ready\s*;/u,
  );
  assert.match(
    warmOffline,
    /navigator\.serviceWorker\.register\(\s*"\/docs\/sw\.js"/u,
  );
  assert.match(warmOffline, /scope:\s*"\/docs\/"/u);
  assert.match(warmOffline, /Promise\.race\(\[readiness, boundedFailure\]\)/u);
  assert.match(warmOffline, /45_000/u);
  assert.match(warmOffline, /cache_name:\s*"freelattice-v5\.79\.22"/u);
  assert.match(warmOffline, /cache_entry_count:\s*174/u);
  assert.match(warmOffline, /cached_app_shell:\s*true/u);
  assert.match(warmOffline, /controller_before_offline:\s*true/u);
  assert.equal(
    [...warmOffline.matchAll(/timeout:\s*12_000/gu)].length,
    4,
  );
});

test("atomic observation errors fail the Playwright scenario after receipts attach", () => {
  const source = fs.readFileSync(
    path.join(
      ROOT,
      "tests",
      "characterization",
      "specs",
      "phase4-chat.spec.mjs",
    ),
    "utf8",
  );
  assert.match(source, /let observationError = null;/u);
  assert.match(source, /observationError = error;/u);
  assert.match(
    source,
    /await attachScenarioResult\(testInfo, result\);\s*\}\s*if \(observationError\) throw observationError;/u,
  );
  assert.match(source, /testInfo\.setTimeout\(110_000\)/u);
});

test("stream navigation retests trigger bounded committed reloads", () => {
  const source = fs.readFileSync(
    path.join(
      ROOT,
      "tests",
      "characterization",
      "specs",
      "phase4-chat.spec.mjs",
    ),
    "utf8",
  );
  const beforeFirstDelta = source.slice(
    source.indexOf('scenario.probe === "navigation-before-first-delta"'),
    source.indexOf('scenario.probe === "navigation-after-first-delta"'),
  );
  const afterFirstDelta = source.slice(
    source.indexOf('scenario.probe === "navigation-after-first-delta"'),
    source.indexOf('session.emitDelta("P4 synthetic success")'),
  );

  for (const block of [beforeFirstDelta, afterFirstDelta]) {
    assert.match(
      block,
      /page\.reload\(\{\s*waitUntil:\s*"commit",\s*timeout:\s*12_000\s*\}\)/u,
    );
    assert.doesNotMatch(block, /waitUntil:\s*"domcontentloaded"/u);
  }
});

const ACCEPTED = [
  "P4-CHAT-002A",
  "P4-CHAT-004A",
  "P4-CHAT-005A",
  "P4-CHAT-005B",
  "P4-CHAT-005C",
  "P4-CHAT-007A",
  "P4-CHAT-007B",
  "P4-SIG-001B",
];
const RETESTED = [
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

function originalSummary() {
  return JSON.parse(fs.readFileSync(path.join(ORIGINAL, "summary.json"), "utf8"));
}

function fixtureSummary() {
  const original = originalSummary();
  const retests = RETESTED.map((id) => ({
    id,
    status: "PASS",
    profile_cleanup: { proven: true, deleted: true, no_reparse: true },
    external_wire_transmissions: 0,
    loopback_transport_count: [
      "P4-CHAT-001A",
      "P4-CHAT-003B",
      "P4-CHAT-010A",
      "P4-CHAT-010B",
      "P4-RESP-001A",
    ].includes(id)
      ? 1
      : 0,
    sentinel_leak: null,
    observed_contract:
      id === "P4-CHAT-008A"
        ? { application_timeout: "ABSENT" }
        : id === "P4-DEG-001A"
          ? { offline_recovery: "ABSENT" }
          : id === "P4-A11Y-001A"
            ? { live_region: "ABSENT" }
            : { bounded_observation: "REPRODUCED" },
  }));
  return {
    schema: "latticework.phase4-amended-characterization-summary.v1",
    work_id: "LW-P4-RETEST-001",
    status: "PENDING_INDEPENDENT_REPRODUCTION",
    original: {
      work_id: "LW-P4-CHAR-001",
      summary_sha256: sha256File(path.join(ORIGINAL, "summary.json")),
      manifest_sha256: sha256File(path.join(ORIGINAL, "manifest.json")),
      results: original.results.map(({ id, status }) => ({ id, status })),
    },
    accepted_divergence_ids: ACCEPTED,
    retests,
    final_dispositions: buildAmendedDispositions(original.results, retests),
    listener: {
      bind: "127.0.0.1",
      os_selected_port: true,
      run_owned: true,
      fixture_only: true,
      synthetic_only: true,
      external_egress: false,
      started: true,
      stopped: true,
      port_released: true,
    },
    content_scan: { findings: 0 },
    independent_reproduction: { required: true, verdict: "PENDING" },
  };
}

test.afterEach(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

test("dispositions preserve original statuses and produce 20 pass, 8 divergence, 11 retest pass", () => {
  const original = originalSummary();
  const retests = RETESTED.map((id) => ({ id, status: "PASS" }));
  const final = buildAmendedDispositions(original.results, retests);
  assert.equal(final.length, 39);
  assert.equal(final.filter((row) => row.final_disposition === "PASS").length, 31);
  assert.equal(
    final.filter((row) => row.final_disposition === "ACCEPTED_DIVERGENCE").length,
    8,
  );
  assert.equal(
    final.find((row) => row.id === "P4-CHAT-002A").original_status,
    "FAIL",
  );
});

test("validator accepts a complete pending-reproduction receipt with immutable original hashes", () => {
  const summary = fixtureSummary();
  const result = validatePhase4AmendedCharacterization({
    workspaceRoot: ROOT,
    summary,
    permitPendingIndependentReview: true,
  });
  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.finalCounts.PASS, 31);
  assert.equal(result.finalCounts.ACCEPTED_DIVERGENCE, 8);
});

test("validator rejects changed original status, failed retest, unsafe listener, and missing absence receipt", () => {
  const summary = fixtureSummary();
  summary.original.results[0].status = "PASS";
  summary.retests[0].status = "UNKNOWN";
  summary.listener.bind = "0.0.0.0";
  summary.retests.find((row) => row.id === "P4-CHAT-008A").observed_contract = {};
  const result = validatePhase4AmendedCharacterization({
    workspaceRoot: ROOT,
    summary,
    permitPendingIndependentReview: true,
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /original result drift/i);
  assert.match(result.failures.join("\n"), /must be PASS/i);
  assert.match(result.failures.join("\n"), /listener safety/i);
  assert.match(result.failures.join("\n"), /application_timeout.*ABSENT/i);
});

test("GREEN requires an independent GREEN reproduction", () => {
  const summary = fixtureSummary();
  summary.status = "GREEN";
  const result = validatePhase4AmendedCharacterization({
    workspaceRoot: ROOT,
    summary,
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /independent reproduction/i);
});
