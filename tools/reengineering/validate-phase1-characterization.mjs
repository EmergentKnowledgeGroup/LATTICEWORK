#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  ensureDirectory,
  parseNamedArgs,
  sha256Buffer,
  writeJson,
} from "./evidence-common.mjs";

const REQUIRED_SPECS = new Set([
  "chat-signal-report.spec.mjs",
  "contracts.spec.mjs",
  "degraded-gpu.spec.mjs",
  "garden.spec.mjs",
  "mobile.spec.mjs",
  "offline.spec.mjs",
  "shell-and-storage.spec.mjs",
]);

const ATTACHMENT_MATRIX = new Map([
  [
    "chat-signal-report.spec.mjs",
    new Set([
      "console-receipt.json",
      "network-receipt.json",
      "signal-report-aria.yml",
      "signal-report.png",
    ]),
  ],
  ["contracts.spec.mjs", new Set()],
  [
    "degraded-gpu.spec.mjs",
    new Set([
      "console-receipt.json",
      "garden-no-webgpu.png",
      "network-receipt.json",
    ]),
  ],
  [
    "garden.spec.mjs",
    new Set([
      "console-receipt.json",
      "garden-after-skip.png",
      "network-receipt.json",
    ]),
  ],
  [
    "mobile.spec.mjs",
    new Set([
      "console-receipt.json",
      "garden-mobile-390x844.png",
      "mobile-overlap.json",
      "network-receipt.json",
    ]),
  ],
  [
    "offline.spec.mjs",
    new Set([
      "console-receipt.json",
      "network-receipt.json",
      "offline-reload-failure.png",
      "offline-reload-observation.json",
    ]),
  ],
  [
    "shell-and-storage.spec.mjs",
    new Set([
      "console-receipt.json",
      "network-receipt.json",
      "onboarding-aria.yml",
      "onboarding-first-run.png",
      "runtime-snapshot.json",
    ]),
  ],
]);

const REQUIRED_FRESH_LOCAL_STORAGE_KEYS = new Set([
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
]);

const REQUIRED_FRESH_DATABASES = new Set([
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
]);

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const SAFE_ATTACHMENT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function safeSegment(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function normalizeSpecFile(value) {
  return value ? path.basename(String(value).replaceAll("\\", "/")) : null;
}

function isStrictDescendant(targetPath, parentPath) {
  const relative = path.relative(
    path.resolve(parentPath),
    path.resolve(targetPath),
  );
  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
}

function assertWorkspaceDescendant(targetPath, workspaceRoot) {
  if (!isStrictDescendant(targetPath, workspaceRoot)) {
    throw new Error(
      `Refusing to clear non-descendant artifact path: ${targetPath}`,
    );
  }
}

function safeAttachmentName(name) {
  if (
    typeof name !== "string" ||
    !SAFE_ATTACHMENT_NAME.test(name) ||
    path.basename(name) !== name ||
    name.includes("..")
  ) {
    return false;
  }
  return true;
}

function decodeAttachment(attachment) {
  if (typeof attachment.body !== "string") return null;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(attachment.body)) {
    return null;
  }
  const body = Buffer.from(attachment.body, "base64");
  return body.toString("base64") === attachment.body ? body : null;
}

function parseJsonAttachment(text, label, failures) {
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function isNetworkUrl(rawUrl) {
  try {
    return ["http:", "https:", "ws:", "wss:"].includes(
      new URL(rawUrl).protocol,
    );
  } catch {
    return false;
  }
}

function urlOrigin(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "ws:") {
      return `http://${url.host}`;
    }
    if (url.protocol === "wss:") {
      return `https://${url.host}`;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function collectSpecs(suites) {
  const rows = [];
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        rows.push({
          suite: suite.title,
          file: normalizeSpecFile(spec.file ?? suite.file),
          title: spec.title,
          ok: Boolean(spec.ok),
          expected_status: test.expectedStatus,
          status: test.status,
          results: test.results ?? [],
        });
      }
    }
    rows.push(...collectSpecs(suite.suites ?? []));
  }
  return rows;
}

function inspectBaselineWorktree(baselineRoot) {
  if (!fs.existsSync(baselineRoot)) {
    return {
      exists: false,
      head: null,
      dirty: null,
      error: "baseline root does not exist",
    };
  }
  const head = spawnSync(
    "git",
    ["-C", baselineRoot, "rev-parse", "HEAD"],
    { encoding: "utf8", windowsHide: true },
  );
  const status = spawnSync(
    "git",
    ["-C", baselineRoot, "status", "--porcelain"],
    { encoding: "utf8", windowsHide: true },
  );
  return {
    exists: true,
    head: head.status === 0 ? head.stdout.trim() : null,
    dirty: status.status === 0 ? Boolean(status.stdout.trim()) : null,
    error:
      head.status === 0 && status.status === 0
        ? null
        : [
            head.stderr?.trim(),
            status.stderr?.trim(),
          ]
            .filter(Boolean)
            .join("; ") || "git inspection failed",
  };
}

function validatePng(name, contentType, body, failures) {
  if (contentType !== "image/png") {
    failures.push(
      `${name} content type must be image/png; observed ${contentType ?? "missing"}`,
    );
  }
  if (
    body.byteLength < 100 ||
    !body.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    failures.push(`${name} is not a non-empty PNG`);
  }
}

function validateText(name, contentType, text, failures) {
  if (contentType !== "text/plain") {
    failures.push(
      `${name} content type must be text/plain; observed ${contentType ?? "missing"}`,
    );
  }
  if (!text.trim()) {
    failures.push(`${name} must not be empty`);
  }
  if (
    name === "onboarding-aria.yml" &&
    (!text.includes("Welcome to FreeLattice") ||
      !text.includes("Skip — just explore"))
  ) {
    failures.push(
      "onboarding-aria.yml is missing the expected onboarding semantics",
    );
  }
  if (
    name === "signal-report-aria.yml" &&
    (!text.includes("Signal Report") ||
      !text.includes("No message content is included") ||
      !text.includes('button "Copied ✓"'))
  ) {
    failures.push(
      "signal-report-aria.yml is missing the expected privacy/copy semantics",
    );
  }
}

function validateRuntimeSnapshot(value, expectedAllowedOrigin, failures) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push("runtime-snapshot.json must be a JSON object");
    return;
  }
  if (value.url !== `${expectedAllowedOrigin}/docs/app.html`) {
    failures.push(
      `runtime snapshot URL mismatch: ${value.url ?? "missing"}`,
    );
  }
  if (
    typeof value.title !== "string" ||
    !/^FreeLattice(?: ✦ .+)?$/.test(value.title)
  ) {
    failures.push("runtime snapshot title does not match FreeLattice");
  }
  if (value.canvas_count !== 12) {
    failures.push(
      `runtime snapshot canvas_count must be 12; observed ${value.canvas_count ?? "missing"}`,
    );
  }
  if (
    value.viewport?.width !== 1440 ||
    value.viewport?.height !== 900
  ) {
    failures.push("runtime snapshot viewport must be 1440x900");
  }
  const localKeys = new Set(value.local_storage_keys ?? []);
  for (const key of REQUIRED_FRESH_LOCAL_STORAGE_KEYS) {
    if (!localKeys.has(key)) {
      failures.push(`runtime snapshot missing localStorage key: ${key}`);
    }
  }
  const databaseRows = Array.isArray(value.indexed_db)
    ? value.indexed_db
    : [];
  const databaseNames = new Set(
    databaseRows.map((database) => database?.name),
  );
  for (const database of REQUIRED_FRESH_DATABASES) {
    if (!databaseNames.has(database)) {
      failures.push(`runtime snapshot missing IndexedDB database: ${database}`);
    }
  }
  if (
    databaseRows.some(
      (database) =>
        !database ||
        !Number.isInteger(database.version) ||
        !Array.isArray(database.stores),
    )
  ) {
    failures.push(
      "runtime snapshot IndexedDB rows require integer versions and store-name arrays",
    );
  }
  if (
    !Array.isArray(value.caches) ||
    !value.caches.some(
      (cache) =>
        typeof cache?.name === "string" &&
        Number.isInteger(cache?.count) &&
        cache.count > 0,
    )
  ) {
    failures.push("runtime snapshot requires a populated cache receipt");
  }
  const activeWorkers = value.service_worker?.registrations ?? [];
  if (
    !Array.isArray(activeWorkers) ||
    !activeWorkers.some(
      (registration) =>
        typeof registration?.active === "string" &&
        urlOrigin(registration.active) === expectedAllowedOrigin,
    )
  ) {
    failures.push(
      "runtime snapshot requires an active same-origin service worker",
    );
  }
}

function validateMobileOverlap(value, failures) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push("mobile-overlap.json must be a JSON object");
    return;
  }
  if (
    value.viewport?.width !== 390 ||
    value.viewport?.height !== 844
  ) {
    failures.push("mobile overlap viewport must be 390x844");
  }
  if (!(value.title_presence_button_intersection > 0)) {
    failures.push(
      "mobile overlap must preserve the title/Presence-button intersection",
    );
  }
  for (const key of [
    "title_controls_intersection",
    "observe_explore_intersection",
    "title_presence_intersection",
    "controls_presence_intersection",
  ]) {
    if (value[key] !== 0) {
      failures.push(
        `mobile overlap ${key} must be 0; observed ${value[key] ?? "missing"}`,
      );
    }
  }
}

function validateOfflineObservation(
  value,
  expectedAllowedOrigin,
  failures,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(
      "offline-reload-observation.json must be a JSON object",
    );
    return;
  }
  if (!String(value.reload_error ?? "").includes(
    "ERR_INTERNET_DISCONNECTED",
  )) {
    failures.push(
      "offline observation must contain ERR_INTERNET_DISCONNECTED",
    );
  }
  if (value.final_url !== `${expectedAllowedOrigin}/docs/app.html`) {
    failures.push(
      `offline observation final URL mismatch: ${value.final_url ?? "missing"}`,
    );
  }
  if (value.title !== "") {
    failures.push(
      `offline observation title must be empty; observed ${JSON.stringify(value.title)}`,
    );
  }
}

function validateNetworkReceipt(
  value,
  specFile,
  expectedAllowedOrigin,
  failures,
) {
  const counts = {
    blockedHttp: 0,
    blockedWebSockets: 0,
    blockedRealtime: 0,
    externalAllowed: 0,
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(`${specFile} network receipt must be a JSON object`);
    return counts;
  }
  if (value.allowed_origin !== expectedAllowedOrigin) {
    failures.push(
      `${specFile} network receipt allowed_origin mismatch: ${value.allowed_origin ?? "missing"}`,
    );
  }
  for (const key of [
    "allowed",
    "blocked",
    "blocked_websockets",
    "blocked_realtime",
    "failed",
  ]) {
    if (!Array.isArray(value[key])) {
      failures.push(`${specFile} network receipt ${key} must be an array`);
    }
  }
  for (const request of value.allowed ?? []) {
    if (
      isNetworkUrl(request?.url) &&
      urlOrigin(request.url) !== expectedAllowedOrigin
    ) {
      counts.externalAllowed += 1;
      failures.push(
        `${specFile} network receipt allowed external request: ${request.url}`,
      );
    }
  }
  for (const request of value.blocked ?? []) {
    if (
      !isNetworkUrl(request?.url) ||
      !["http:", "https:"].includes(new URL(request.url).protocol)
    ) {
      failures.push(
        `${specFile} blocked HTTP receipt has invalid URL: ${request?.url ?? "missing"}`,
      );
      continue;
    }
    counts.blockedHttp += 1;
  }
  for (const request of value.blocked_websockets ?? []) {
    if (
      !isNetworkUrl(request?.url) ||
      !["ws:", "wss:"].includes(new URL(request.url).protocol)
    ) {
      failures.push(
        `${specFile} blocked WebSocket receipt has invalid URL: ${request?.url ?? "missing"}`,
      );
      continue;
    }
    counts.blockedWebSockets += 1;
  }
  for (const request of value.blocked_realtime ?? []) {
    if (!["webrtc", "webtransport"].includes(request?.channel)) {
      failures.push(
        `${specFile} blocked realtime receipt has invalid channel: ${request?.channel ?? "missing"}`,
      );
      continue;
    }
    counts.blockedRealtime += 1;
  }
  if (specFile === "shell-and-storage.spec.mjs") {
    if (counts.blockedWebSockets < 1) {
      failures.push(
        "shell-and-storage network receipt must prove a blocked WebSocket attempt",
      );
    }
    if (
      !(value.blocked_realtime ?? []).some(
        (request) => request?.channel === "webrtc",
      )
    ) {
      failures.push(
        "shell-and-storage network receipt must prove a blocked WebRTC attempt",
      );
    }
  }
  return counts;
}

function validateJsonAttachment(
  name,
  contentType,
  value,
  specFile,
  expectedAllowedOrigin,
  failures,
) {
  if (contentType !== "application/json") {
    failures.push(
      `${name} content type must be application/json; observed ${contentType ?? "missing"}`,
    );
  }
  if (name === "runtime-snapshot.json") {
    validateRuntimeSnapshot(value, expectedAllowedOrigin, failures);
  } else if (name === "mobile-overlap.json") {
    validateMobileOverlap(value, failures);
  } else if (name === "offline-reload-observation.json") {
    validateOfflineObservation(value, expectedAllowedOrigin, failures);
  } else if (
    name === "console-receipt.json" &&
    !Array.isArray(value)
  ) {
    failures.push(
      `${specFile} console-receipt.json must be a JSON array`,
    );
  }
}

export function validatePhase1Characterization({
  resultsPath,
  outputPath,
  artifactDirectory,
  workspaceRoot,
  expectedBaselineSha,
  expectedBaselineRoot,
  expectedAllowedOrigin,
  baselineInspector = inspectBaselineWorktree,
}) {
  const resolvedResults = path.resolve(resultsPath);
  const resolvedOutput = path.resolve(outputPath);
  const resolvedArtifacts = path.resolve(artifactDirectory);
  const resolvedBaselineRoot = path.resolve(expectedBaselineRoot);
  const results = JSON.parse(
    fs.readFileSync(resolvedResults, "utf8").replace(/^\uFEFF/, ""),
  );
  const failures = [];
  const observedSpecs = collectSpecs(results.suites);
  const specNames = new Set(observedSpecs.map((spec) => spec.file));

  for (const required of REQUIRED_SPECS) {
    if (!specNames.has(required)) {
      failures.push(`missing required spec result: ${required}`);
    }
  }
  for (const observed of specNames) {
    if (!REQUIRED_SPECS.has(observed)) {
      failures.push(`unexpected spec result: ${observed}`);
    }
  }
  if (
    observedSpecs.length !== REQUIRED_SPECS.size ||
    results.stats?.expected !== REQUIRED_SPECS.size
  ) {
    failures.push(
      `expected exactly ${REQUIRED_SPECS.size} passed tests; observed ${observedSpecs.length} results and stats.expected=${results.stats?.expected ?? "missing"}`,
    );
  }
  for (const key of ["unexpected", "flaky", "skipped"]) {
    if (results.stats?.[key] !== 0) {
      failures.push(
        `Playwright stats.${key} must be 0; observed ${results.stats?.[key] ?? "missing"}`,
      );
    }
  }
  if ((results.errors ?? []).length > 0) {
    failures.push(
      `Playwright reporter contains ${results.errors.length} top-level errors`,
    );
  }
  for (const spec of observedSpecs) {
    if (
      !spec.ok ||
      spec.status !== "expected" ||
      spec.expected_status !== "passed" ||
      spec.results.length !== 1
    ) {
      failures.push(
        `spec did not finish as one expected pass: ${spec.file} :: ${spec.title}`,
      );
    }
    for (const result of spec.results) {
      if (result.status !== "passed") {
        failures.push(
          `test result did not pass: ${spec.file} :: ${spec.title} (${result.status})`,
        );
      }
    }
  }

  const metadata = results.config?.metadata ?? {};
  if (metadata.baseline_sha !== expectedBaselineSha) {
    failures.push(
      `baseline SHA mismatch: expected ${expectedBaselineSha}; observed ${metadata.baseline_sha ?? "missing"}`,
    );
  }
  if (
    !metadata.baseline_root ||
    path.resolve(metadata.baseline_root) !== resolvedBaselineRoot
  ) {
    failures.push(
      `baseline root mismatch: expected ${resolvedBaselineRoot}; observed ${metadata.baseline_root ?? "missing"}`,
    );
  }
  if (metadata.allowed_origin !== expectedAllowedOrigin) {
    failures.push(
      `allowed origin mismatch: expected ${expectedAllowedOrigin}; observed ${metadata.allowed_origin ?? "missing"}`,
    );
  }
  if (metadata.evidence_label !== "OBSERVED") {
    failures.push(
      `Playwright metadata evidence_label must be OBSERVED; observed ${metadata.evidence_label ?? "missing"}`,
    );
  }
  if (results.config?.version !== "1.62.0") {
    failures.push(
      `Playwright version must be 1.62.0; observed ${results.config?.version ?? "missing"}`,
    );
  }
  const baselineObservation = baselineInspector(resolvedBaselineRoot);
  if (!baselineObservation.exists) {
    failures.push(
      `baseline worktree missing: ${baselineObservation.error ?? resolvedBaselineRoot}`,
    );
  }
  if (baselineObservation.head !== expectedBaselineSha) {
    failures.push(
      `inspected baseline HEAD mismatch: expected ${expectedBaselineSha}; observed ${baselineObservation.head ?? "missing"}`,
    );
  }
  if (baselineObservation.dirty !== false) {
    failures.push(
      `inspected baseline worktree must be clean; observed dirty=${baselineObservation.dirty}`,
    );
  }

  assertWorkspaceDescendant(resolvedArtifacts, workspaceRoot);
  fs.rmSync(resolvedArtifacts, { recursive: true, force: true });
  ensureDirectory(resolvedArtifacts);

  const attachmentIndex = [];
  const observedAttachmentsBySpec = new Map();
  let externalAllowed = 0;
  let blockedHttp = 0;
  let blockedWebSockets = 0;
  let blockedRealtime = 0;
  const networkReceiptSpecs = new Set();
  let embeddedSecretSentinel = false;

  for (const spec of observedSpecs) {
    const specSegment = safeSegment(
      spec.file?.replace(/\.spec\.mjs$/, "") ?? spec.title,
    );
    if (!specSegment) {
      failures.push(`unable to derive safe artifact directory for ${spec.file}`);
      continue;
    }
    const specDirectory = ensureDirectory(
      path.join(resolvedArtifacts, specSegment),
    );
    const observedNames = observedAttachmentsBySpec.get(spec.file) ?? new Set();
    observedAttachmentsBySpec.set(spec.file, observedNames);

    for (const result of spec.results) {
      for (const attachment of result.attachments ?? []) {
        if (!safeAttachmentName(attachment.name)) {
          failures.push(
            `unsafe attachment name rejected for ${spec.file}: ${JSON.stringify(attachment.name)}`,
          );
          continue;
        }
        const body = decodeAttachment(attachment);
        if (!body) {
          failures.push(
            `attachment body is missing or not embedded: ${spec.file} :: ${attachment.name}`,
          );
          continue;
        }
        if (observedNames.has(attachment.name)) {
          failures.push(
            `duplicate attachment for ${spec.file}: ${attachment.name}`,
          );
          continue;
        }
        observedNames.add(attachment.name);
        const targetPath = path.resolve(
          specDirectory,
          attachment.name,
        );
        if (!isStrictDescendant(targetPath, specDirectory)) {
          failures.push(
            `attachment escaped its spec directory: ${attachment.name}`,
          );
          continue;
        }

        const text =
          attachment.contentType?.startsWith("text/") ||
          attachment.contentType === "application/json"
            ? body.toString("utf8")
            : "";
        if (
          text.includes("LW_FAKE_KEY_NOT_A_SECRET") ||
          text.includes("LW_PRIVATE_MESSAGE_SENTINEL_MUST_NOT_APPEAR")
        ) {
          embeddedSecretSentinel = true;
          failures.push(
            `synthetic private sentinel leaked into attachment ${attachment.name}`,
          );
        }

        let parsedJson = null;
        if (attachment.name.endsWith(".png")) {
          validatePng(
            attachment.name,
            attachment.contentType,
            body,
            failures,
          );
        } else if (
          attachment.name.endsWith(".yml") ||
          attachment.name.endsWith(".txt")
        ) {
          validateText(
            attachment.name,
            attachment.contentType,
            text,
            failures,
          );
        } else if (attachment.name.endsWith(".json")) {
          parsedJson = parseJsonAttachment(
            text,
            `${spec.file} :: ${attachment.name}`,
            failures,
          );
          if (parsedJson !== null) {
            validateJsonAttachment(
              attachment.name,
              attachment.contentType,
              parsedJson,
              spec.file,
              expectedAllowedOrigin,
              failures,
            );
          }
        } else {
          failures.push(
            `unsupported attachment extension: ${attachment.name}`,
          );
        }

        if (
          attachment.name === "network-receipt.json" &&
          parsedJson !== null
        ) {
          networkReceiptSpecs.add(spec.file);
          const counts = validateNetworkReceipt(
            parsedJson,
            spec.file,
            expectedAllowedOrigin,
            failures,
          );
          blockedHttp += counts.blockedHttp;
          blockedWebSockets += counts.blockedWebSockets;
          blockedRealtime += counts.blockedRealtime;
          externalAllowed += counts.externalAllowed;
        }

        fs.writeFileSync(targetPath, body);
        attachmentIndex.push({
          spec: spec.file,
          test: spec.title,
          name: attachment.name,
          content_type: attachment.contentType ?? null,
          path: path
            .relative(path.dirname(resolvedOutput), targetPath)
            .replaceAll("\\", "/"),
          bytes: body.byteLength,
          sha256: sha256Buffer(body),
        });
      }
    }
  }

  for (const [specFile, requiredNames] of ATTACHMENT_MATRIX) {
    const observedNames =
      observedAttachmentsBySpec.get(specFile) ?? new Set();
    for (const required of requiredNames) {
      if (!observedNames.has(required)) {
        failures.push(
          `missing required attachment for ${specFile}: ${required}`,
        );
      }
    }
    for (const observed of observedNames) {
      if (!requiredNames.has(observed)) {
        failures.push(
          `unexpected attachment for ${specFile}: ${observed}`,
        );
      }
    }
  }
  const networkReceipts = networkReceiptSpecs.size;
  if (networkReceipts !== 6) {
    failures.push(
      `expected 6 browser network receipts; observed ${networkReceipts}`,
    );
  }
  if (blockedHttp === 0) {
    failures.push("expected at least one safely blocked external HTTP request");
  }
  if (blockedWebSockets === 0) {
    failures.push(
      "expected at least one safely blocked external WebSocket attempt",
    );
  }
  if (blockedRealtime === 0) {
    failures.push(
      "expected at least one safely blocked realtime transport attempt",
    );
  }

  const summary = {
    schema: "latticework.characterization.phase1-validation.v2",
    valid: failures.length === 0,
    evidence_label: "MEASURED",
    validated_at: new Date().toISOString(),
    source_results: {
      path: path
        .relative(path.dirname(resolvedOutput), resolvedResults)
        .replaceAll("\\", "/"),
      bytes: fs.statSync(resolvedResults).size,
      sha256: sha256Buffer(fs.readFileSync(resolvedResults)),
    },
    baseline_sha: metadata.baseline_sha ?? null,
    baseline_root: metadata.baseline_root ?? null,
    baseline_worktree: baselineObservation,
    allowed_origin: metadata.allowed_origin ?? null,
    playwright_version: results.config?.version ?? null,
    stats: results.stats ?? null,
    tests: observedSpecs.map((spec) => ({
      file: spec.file,
      title: spec.title,
      status: spec.status,
      result_statuses: spec.results.map((result) => result.status),
      durations_ms: spec.results.map((result) => result.duration),
    })),
    safety: {
      network_receipts: networkReceipts,
      blocked_http_requests: blockedHttp,
      blocked_websocket_attempts: blockedWebSockets,
      blocked_realtime_attempts: blockedRealtime,
      allowed_external_network_requests: externalAllowed,
      synthetic_private_sentinel_leaked: embeddedSecretSentinel,
    },
    attachments: attachmentIndex,
    failures,
  };
  writeJson(resolvedOutput, summary);
  return summary;
}

function isMain() {
  if (!process.argv[1]) return false;
  return (
    path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
  );
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length > 0) {
      throw new Error("This validator does not accept a command after --");
    }
    if (
      !options.results ||
      !options.output ||
      !options.artifacts ||
      !options["workspace-root"] ||
      !options["baseline-sha"] ||
      !options["baseline-root"] ||
      !options["allowed-origin"]
    ) {
      throw new Error(
        "Usage: validate-phase1-characterization.mjs --results PATH --output PATH --artifacts PATH --workspace-root PATH --baseline-sha SHA --baseline-root PATH --allowed-origin ORIGIN",
      );
    }
    const summary = validatePhase1Characterization({
      resultsPath: options.results,
      outputPath: options.output,
      artifactDirectory: options.artifacts,
      workspaceRoot: options["workspace-root"],
      expectedBaselineSha: options["baseline-sha"],
      expectedBaselineRoot: options["baseline-root"],
      expectedAllowedOrigin: options["allowed-origin"],
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exitCode = summary.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
