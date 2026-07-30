import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validatePhase1Characterization } from "../../tools/reengineering/validate-phase1-characterization.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
const fixtureRoot = path.join(
  repositoryRoot,
  "runtime",
  "tmp",
  "phase1-validator-test",
);
const baselineSha =
  "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const baselineRoot = "Z:\\LATTICEWORK_BASELINE_e7585999";
const allowedOrigin = "http://127.0.0.1:4174";
const pngBody = Buffer.concat([
  Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]),
  Buffer.alloc(128, 0x42),
]).toString("base64");

const localStorageKeys = [
  "fl-has-visited",
  "fl-last-tab",
  "fl_customEndpoint",
  "fl_lan_friendly_name",
  "fl_lan_peer_id",
  "fl_memory_core_v1",
  "fl_meshNodeId",
  "fl_privacy",
  "fl_qv_revise_to_annotate_migrated_v5_56_1",
  "fl_voice_documents",
  "latticePoints",
];
const databaseNames = [
  "FreeLatticeDB",
  "FreeLatticeEvolution",
  "FreeLatticeGardenDreaming",
  "FreeLatticeGardenMemory",
  "FreeLatticeIdentity",
  "FreeLatticeLetters",
  "FreeLatticeMemory",
  "FreeLatticeMemoryBridge",
  "FreeLatticePresence",
  "FreeLatticeSkills",
  "FreeLatticeWallet",
  "LatticeChain",
  "LatticeHandshakes",
  "LatticeMemory",
  "SophiaEngine",
  "WallOfPresence",
];

function encoded(value) {
  return Buffer.from(
    typeof value === "string"
      ? value
      : `${JSON.stringify(value)}\n`,
    "utf8",
  ).toString("base64");
}

function jsonAttachment(name, value) {
  return {
    name,
    contentType: "application/json",
    body: encoded(value),
  };
}

function textAttachment(name, value) {
  return {
    name,
    contentType: "text/plain",
    body: encoded(value),
  };
}

function pngAttachment(name) {
  return {
    name,
    contentType: "image/png",
    body: pngBody,
  };
}

function networkReceipt({ proveEgress = false } = {}) {
  return {
    allowed_origin: allowedOrigin,
    allowed: [
      {
        action: "allowed-baseline",
        url: `${allowedOrigin}/docs/app.html`,
      },
    ],
    blocked: proveEgress
      ? [
          {
            action: "blocked",
            url: "https://example.invalid/version.json",
          },
        ]
      : [],
    blocked_websockets: proveEgress
      ? [
          {
            action: "blocked",
            url: "wss://example.invalid/latticework-characterization",
          },
        ]
      : [],
    blocked_realtime: proveEgress
      ? [{ action: "blocked", channel: "webrtc" }]
      : [],
    failed: [],
  };
}

function runtimeSnapshot() {
  return {
    url: `${allowedOrigin}/docs/app.html`,
    title: "FreeLattice ✦ Touch something",
    viewport: { width: 1440, height: 900 },
    canvas_count: 12,
    service_worker: {
      registrations: [
        {
          active: `${allowedOrigin}/docs/sw.js`,
        },
      ],
    },
    caches: [{ name: "freelattice-v5.79.22", count: 174 }],
    local_storage_keys: localStorageKeys,
    indexed_db: databaseNames.map((name) => ({
      name,
      version: 1,
      stores: ["fixture-store"],
    })),
  };
}

function attachmentsFor(file) {
  const shared = [
    jsonAttachment(
      "console-receipt.json",
      [],
    ),
    jsonAttachment(
      "network-receipt.json",
      networkReceipt({
        proveEgress: file === "shell-and-storage.spec.mjs",
      }),
    ),
  ];
  if (file === "contracts.spec.mjs") return [];
  if (file === "chat-signal-report.spec.mjs") {
    return [
      ...shared,
      textAttachment(
        "signal-report-aria.yml",
        '- heading "Signal Report" [level=3]\n- paragraph: No message content is included\n- button "Copied ✓"',
      ),
      pngAttachment("signal-report.png"),
    ];
  }
  if (file === "degraded-gpu.spec.mjs") {
    return [...shared, pngAttachment("garden-no-webgpu.png")];
  }
  if (file === "garden.spec.mjs") {
    return [...shared, pngAttachment("garden-after-skip.png")];
  }
  if (file === "mobile.spec.mjs") {
    return [
      ...shared,
      pngAttachment("garden-mobile-390x844.png"),
      jsonAttachment("mobile-overlap.json", {
        viewport: { width: 390, height: 844 },
        title_controls_intersection: 0,
        observe_explore_intersection: 0,
        title_presence_intersection: 0,
        controls_presence_intersection: 0,
        title_presence_button_intersection: 42,
      }),
    ];
  }
  if (file === "offline.spec.mjs") {
    return [
      ...shared,
      pngAttachment("offline-reload-failure.png"),
      jsonAttachment("offline-reload-observation.json", {
        reload_error: "net::ERR_INTERNET_DISCONNECTED",
        final_url: `${allowedOrigin}/docs/app.html`,
        title: "",
      }),
    ];
  }
  if (file === "shell-and-storage.spec.mjs") {
    return [
      ...shared,
      textAttachment(
        "onboarding-aria.yml",
        '- heading "✦ Welcome to FreeLattice" [level=1]\n- button "Skip — just explore ✦"',
      ),
      pngAttachment("onboarding-first-run.png"),
      jsonAttachment("runtime-snapshot.json", runtimeSnapshot()),
    ];
  }
  throw new Error(`Unhandled fixture spec: ${file}`);
}

function fakeResults() {
  const files = [
    "chat-signal-report.spec.mjs",
    "contracts.spec.mjs",
    "degraded-gpu.spec.mjs",
    "garden.spec.mjs",
    "mobile.spec.mjs",
    "offline.spec.mjs",
    "shell-and-storage.spec.mjs",
  ];

  return {
    config: {
      version: "1.62.0",
      metadata: {
        baseline_sha: baselineSha,
        baseline_root: baselineRoot,
        allowed_origin: allowedOrigin,
        evidence_label: "OBSERVED",
      },
    },
    stats: {
      startTime: "2026-07-30T00:00:00.000Z",
      duration: 100,
      expected: 7,
      skipped: 0,
      unexpected: 0,
      flaky: 0,
    },
    suites: files.map((file, index) => ({
      title: file,
      file,
      specs: [
        {
          title: `test ${index + 1}`,
          file,
          ok: true,
          tests: [
            {
              expectedStatus: "passed",
              status: "expected",
              results: [
                {
                  status: "passed",
                  duration: 10,
                  attachments: attachmentsFor(file),
                },
              ],
            },
          ],
        },
      ],
    })),
    errors: [],
  };
}

function baselineInspector() {
  return {
    exists: true,
    head: baselineSha,
    dirty: false,
    error: null,
  };
}

function executeFixture(name, mutate = () => {}) {
  const runRoot = path.join(fixtureRoot, name);
  fs.rmSync(runRoot, { recursive: true, force: true });
  fs.mkdirSync(runRoot, { recursive: true });
  const results = fakeResults();
  mutate(results);
  const resultsPath = path.join(runRoot, "results.json");
  const outputPath = path.join(runRoot, "summary.json");
  const artifactDirectory = path.join(runRoot, "artifacts");
  fs.writeFileSync(
    resultsPath,
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );
  const summary = validatePhase1Characterization({
    resultsPath,
    outputPath,
    artifactDirectory,
    workspaceRoot: repositoryRoot,
    expectedBaselineSha: baselineSha,
    expectedBaselineRoot: baselineRoot,
    expectedAllowedOrigin: allowedOrigin,
    baselineInspector,
  });
  return {
    runRoot,
    outputPath,
    artifactDirectory,
    summary,
  };
}

test.after(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

test("Phase 1 validator extracts owned, typed, semantic attachments", () => {
  const result = executeFixture("valid");
  assert.equal(result.summary.valid, true);
  assert.equal(result.summary.evidence_label, "MEASURED");
  assert.equal(result.summary.stats.expected, 7);
  assert.equal(result.summary.safety.network_receipts, 6);
  assert.equal(result.summary.safety.blocked_http_requests, 1);
  assert.equal(result.summary.safety.blocked_websocket_attempts, 1);
  assert.equal(result.summary.safety.blocked_realtime_attempts, 1);
  assert.equal(
    result.summary.safety.allowed_external_network_requests,
    0,
  );
  assert.equal(result.summary.attachments.length, 23);
  assert.equal(fs.existsSync(result.outputPath), true);
  assert.equal(
    fs.existsSync(
      path.join(
        result.artifactDirectory,
        "shell-and-storage",
        "runtime-snapshot.json",
      ),
    ),
    true,
  );
});

test("Phase 1 validator rejects attachment traversal without writing it", () => {
  const escapedPath = path.join(fixtureRoot, "escape.json");
  const result = executeFixture("traversal", (results) => {
    results.suites[0].specs[0].tests[0].results[0].attachments[0].name =
      "..\\..\\escape.json";
  });
  assert.equal(result.summary.valid, false);
  assert.match(
    result.summary.failures.join("\n"),
    /unsafe attachment name rejected/,
  );
  assert.equal(fs.existsSync(escapedPath), false);
});

test("Phase 1 validator rejects non-canonical base64 attachment bodies", () => {
  const result = executeFixture("bad-base64", (results) => {
    results.suites[0].specs[0].tests[0].results[0].attachments[0].body = "cHJvb2Y";
  });
  assert.equal(result.summary.valid, false);
  assert.match(result.summary.failures.join("\n"), /missing or not embedded/);
});

test("Phase 1 validator rejects an attachment owned by the wrong spec", () => {
  const result = executeFixture("wrong-owner", (results) => {
    const shellAttachments =
      results.suites[6].specs[0].tests[0].results[0].attachments;
    const runtimeIndex = shellAttachments.findIndex(
      (attachment) => attachment.name === "runtime-snapshot.json",
    );
    results.suites[0].specs[0].tests[0].results[0].attachments.push(
      shellAttachments.splice(runtimeIndex, 1)[0],
    );
  });
  assert.equal(result.summary.valid, false);
  assert.match(
    result.summary.failures.join("\n"),
    /unexpected attachment for chat-signal-report\.spec\.mjs: runtime-snapshot\.json/,
  );
  assert.match(
    result.summary.failures.join("\n"),
    /missing required attachment for shell-and-storage\.spec\.mjs: runtime-snapshot\.json/,
  );
});

test("Phase 1 validator rejects fake PNG and false mobile semantics", () => {
  const result = executeFixture("fake-content", (results) => {
    const attachments =
      results.suites[4].specs[0].tests[0].results[0].attachments;
    attachments.find(
      (attachment) =>
        attachment.name === "garden-mobile-390x844.png",
    ).body = encoded({ safe: true });
    const overlap = attachments.find(
      (attachment) => attachment.name === "mobile-overlap.json",
    );
    overlap.body = encoded({
      viewport: { width: 390, height: 844 },
      title_controls_intersection: 0,
      observe_explore_intersection: 0,
      title_presence_intersection: 0,
      controls_presence_intersection: 0,
      title_presence_button_intersection: 0,
    });
  });
  assert.equal(result.summary.valid, false);
  assert.match(result.summary.failures.join("\n"), /is not a non-empty PNG/);
  assert.match(
    result.summary.failures.join("\n"),
    /must preserve the title\/Presence-button intersection/,
  );
});

test("Phase 1 validator rejects wrong baseline metadata", () => {
  const result = executeFixture("wrong-baseline", (results) => {
    results.config.metadata.baseline_root =
      "Z:\\LATTICEWORK_BASELINE_WRONG";
    results.config.metadata.baseline_sha = "0".repeat(40);
  });
  assert.equal(result.summary.valid, false);
  assert.match(result.summary.failures.join("\n"), /baseline SHA mismatch/);
  assert.match(result.summary.failures.join("\n"), /baseline root mismatch/);
});

test("Phase 1 validator rejects missing WebSocket/realtime proof", () => {
  const result = executeFixture("missing-egress-proof", (results) => {
    const attachment =
      results.suites[6].specs[0].tests[0].results[0].attachments.find(
        (candidate) => candidate.name === "network-receipt.json",
      );
    attachment.body = encoded(networkReceipt({ proveEgress: false }));
  });
  assert.equal(result.summary.valid, false);
  assert.match(
    result.summary.failures.join("\n"),
    /must prove a blocked WebSocket attempt/,
  );
  assert.match(
    result.summary.failures.join("\n"),
    /must prove a blocked WebRTC attempt/,
  );
});

test("Phase 1 validator rejects sentinel leakage in receipted text", () => {
  const result = executeFixture("sentinel-leak", (results) => {
    const attachment =
      results.suites[0].specs[0].tests[0].results[0].attachments.find(
        (candidate) => candidate.name === "console-receipt.json",
      );
    attachment.body = encoded([
      {
        type: "error",
        text: "LW_PRIVATE_MESSAGE_SENTINEL_MUST_NOT_APPEAR",
      },
    ]);
  });
  assert.equal(result.summary.valid, false);
  assert.equal(
    result.summary.safety.synthetic_private_sentinel_leaked,
    true,
  );
});
