import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { collectActiveRangePaths } from "./git-scope-common.mjs";

export const IMPLEMENTATION_BASE_SHA =
  "faf32dbaf8159e8499421fa68d9fba4bede0fdc9";

export const OWNED_EXACT_PATHS = Object.freeze([
  "package.json",
  "package-lock.json",
  "packages/contracts/src/index.ts",
  "packages/contracts/src/chat.ts",
  "apps/web/package.json",
  "apps/web/p4.html",
  "apps/web/src/p4-main.ts",
  "apps/web/src/p4-chat-app.ts",
  "apps/web/src/p4-chat-app.css",
  "tests/reengineering/phase4-implementation-scope.test.mjs",
  "tests/reengineering/phase4-active-scope.test.mjs",
  "tests/reengineering/phase2-boundary.test.mjs",
  "tests/reengineering/phase4-amendment.test.mjs",
  "tools/reengineering/verify-phase3-boundary.mjs",
  "tools/reengineering/validate-phase4-implementation-scope.mjs",
  "tools/reengineering/validate-phase4-active-scope.mjs",
  "tools/reengineering/validate-phase4-amendment.mjs",
  "tools/reengineering/run-phase4-verification.ps1",
  "docs/agents/claims/LW-P4-IMPL-PREFLIGHT-001.md",
  "docs/agents/handoffs/LW-P4-IMPL-PREFLIGHT-001.md",
  "docs/agents/claims/LW-P4-001.md",
  "docs/agents/handoffs/LW-P4-001.md",
  "PROJECT_STATE.md",
  "docs/ARCHITECTURE.md",
  "docs/COMPATIBILITY.md",
  "docs/TESTING_AND_VERIFICATION.md",
  "reengineering/BLOCKERBOARD.md",
  "reengineering/EXECUTION_CHECKLIST.md",
  "reengineering/PHASE4_IMPLEMENTATION_PACKET.md",
  "runtime/checkpoints/LATEST.md",
  "runtime/checkpoints/LATEST.json",
  "reengineering/checkpoints/LATEST.md",
  "reengineering/checkpoints/LATEST.json",
]);

export const OWNED_PATH_PREFIXES = Object.freeze([
  "packages/chat/",
  "tests/phase4/",
  "reengineering/evidence/phase-4/LW-P4-001/",
]);

export const PROTECTED_PHASE3_EXACT_PATHS = Object.freeze([
  "packages/contracts/src/provider.ts",
  "packages/contracts/src/storage.ts",
]);

export const PROTECTED_PHASE3_PATH_PREFIXES = Object.freeze([
  "packages/providers/",
  "packages/storage/",
]);

export const PROTECTED_EXACT_PATHS = Object.freeze([
  "app.html",
  "index.html",
  "docs/app.html",
  "sw.js",
  "docs/sw.js",
  "server.js",
  "server.py",
  "telegram-worker.js",
  "apps/web/index.html",
  "apps/web/src/main.ts",
  "apps/web/src/empty-status-shell.ts",
  "apps/web/src/styles.css",
  "apps/web/vite.config.ts",
  "apps/web/tsconfig.json",
]);

export const PROTECTED_PATH_PREFIXES = Object.freeze([
  "modules/",
  "docs/modules/",
  "desktop/",
  "worker/",
  "deployment/",
  "service-worker/",
  "server/",
  "tests/smoke",
  "tests/characterization/",
]);

const PACKET_PATH = "reengineering/PHASE4_IMPLEMENTATION_PACKET.md";
const PACKET_SCHEMA = "latticework.phase4-implementation-packet.v2";
const TEST_LISTENER_PATH =
  "tests/phase4/support/synthetic-stream-fixture.mjs";

function extractPacket(text) {
  for (const match of text.matchAll(/```json\s*([\s\S]*?)```/gu)) {
    const value = JSON.parse(match[1]);
    if (value.schema === PACKET_SCHEMA) return value;
  }
  throw new Error(`missing ${PACKET_SCHEMA} machine lock`);
}

function matchesAnyPrefix(relativePath, prefixes) {
  return prefixes.some((prefix) => relativePath.startsWith(prefix));
}

export function isProtectedImplementationPath(relativePath) {
  return (
    PROTECTED_PHASE3_EXACT_PATHS.includes(relativePath) ||
    PROTECTED_EXACT_PATHS.includes(relativePath) ||
    matchesAnyPrefix(relativePath, PROTECTED_PHASE3_PATH_PREFIXES) ||
    matchesAnyPrefix(relativePath, PROTECTED_PATH_PREFIXES)
  );
}

export function isOwnedImplementationPath(relativePath) {
  if (isProtectedImplementationPath(relativePath)) return false;
  return (
    OWNED_EXACT_PATHS.includes(relativePath) ||
    matchesAnyPrefix(relativePath, OWNED_PATH_PREFIXES)
  );
}

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function assertExactPacket(packet) {
  assert.equal(packet.accepted, true, "packet must be accepted");
  assert.equal(
    packet.acceptance_receipt,
    "Continue and consider anything you write as accepted.",
    "acceptance receipt drifted",
  );
  assert.equal(
    packet.implementation_base_sha,
    IMPLEMENTATION_BASE_SHA,
    "implementation base drifted",
  );
  assert.equal(
    packet.implementation_authorized,
    true,
    "implementation_authorized must be true",
  );
  assert.equal(packet.entrypoint, "apps/web/p4.html");
  assert.equal(packet.entrypoint_default, false);
  assert.equal(packet.production_build_authorized, false);
  assert.equal(packet.legacy_default_unchanged, true);
  assert.equal(packet.synthetic_mock_only, true);
  for (const key of [
    "real_data_authorized",
    "real_credentials_authorized",
    "real_provider_traffic_authorized",
    "activation_authorized",
    "deployment_authorized",
    "cutover_authorized",
    "fallback_authorized",
    "application_listener",
  ]) {
    assert.equal(packet[key], false, `${key} must remain false`);
  }
  assert.equal(packet.test_listener, true, "test_listener must be true");
  assert.equal(packet.candidate_storage, "latticework::conversation");
  assert.equal(packet.candidate_storage_synthetic_only, true);
  assert.deepEqual(packet.provider_adapters, ["mock-local", "mock-cloud"]);
  assert.equal(packet.retry_count, 0);
  assert.deepEqual(
    packet.test_listener_contract,
    {
      only_path: TEST_LISTENER_PATH,
      bind: "127.0.0.1",
      port: "os-selected",
      requested_port: 0,
      run_owned: true,
      fixture_only: true,
      synthetic_only: true,
      external_egress: false,
    },
    "test_listener_contract drifted",
  );
  assert.deepEqual(
    packet.owned_exact_paths,
    [...OWNED_EXACT_PATHS],
    "owned_exact_paths drifted",
  );
  assert.deepEqual(packet.owned_path_prefixes, [...OWNED_PATH_PREFIXES]);
  assert.deepEqual(
    packet.protected_phase3_exact_paths,
    [...PROTECTED_PHASE3_EXACT_PATHS],
    "protected_phase3_exact_paths drifted",
  );
  assert.deepEqual(
    packet.protected_phase3_path_prefixes,
    [...PROTECTED_PHASE3_PATH_PREFIXES],
  );
  assert.deepEqual(packet.protected_exact_paths, [...PROTECTED_EXACT_PATHS]);
  assert.deepEqual(packet.protected_path_prefixes, [...PROTECTED_PATH_PREFIXES]);
  assert.equal(packet.required_prior_gate, "LW-P4-RETEST-001-GREEN");
  assert.equal(packet.required_next_authority, "none-within-this-packet");
}

const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".html"]);
const FORBIDDEN_SOURCE_PATTERNS = [
  [/\bfetch\s*\(/u, "fetch"],
  [/\bXMLHttpRequest\b/u, "XMLHttpRequest"],
  [/\bWebSocket\b/u, "WebSocket"],
  [/\bEventSource\b/u, "EventSource"],
  [/\bWebTransport\b/u, "WebTransport"],
  [/\bRTCPeerConnection\b/u, "RTCPeerConnection"],
  [/\bprocess\.env\b/u, "ambient process.env"],
  [/\bFreeLatticeConversationSourceReader\b/u, "legacy source reader"],
  [/\bConversationMigrationService\b/u, "migration service"],
  [/\bFreeLatticeDB\b/u, "legacy database"],
  [/\b(?:migration|staging)[_-]?namespace\b/iu, "migration/staging namespace"],
  [/\bactivateCandidate\b|\bsetReadOwner\b/iu, "activation/read-owner switch"],
  [/@latticework\/(?:providers|storage)\//u, "Phase 3 deep import"],
  [/\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|credential)\b/iu, "credential surface"],
];
const LISTENER_PATTERNS = [
  [/\bcreateServer\s*\(/u, "createServer"],
  [/\.listen\s*\(/u, "listen"],
  [/\bDeno\.serve\b/u, "Deno.serve"],
  [/\bBun\.serve\b/u, "Bun.serve"],
  [/\bnode:(?:http|https|net|tls)\b/u, "Node network module"],
];

function scanCandidateSources(root, activePaths, failures) {
  for (const relativePath of activePaths) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(relativePath))) continue;
    const isCandidateSource =
      relativePath.startsWith("packages/chat/") ||
      relativePath === "packages/contracts/src/chat.ts" ||
      relativePath.startsWith("apps/web/src/p4") ||
      relativePath === "apps/web/p4.html" ||
      relativePath.startsWith("tests/phase4/");
    if (!isCandidateSource) continue;
    const text = fs.readFileSync(absolute, "utf8");
    for (const [pattern, label] of FORBIDDEN_SOURCE_PATTERNS) {
      if (pattern.test(text)) {
        failures.push(`${relativePath}: forbidden ${label}`);
      }
    }
    const listenerAllowed = relativePath === TEST_LISTENER_PATH;
    for (const [pattern, label] of LISTENER_PATTERNS) {
      if (!listenerAllowed && pattern.test(text)) {
        failures.push(`${relativePath}: forbidden application listener primitive ${label}`);
      }
    }
    if (listenerAllowed) {
      for (const required of [
        /127\.0\.0\.1/u,
        /\.listen\s*\(\s*0\s*,\s*["']127\.0\.0\.1["']/u,
        /\.close\s*\(/u,
      ]) {
        if (!required.test(text)) {
          failures.push(
            `${relativePath}: test listener contract must use exact loopback port 0 and an explicit close lifecycle`,
          );
          break;
        }
      }
      for (const [pattern, label] of [
        [/\bnode:(?:dns|https|net|tls)\b/u, "outbound-capable module"],
        [/\bfetch\s*\(/u, "fetch"],
        [/\bhttps?\.(?:get|request)\s*\(/u, "outbound request"],
      ]) {
        if (pattern.test(text)) {
          failures.push(`${relativePath}: forbidden fixture ${label}`);
        }
      }
    }
  }
}

function validatePackageBoundaries(root, failures) {
  const chatPackagePath = path.join(root, "packages/chat/package.json");
  if (fs.existsSync(chatPackagePath)) {
    const chatPackage = JSON.parse(fs.readFileSync(chatPackagePath, "utf8"));
    assert.deepEqual(
      chatPackage.dependencies ?? {},
      { "@latticework/contracts": "0.0.0" },
      "@latticework/chat may depend only on @latticework/contracts",
    );
  }

  const appPackagePath = path.join(root, "apps/web/package.json");
  if (fs.existsSync(path.join(root, "apps/web/p4.html"))) {
    const appPackage = JSON.parse(fs.readFileSync(appPackagePath, "utf8"));
    for (const dependency of [
      "@latticework/chat",
      "@latticework/providers",
      "@latticework/storage",
    ]) {
      if (appPackage.dependencies?.[dependency] !== "0.0.0") {
        failures.push(`apps/web/package.json: missing exact ${dependency} dependency`);
      }
    }
  }
}

export function validatePhase4ImplementationScope({
  workspaceRoot,
  checkGitScope = true,
  activePaths: suppliedActivePaths,
} = {}) {
  const root = path.resolve(workspaceRoot ?? process.cwd());
  const failures = [];
  let activePaths = suppliedActivePaths ?? [];
  let packet;

  try {
    packet = extractPacket(fs.readFileSync(path.join(root, PACKET_PATH), "utf8"));
    assertExactPacket(packet);

    if (checkGitScope) {
      git(root, ["merge-base", "--is-ancestor", IMPLEMENTATION_BASE_SHA, "HEAD"]);
      activePaths = collectActiveRangePaths(root, IMPLEMENTATION_BASE_SHA);
    }

    for (const relativePath of activePaths) {
      if (isProtectedImplementationPath(relativePath)) {
        failures.push(`protected implementation path changed: ${relativePath}`);
      } else if (!isOwnedImplementationPath(relativePath)) {
        failures.push(`unowned implementation path changed: ${relativePath}`);
      }
    }

    if (checkGitScope) {
      for (const relativePath of [
        ...PROTECTED_PHASE3_EXACT_PATHS,
        ...PROTECTED_EXACT_PATHS,
      ]) {
        const diff = spawnSync(
          "git",
          ["diff", "--quiet", IMPLEMENTATION_BASE_SHA, "--", relativePath],
          { cwd: root, windowsHide: true },
        );
        if (diff.status !== 0) {
          failures.push(`protected path is not byte-identical to base: ${relativePath}`);
        }
      }
    }

    scanCandidateSources(root, activePaths, failures);
    validatePackageBoundaries(root, failures);
  } catch (error) {
    failures.push(error.message);
  }

  return {
    schema: "latticework.phase4-implementation-scope-validation.v1",
    valid: failures.length === 0,
    scopeChecked: checkGitScope,
    implementationBaseSha: IMPLEMENTATION_BASE_SHA,
    inspectedPathCount: activePaths.length,
    applicationListener: packet?.application_listener ?? null,
    testListener: packet?.test_listener ?? null,
    failures: [...new Set(failures)].sort(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) {
    process.stderr.write(
      "Phase 4 implementation validator accepts no CLI base or scope overrides.\n",
    );
    process.exitCode = 2;
  } else {
    const result = validatePhase4ImplementationScope();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  }
}
