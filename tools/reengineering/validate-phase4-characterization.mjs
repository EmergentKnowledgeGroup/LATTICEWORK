#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { findReparsePoint, isStrictDescendant, parseNamedArgs, writeJson } from "./evidence-common.mjs";

const BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const BASE_COMMIT = "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd";
const REQUIRED_GATES = [
  "phase-closed-scope", "immutable-baseline", "fixture-schema",
  "onboarding-provider-setup", "chat-send-stream-cancel-retry-error",
  "conversation-persistence-reload-recovery", "signal-report-privacy-clipboard",
  "responsive-accessibility", "offline-denied-egress", "content-free-scan",
  "repository-controls", "evidence-manifest", "independent-clean-worktree", "hygiene",
];
const GROUPS = {
  "P4-ONB-001": ["P4-ONB-001A", "P4-ONB-001B", "P4-ONB-001C"],
  "P4-CHAT-001": ["P4-CHAT-001A"], "P4-CHAT-002": ["P4-CHAT-002A"],
  "P4-CHAT-003": ["P4-CHAT-003A", "P4-CHAT-003B"], "P4-CHAT-004": ["P4-CHAT-004A"],
  "P4-CHAT-005": ["P4-CHAT-005A", "P4-CHAT-005B", "P4-CHAT-005C"],
  "P4-CHAT-006": ["P4-CHAT-006A", "P4-CHAT-006B"], "P4-CHAT-007": ["P4-CHAT-007A", "P4-CHAT-007B"],
  "P4-CHAT-008": ["P4-CHAT-008A", "P4-CHAT-008B"],
  "P4-CHAT-009": ["P4-CHAT-009A", "P4-CHAT-009B", "P4-CHAT-009C", "P4-CHAT-009D", "P4-CHAT-009E"],
  "P4-CHAT-010": ["P4-CHAT-010A", "P4-CHAT-010B"],
  "P4-SIG-001": ["P4-SIG-001A", "P4-SIG-001B", "P4-SIG-001C"], "P4-RESP-001": ["P4-RESP-001A"],
  "P4-A11Y-001": ["P4-A11Y-001A", "P4-A11Y-001B", "P4-A11Y-001C"], "P4-DEG-001": ["P4-DEG-001A"],
  "P4-EGR-001": ["P4-EGR-001A", "P4-EGR-001B", "P4-EGR-001C", "P4-EGR-001D", "P4-EGR-001E", "P4-EGR-001F", "P4-EGR-001G"],
};
const EXPECTED_LOCAL_TARGET = "http://localhost:11434/v1/chat/completions";
const EXPECTED_CLOUD_TARGET = "https://api.openai.com/v1/chat/completions";
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/u, /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:PRIVATE|SECRET)_(?:SENTINEL|TOKEN|KEY)(?:_[A-Z0-9_]+)?\b/u,
  /\b(?:P4_)?(?:PRIVATE|CREDENTIAL|PROMPT|RESPONSE)_(?:SENTINEL|CONTENT|VALUE)[A-Z0-9_]*\b/u,
];

function readJson(filePath, failures, label) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("must be a JSON object");
    return value;
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function extractLock(workspaceRoot, failures) {
  try {
    const markdown = fs.readFileSync(path.join(workspaceRoot, "reengineering", "PHASE4_PREFLIGHT.md"), "utf8");
    for (const match of markdown.matchAll(/```json\s*\r?\n([\s\S]*?)\r?\n```/gu)) {
      const candidate = JSON.parse(match[1]);
      if (candidate?.schema === "latticework.phase4-characterization-preflight.v1") return candidate;
    }
    failures.push("Phase 4 machine lock fenced JSON block is missing");
  } catch (error) {
    failures.push(`Phase 4 machine lock cannot be extracted: ${error.message}`);
  }
  return null;
}

function resolveArtifact(root, artifactPath, failures) {
  if (typeof artifactPath !== "string" || artifactPath.length === 0 || artifactPath.includes("\\") || path.posix.isAbsolute(artifactPath)) {
    failures.push(`artifact path is not canonical: ${String(artifactPath)}`);
    return null;
  }
  const normalized = path.posix.normalize(artifactPath);
  if (normalized !== artifactPath || normalized === "." || normalized.startsWith("../")) {
    failures.push(`artifact path traverses the evidence bundle: ${artifactPath}`);
    return null;
  }
  const absolute = path.resolve(root, ...artifactPath.split("/"));
  if (!isStrictDescendant(absolute, root)) {
    failures.push(`artifact path escapes the evidence bundle: ${artifactPath}`);
    return null;
  }
  let current = root;
  for (const segment of artifactPath.split("/")) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) { failures.push(`artifact is missing: ${artifactPath}`); return null; }
    if (fs.lstatSync(current).isSymbolicLink()) { failures.push(`artifact traverses a reparse point: ${artifactPath}`); return null; }
  }
  if (!fs.statSync(absolute).isFile()) { failures.push(`artifact is not a file: ${artifactPath}`); return null; }
  return absolute;
}

function validateManifest(root, manifest, failures) {
  const paths = new Set();
  const artifacts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  for (const artifact of artifacts) {
    const artifactPath = artifact?.path;
    if (paths.has(artifactPath)) { failures.push(`duplicate manifest artifact path: ${String(artifactPath)}`); continue; }
    paths.add(artifactPath);
    const absolute = resolveArtifact(root, artifactPath, failures);
    if (!absolute) continue;
    if (artifact?.bytes !== fs.statSync(absolute).size) failures.push(`byte count mismatch for ${artifactPath}`);
    if (artifact?.sha256 !== sha256(absolute)) failures.push(`hash mismatch for ${artifactPath}`);
  }
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replaceAll("\\", "/");
      const stats = fs.lstatSync(absolute);
      if (stats.isSymbolicLink()) { failures.push(`evidence bundle contains a reparse point: ${relative}`); continue; }
      if (entry.isDirectory()) visit(absolute);
      if (entry.isFile() && relative !== "manifest.json" && !paths.has(relative)) failures.push(`evidence artifact is not receipted by the manifest: ${relative}`);
    }
  };
  visit(root);
  return { artifacts, paths };
}

function hasExpectedRequest(requests, target) {
  return Array.isArray(requests) && requests.some((item) => item?.target === target && item?.observed === true && item?.transmitted === false);
}

function validateResult(result, seenProfiles, runRoot, workspaceRoot, failures) {
  if (result?.status !== "PASS") failures.push(`${result?.id ?? "unknown"} must be PASS; UNKNOWN, CONDITIONAL, FAIL, SKIP, TODO, and expected failures are not accepted`);
  const profile = result?.profile;
  if (typeof profile?.id !== "string" || seenProfiles.has(profile.id)) failures.push(`${result?.id ?? "unknown"} must have a fresh unique profile`);
  seenProfiles.add(profile?.id);
  if (profile?.id !== `P4-PROFILE-${result?.id}` || profile?.synthetic !== true || profile?.empty_at_creation !== true || profile?.ownership_marker !== "phase4-run-marker-v1" || profile?.created_for_subcase !== result?.id || profile?.cleanup?.proven !== true || profile?.cleanup?.deleted !== true || profile?.cleanup?.no_reparse !== true) failures.push(`${result?.id ?? "unknown"} profile receipt is not a fresh owned synthetic cleanup receipt`);
  if (typeof profile?.path !== "string") {
    failures.push(`${result?.id ?? "unknown"} profile path is missing`);
  } else {
    const profilePath = path.resolve(profile.path);
    if (!isStrictDescendant(profilePath, runRoot) || !isStrictDescendant(profilePath, workspaceRoot)) failures.push(`${result?.id ?? "unknown"} profile path escapes its run-owned staging root`);
    if (fs.existsSync(profilePath)) failures.push(`${result?.id ?? "unknown"} profile cleanup claims deletion but the profile path still exists`);
    const reparse = findReparsePoint(profilePath, runRoot);
    if (reparse && fs.existsSync(reparse) && fs.lstatSync(reparse).isSymbolicLink()) failures.push(`${result?.id ?? "unknown"} profile path traverses a reparse point`);
  }
  const network = result?.network;
  if (network?.denied_egress !== true || network?.unexpected_transmissions !== 0 || network?.wire_transmissions !== 0) failures.push(`${result?.id ?? "unknown"} egress denial receipt is invalid`);
  if (result?.id === "P4-CHAT-001A" && !hasExpectedRequest(network?.expected_fixture_requests, EXPECTED_LOCAL_TARGET)) failures.push("P4-CHAT-001A is missing the expected fixture request");
  if (result?.id === "P4-CHAT-002A" && !hasExpectedRequest(network?.expected_fixture_requests, EXPECTED_CLOUD_TARGET)) failures.push("P4-CHAT-002A is missing the expected fixture request");
  if (result?.id?.startsWith("P4-EGR-001") && network?.expected_abort !== true) failures.push(`${result.id} must prove the expected injected egress abort`);
  if (result?.operation?.post_delta_retry !== false) failures.push(`${result?.id ?? "unknown"} permits a post-delta retry`);
  if (result?.operation?.duplicate_terminal !== false) failures.push(`${result?.id ?? "unknown"} permits a duplicate terminal`);
}

function validateResults(summary, workspaceRoot, failures) {
  const results = Array.isArray(summary?.results) ? summary.results : [];
  if (results.length !== 39) failures.push("Phase 4 evidence must contain exactly 39 atomic results");
  const expected = new Map(Object.entries(GROUPS).flatMap(([group, ids]) => ids.map((id) => [id, group])));
  const seenIds = new Set();
  const seenProfiles = new Set();
  const runRoot = path.resolve(summary?.run?.staging_root ?? "");
  if (!isStrictDescendant(runRoot, workspaceRoot) || !runRoot.replaceAll("\\", "/").includes("/runtime/tmp/")) failures.push("run staging root must be a strict repository runtime/tmp descendant");
  for (const result of results) {
    if (seenIds.has(result?.id)) failures.push(`duplicate atomic subcase result: ${String(result?.id)}`);
    seenIds.add(result?.id);
    if (expected.get(result?.id) !== result?.group) failures.push(`atomic subcase/group mapping is invalid: ${String(result?.id)}`);
    validateResult(result, seenProfiles, runRoot, workspaceRoot, failures);
  }
  for (const [id] of expected) if (!seenIds.has(id)) failures.push(`mandatory atomic subcase is missing: ${id}`);
  return results;
}

function validateGates(root, summary, artifactPaths, failures) {
  const gates = summary?.gates;
  if (!gates || typeof gates !== "object" || Array.isArray(gates) || Object.keys(gates).length !== REQUIRED_GATES.length) { failures.push("Phase 4 evidence must contain exactly 14 gates"); return; }
  for (const gate of REQUIRED_GATES) {
    const record = gates[gate];
    if (record?.status !== "PASS" || typeof record?.receipt !== "string" || !artifactPaths.has(record.receipt)) { failures.push(`${gate} gate is missing a receipted PASS result`); continue; }
    const receiptPath = resolveArtifact(root, record.receipt, failures);
    const receipt = receiptPath && readJson(receiptPath, failures, `${gate} receipt`);
    if (receipt && (receipt.exit_code !== 0 || receipt.baseline_sha !== summary.baseline_sha || receipt.base_commit !== summary.base_commit || receipt.candidate_sha !== summary.candidate_sha)) failures.push(`${gate} gate receipt identity or exit status is invalid`);
  }
}

function validateRun(summary, root, artifactPaths, workspaceRoot, failures) {
  const run = summary?.run;
  if (run?.ownership_marker !== "phase4-run-marker-v1" || run?.cleanup?.proven !== true || run?.cleanup?.deleted !== true || run?.cleanup?.no_reparse !== true) failures.push("run cleanup and ownership marker receipt is invalid");
  const server = run?.static_server;
  if (server?.bind !== "127.0.0.1" || server?.started !== true || server?.stopped !== true || !artifactPaths.has(server?.startup_receipt) || !artifactPaths.has(server?.cleanup_receipt)) failures.push("static-server startup/cleanup receipts are incomplete");
  const runRoot = typeof run?.staging_root === "string" ? path.resolve(run.staging_root) : null;
  if (runRoot && fs.existsSync(runRoot)) {
    failures.push("run cleanup claims deletion but the staging root still exists");
    const reparse = findReparsePoint(runRoot, workspaceRoot);
    if (reparse && fs.lstatSync(reparse).isSymbolicLink()) failures.push("run staging root traverses a reparse point");
  }
}

function validateContentFree(root, summary, failures) {
  if (summary?.content_scan?.scanned !== true || summary?.content_scan?.findings !== 0) failures.push("content-free secret/sentinel scan receipt is invalid");
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      if (entry.isFile()) {
        const content = fs.readFileSync(absolute).toString("latin1");
        if (SECRET_PATTERNS.some((pattern) => pattern.test(content))) failures.push(`content-free scan found secret/private sentinel content in ${path.relative(root, absolute).replaceAll("\\", "/")}`);
      }
    }
  };
  visit(root);
}

function validateIndependentReview(root, summary, artifactPaths, workspaceRoot, failures) {
  const review = summary?.independent_review;
  if (review?.required !== true || typeof review?.receipt !== "string" || !artifactPaths.has(review.receipt)) { failures.push("independent clean-worktree review receipt is required"); return; }
  const reviewPath = resolveArtifact(root, review.receipt, failures);
  const evidence = reviewPath && readJson(reviewPath, failures, "independent clean-worktree review");
  const worktree = evidence?.worktree;
  const worktreeRoot = typeof worktree?.root === "string" ? path.resolve(worktree.root) : null;
  if (evidence?.schema !== "latticework.phase4-independent-review.v1" || evidence?.verdict !== "GREEN" || typeof evidence?.reviewer !== "string" || !/independent/i.test(evidence.reviewer) || evidence?.baseline_sha !== summary.baseline_sha || evidence?.base_commit !== summary.base_commit || evidence?.candidate_sha !== summary.candidate_sha || worktree?.clean_start !== true || worktree?.clean_end !== true || !worktreeRoot || worktreeRoot === workspaceRoot || isStrictDescendant(worktreeRoot, workspaceRoot)) failures.push("independent clean-worktree review is not a GREEN separate clean reproduction");
}

export function validatePhase4Characterization({ workspaceRoot, evidenceDirectory }) {
  const root = path.resolve(workspaceRoot);
  const evidenceRoot = path.resolve(evidenceDirectory);
  const failures = [];
  if (!isStrictDescendant(evidenceRoot, root)) return { schema: "latticework.phase4-characterization-validation.v1", valid: false, atomicPasses: 0, groups: 0, gates: 0, failures: ["evidence directory must be a strict repository descendant"] };
  const lock = extractLock(root, failures);
  const summary = readJson(path.join(evidenceRoot, "summary.json"), failures, "Phase 4 summary");
  const manifest = readJson(path.join(evidenceRoot, "manifest.json"), failures, "Phase 4 artifact manifest");
  if (summary) {
    if (summary.schema !== "latticework.phase4-characterization-summary.v1" || summary.work_id !== "LW-P4-CHAR-001" || summary.status !== "GREEN" || summary.baseline_sha !== BASELINE_SHA || summary.base_commit !== BASE_COMMIT || !/^[0-9a-f]{40}$/u.test(summary.candidate_sha ?? "")) failures.push("Phase 4 summary baseline/base/candidate identity or GREEN status is invalid");
    if (!lock || !isDeepStrictEqual(summary.machine_lock, lock)) failures.push("Phase 4 evidence machine lock does not exactly match the preflight lock");
  }
  if (manifest && (manifest.schema !== "latticework.evidence.artifact-bundle.v1" || manifest.receipt_id !== "LW-P4-CHAR-001-bundle" || manifest.baseline_sha !== summary?.baseline_sha || manifest.base_commit !== summary?.base_commit || manifest.candidate_sha !== summary?.candidate_sha)) failures.push("Phase 4 artifact manifest identity is invalid");
  const { paths } = manifest ? validateManifest(evidenceRoot, manifest, failures) : { paths: new Set() };
  if (!paths.has("summary.json")) failures.push("summary.json is not receipted by the artifact manifest");
  let results = [];
  if (summary) {
    results = validateResults(summary, root, failures);
    validateGates(evidenceRoot, summary, paths, failures);
    validateRun(summary, evidenceRoot, paths, root, failures);
    validateContentFree(evidenceRoot, summary, failures);
    validateIndependentReview(evidenceRoot, summary, paths, root, failures);
  }
  return { schema: "latticework.phase4-characterization-validation.v1", valid: failures.length === 0, atomicPasses: results.filter((result) => result?.status === "PASS").length, groups: new Set(results.map((result) => result?.group)).size, gates: summary?.gates ? Object.keys(summary.gates).length : 0, failures };
}

function isMain() { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length || !options.evidence) throw new Error("Usage: validate-phase4-characterization.mjs --evidence PATH [--output PATH]");
    const workspaceRoot = process.cwd();
    const result = validatePhase4Characterization({ workspaceRoot, evidenceDirectory: options.evidence });
    if (options.output) writeJson(path.resolve(workspaceRoot, options.output), result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
