#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isStrictDescendant,
  parseNamedArgs,
  writeJson,
} from "./evidence-common.mjs";

const EXPECTED_BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const EXPECTED_IMPLEMENTATION_BASE =
  "93a36626f786a880210c53b8486c961e8b86e9ea";
const REQUIRED_GATES = [
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
const INDEPENDENT_GATES = [
  "strict-typecheck",
  "node-unit",
  "browser-indexeddb",
  "provider-no-egress",
  "protected-boundary",
  "deterministic-build",
  "lockfile-replay",
  "supply-chain",
  "full-repository-controls",
  "diff-and-json-hygiene",
];
const INDEPENDENT_COMMAND_MARKERS = {
  "strict-typecheck": "npm run p3:typecheck",
  "node-unit": "npm run p3:test",
  "browser-indexeddb": "npm run p3:browser",
  "provider-no-egress":
    "tests/reengineering/phase3-provider-boundary.test.mjs",
  "protected-boundary": "tools/reengineering/verify-phase3-boundary.mjs",
  "deterministic-build": "tools/reengineering/verify-phase2-build.mjs",
  "lockfile-replay": "npm install --package-lock-only --ignore-scripts",
  "supply-chain": "tools/reengineering/collect-phase2-supply-chain.mjs",
  "full-repository-controls": "tests/reengineering/*.test.mjs",
  "diff-and-json-hygiene": "validate-phase3-preflight.mjs",
};
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:PRIVATE|SECRET)_(?:SENTINEL|TOKEN|KEY)(?:_[A-Z0-9_]+)?\b/,
];
const TEXT_EXTENSIONS = new Set([
  ".csv",
  ".json",
  ".log",
  ".md",
  ".txt",
  ".tsv",
  ".yaml",
  ".yml",
]);

function readJson(filePath, failures, label) {
  try {
    const value = JSON.parse(
      fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""),
    );
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      failures.push(`${label} must be a JSON object`);
      return null;
    }
    return value;
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function resolveArtifact(root, artifactPath, failures) {
  if (
    typeof artifactPath !== "string" ||
    artifactPath.length === 0 ||
    artifactPath.includes("\\") ||
    path.posix.isAbsolute(artifactPath)
  ) {
    failures.push(`artifact path is not canonical: ${String(artifactPath)}`);
    return null;
  }
  const normalized = path.posix.normalize(artifactPath);
  if (normalized !== artifactPath || normalized.startsWith("../")) {
    failures.push(`artifact path traverses the bundle: ${artifactPath}`);
    return null;
  }
  const absolute = path.resolve(root, ...artifactPath.split("/"));
  if (!isStrictDescendant(absolute, root)) {
    failures.push(`artifact path escapes the bundle: ${artifactPath}`);
    return null;
  }
  let current = root;
  for (const segment of artifactPath.split("/")) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      failures.push(`artifact is missing: ${artifactPath}`);
      return null;
    }
    if (fs.lstatSync(current).isSymbolicLink()) {
      failures.push(`artifact traverses a symbolic link: ${artifactPath}`);
      return null;
    }
  }
  if (!fs.statSync(absolute).isFile()) {
    failures.push(`artifact is not a file: ${artifactPath}`);
    return null;
  }
  return absolute;
}

function validateArtifacts(root, manifest, failures) {
  const artifacts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  const paths = new Set();
  for (const artifact of artifacts) {
    const artifactPath = artifact?.path;
    if (paths.has(artifactPath)) {
      failures.push(`duplicate artifact path: ${String(artifactPath)}`);
      continue;
    }
    paths.add(artifactPath);
    const absolute = resolveArtifact(root, artifactPath, failures);
    if (!absolute) continue;
    const bytes = fs.statSync(absolute).size;
    const hash = sha256(absolute);
    if (artifact?.bytes !== bytes) {
      failures.push(`byte count mismatch for ${artifactPath}`);
    }
    if (artifact?.sha256 !== hash) {
      failures.push(`hash mismatch for ${artifactPath}`);
    }
    if (TEXT_EXTENSIONS.has(path.extname(absolute).toLowerCase())) {
      const text = fs.readFileSync(absolute, "utf8");
      if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
        failures.push(`secret-like content found in ${artifactPath}`);
      }
    }
  }
  return { artifacts, paths };
}

function validateManifestCompleteness(root, artifactPaths, failures) {
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const stats = fs.lstatSync(absolute);
      if (stats.isSymbolicLink()) {
        failures.push(
          `evidence bundle contains a symbolic link: ${path.relative(root, absolute).replaceAll("\\", "/")}`,
        );
        continue;
      }
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = path.relative(root, absolute).replaceAll("\\", "/");
      if (relativePath !== "manifest.json" && !artifactPaths.has(relativePath)) {
        failures.push(`evidence artifact is not receipted by the manifest: ${relativePath}`);
      }
    }
  };
  visit(root);
}

function validateSummary(summary, failures) {
  if (
    summary?.schema !== "latticework.phase3-summary.v1" ||
    summary?.work_id !== "LW-P3-001" ||
    summary?.evidence_label !== "MEASURED" ||
    summary?.valid !== true ||
    summary?.baseline_sha !== EXPECTED_BASELINE_SHA ||
    summary?.implementation_base_commit !== EXPECTED_IMPLEMENTATION_BASE ||
    !/^[0-9a-f]{40}$/.test(summary?.candidate_sha ?? "")
  ) {
    failures.push("Phase 3 summary identity or validity is incorrect");
  }
  const expectedSafety = {
    real_user_data: "not-accessed",
    real_provider_traffic: "none",
    real_credentials: "none",
    listener: "none",
    legacy_mutation: "none",
    candidate_activation: "none",
    cutover: "none",
  };
  if (JSON.stringify(summary?.safety) !== JSON.stringify(expectedSafety)) {
    failures.push("Phase 3 summary safety boundary is not exact");
  }
}

function validateGates(root, summary, artifactPaths, failures) {
  const gates = summary?.gates;
  if (
    !gates ||
    typeof gates !== "object" ||
    Array.isArray(gates) ||
    Object.keys(gates).length !== REQUIRED_GATES.length
  ) {
    failures.push("Phase 3 summary must contain exactly 12 gates");
    return;
  }
  for (const gate of REQUIRED_GATES) {
    const record = gates[gate];
    if (
      record?.valid !== true ||
      typeof record?.receipt !== "string" ||
      !artifactPaths.has(record.receipt)
    ) {
      failures.push(`${gate} gate is missing a valid receipted result`);
      continue;
    }
    const receiptPath = resolveArtifact(root, record.receipt, failures);
    if (!receiptPath) continue;
    const receipt = readJson(receiptPath, failures, `${gate} command receipt`);
    if (!receipt) continue;
    if (receipt.exit_code !== 0) {
      failures.push(`${gate} command receipt has exit code ${String(receipt.exit_code)}`);
    }
    if (
      receipt.baseline_sha !== EXPECTED_BASELINE_SHA ||
      receipt.candidate_sha !== summary.candidate_sha
    ) {
      failures.push(`${gate} command receipt identity does not match the summary`);
    }
  }
}

function validateIndependentReview(
  workspaceRoot,
  root,
  summary,
  artifactPaths,
  requireIndependentReview,
  failures,
) {
  if (!requireIndependentReview) return;
  const reviewRoot = path.join(root, "independent-review");
  const result = validatePhase3IndependentReview({
    workspaceRoot,
    reviewDirectory: reviewRoot,
    candidateSha: summary.candidate_sha,
  });
  failures.push(...result.failures);
  for (const requiredPath of result.requiredArtifacts) {
    const bundlePath = `independent-review/${requiredPath}`;
    if (!artifactPaths.has(bundlePath)) {
      failures.push(
        `independent review artifact is not receipted by the final manifest: ${bundlePath}`,
      );
    }
  }
}

function normalizedFsPath(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (/^[A-Za-z]:[\\/]/u.test(value)) {
    return `win32:${path.win32.resolve(value).toLowerCase()}`;
  }
  if (path.posix.isAbsolute(value)) {
    return `posix:${path.posix.resolve(value)}`;
  }
  return null;
}

function recordedPathIsStrictDescendant(candidate, parent) {
  const child = normalizedFsPath(candidate);
  const root = normalizedFsPath(parent);
  if (!child || !root || child.slice(0, 6) !== root.slice(0, 6)) return false;
  const separator = child.startsWith("win32:") ? "\\" : "/";
  return child.startsWith(`${root.replace(/[\\/]+$/u, "")}${separator}`);
}

function capturedStatusIsClean(status) {
  if (typeof status !== "string") return false;
  const lines = status.split(/\r?\n/u).filter((line) => line.length > 0);
  return lines.length === 1 && lines[0] === "## HEAD (no branch)";
}

function validateIndependentCommandReceipt({
  reviewRoot,
  receiptPath,
  label,
  marker,
  candidateSha,
  worktreeRoot,
  allowDescendantCwd = false,
  requireEmptyStdout = false,
  failures,
  requiredArtifacts,
}) {
  requiredArtifacts.add(receiptPath);
  const absolute = resolveArtifact(reviewRoot, receiptPath, failures);
  if (!absolute) return;
  const receipt = readJson(absolute, failures, `${label} receipt`);
  if (!receipt) return;
  if (
    receipt.schema !== "latticework.evidence.command.v1" ||
    receipt.exit_code !== 0 ||
    receipt.baseline_sha !== EXPECTED_BASELINE_SHA ||
    receipt.candidate_sha !== candidateSha
  ) {
    failures.push(`${label} receipt identity or exit status is invalid`);
  }
  const cwdIdentifiesWorktree =
    normalizedFsPath(receipt.cwd) === normalizedFsPath(worktreeRoot) ||
    (allowDescendantCwd &&
      recordedPathIsStrictDescendant(receipt.cwd, worktreeRoot));
  if (!cwdIdentifiesWorktree || receipt.repository?.head !== candidateSha) {
    failures.push(`${label} receipt does not identify the independent candidate worktree`);
  }
  if (!capturedStatusIsClean(receipt.repository?.status)) {
    failures.push(`${label} receipt did not capture a clean detached worktree`);
  }
  const command = Array.isArray(receipt.command)
    ? receipt.command.join(" ")
    : "";
  if (!command.includes(marker)) {
    failures.push(`${label} receipt does not prove the required command`);
  }
  if (requireEmptyStdout) {
    const stdoutPath = `${path.posix.dirname(receiptPath)}/stdout.log`;
    requiredArtifacts.add(stdoutPath);
    const stdout = resolveArtifact(reviewRoot, stdoutPath, failures);
    if (stdout && fs.readFileSync(stdout, "utf8").trim() !== "") {
      failures.push(`${label} worktree status output is not clean`);
    }
  }
}

export function validatePhase3IndependentReview({
  workspaceRoot,
  reviewDirectory,
  candidateSha,
}) {
  const root = path.resolve(workspaceRoot);
  const reviewRoot = path.resolve(reviewDirectory);
  if (!isStrictDescendant(reviewRoot, root)) {
    throw new Error(
      "Phase 3 independent review evidence must be a strict repository descendant",
    );
  }
  const failures = [];
  const requiredArtifacts = new Set(["automation.json", "REVIEW.md"]);
  const automationPath = path.join(reviewRoot, "automation.json");
  if (!fs.existsSync(automationPath)) {
    failures.push("independent review automation is missing");
    return {
      schema: "latticework.phase3-independent-review-validation.v1",
      valid: false,
      candidateSha,
      requiredArtifacts: [...requiredArtifacts].sort(),
      failures,
    };
  }
  const automation = readJson(
    automationPath,
    failures,
    "independent review automation",
  );
  const worktreeRoot = automation?.worktree?.root;
  const normalizedWorkspace = normalizedFsPath(root);
  const normalizedWorktree = normalizedFsPath(worktreeRoot);
  if (
    automation?.schema !== "latticework.phase3-independent-review.v1" ||
    automation?.work_id !== "LW-P3-001" ||
    automation?.evidence_label !== "MEASURED" ||
    automation?.valid !== true ||
    automation?.verdict !== "AUTOMATED_GATES_GREEN" ||
    automation?.baseline_sha !== EXPECTED_BASELINE_SHA ||
    automation?.implementation_base_commit !== EXPECTED_IMPLEMENTATION_BASE ||
    automation?.candidate_sha !== candidateSha
  ) {
    failures.push("independent review automation identity or verdict is invalid");
  }
  if (
    !normalizedWorktree ||
    normalizedWorktree === normalizedWorkspace ||
    recordedPathIsStrictDescendant(worktreeRoot, root)
  ) {
    failures.push(
      "independent review must record a separate absolute worktree root",
    );
  }
  if (
    automation?.worktree?.clean_start !== true ||
    automation?.worktree?.clean_end !== true
  ) {
    failures.push("independent review must attest clean start and end states");
  }

  const expectedWorktreeReceipts = {
    start_receipt: "commands/worktree-start/manifest.json",
    install_receipt: "commands/install/manifest.json",
    end_receipt: "commands/worktree-end/manifest.json",
  };
  for (const [key, expected] of Object.entries(expectedWorktreeReceipts)) {
    if (automation?.worktree?.[key] !== expected) {
      failures.push(`independent review ${key} is not exact`);
    }
  }
  validateIndependentCommandReceipt({
    reviewRoot,
    receiptPath: expectedWorktreeReceipts.start_receipt,
    label: "worktree-start",
    marker: "git status --porcelain",
    candidateSha,
    worktreeRoot,
    requireEmptyStdout: true,
    failures,
    requiredArtifacts,
  });
  validateIndependentCommandReceipt({
    reviewRoot,
    receiptPath: expectedWorktreeReceipts.install_receipt,
    label: "install",
    marker: "npm ci --ignore-scripts",
    candidateSha,
    worktreeRoot,
    failures,
    requiredArtifacts,
  });
  validateIndependentCommandReceipt({
    reviewRoot,
    receiptPath: expectedWorktreeReceipts.end_receipt,
    label: "worktree-end",
    marker: "git status --porcelain",
    candidateSha,
    worktreeRoot,
    requireEmptyStdout: true,
    failures,
    requiredArtifacts,
  });

  const gates = automation?.gates;
  if (
    !gates ||
    typeof gates !== "object" ||
    Array.isArray(gates) ||
    Object.keys(gates).length !== INDEPENDENT_GATES.length
  ) {
    failures.push("independent review must contain exactly 10 reproduced gates");
  }
  for (const gate of INDEPENDENT_GATES) {
    const expectedReceipt = `commands/${gate}/manifest.json`;
    if (
      gates?.[gate]?.valid !== true ||
      gates?.[gate]?.receipt !== expectedReceipt
    ) {
      failures.push(`${gate} independent review gate is not exact`);
    }
    validateIndependentCommandReceipt({
      reviewRoot,
      receiptPath: expectedReceipt,
      label: gate,
      marker: INDEPENDENT_COMMAND_MARKERS[gate],
      candidateSha,
      worktreeRoot,
      allowDescendantCwd: gate === "lockfile-replay",
      failures,
      requiredArtifacts,
    });
  }
  const controls = automation?.repository_controls;
  if (
    !Number.isInteger(controls?.tests) ||
    controls.tests < 1 ||
    controls?.pass !== controls.tests ||
    controls?.fail !== 0 ||
    controls?.skipped !== 0 ||
    controls?.todo !== 0
  ) {
    failures.push("independent repository controls are not fully green");
  }

  const reviewPath = path.join(reviewRoot, "REVIEW.md");
  if (!fs.existsSync(reviewPath)) {
    failures.push("independent review narrative is missing");
  } else {
    const review = fs.readFileSync(reviewPath, "utf8");
    if (
      !review.includes("# Independent Phase 3 review") ||
      !review.includes("**Verdict:** GREEN") ||
      !review.includes(`**Candidate:** \`${candidateSha}\``) ||
      !review.includes(`**Review worktree:** \`${worktreeRoot}\``) ||
      !review.includes("**Reviewer:** independent native Codex subagent") ||
      !review.includes("## Findings")
    ) {
      failures.push(
        "independent review must record structured GREEN judgment for the exact candidate and worktree",
      );
    }
  }
  return {
    schema: "latticework.phase3-independent-review-validation.v1",
    valid: failures.length === 0,
    candidateSha,
    requiredArtifacts: [...requiredArtifacts].sort(),
    failures,
  };
}

export function validatePhase3Evidence({
  workspaceRoot,
  evidenceDirectory,
  requireIndependentReview = true,
}) {
  const root = path.resolve(workspaceRoot);
  const evidenceRoot = path.resolve(evidenceDirectory);
  if (!isStrictDescendant(evidenceRoot, root)) {
    throw new Error("Phase 3 evidence must be a strict repository descendant");
  }
  const failures = [];
  const summary = readJson(
    path.join(evidenceRoot, "summary.json"),
    failures,
    "Phase 3 summary",
  );
  const manifest = readJson(
    path.join(evidenceRoot, "manifest.json"),
    failures,
    "Phase 3 artifact manifest",
  );
  if (summary) validateSummary(summary, failures);
  if (
    manifest &&
    (manifest.schema !== "latticework.evidence.artifact-bundle.v1" ||
      manifest.receipt_id !== "LW-P3-001-bundle" ||
      manifest.baseline_sha !== EXPECTED_BASELINE_SHA ||
      manifest.candidate_sha !== summary?.candidate_sha)
  ) {
    failures.push("Phase 3 artifact manifest identity is incorrect");
  }
  const { artifacts, paths } = manifest
    ? validateArtifacts(evidenceRoot, manifest, failures)
    : { artifacts: [], paths: new Set() };
  if (manifest) validateManifestCompleteness(evidenceRoot, paths, failures);
  if (!paths.has("summary.json")) {
    failures.push("summary.json is not receipted by the artifact manifest");
  }
  if (summary) {
    validateGates(evidenceRoot, summary, paths, failures);
    validateIndependentReview(
      root,
      evidenceRoot,
      summary,
      paths,
      requireIndependentReview,
      failures,
    );
  }
  return {
    schema: "latticework.phase3-evidence-validation.v1",
    valid: failures.length === 0,
    candidateSha: summary?.candidate_sha ?? null,
    gates: summary?.gates ? Object.keys(summary.gates).length : 0,
    artifacts: artifacts.length,
    independentReviewRequired: requireIndependentReview,
    failures,
  };
}

function isMain() {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    const independentReview = options["independent-review"];
    if (
      command.length > 0 ||
      (!options.evidence && !independentReview) ||
      (options.evidence && independentReview)
    ) {
      throw new Error(
        "Usage: validate-phase3-evidence.mjs (--evidence PATH [--require-independent true|false] | --independent-review PATH --candidate-sha SHA) [--output PATH]",
      );
    }
    const requireIndependentReview =
      options["require-independent"] === undefined
        ? true
        : options["require-independent"] === "true";
    if (
      options["require-independent"] !== undefined &&
      !["true", "false"].includes(options["require-independent"])
    ) {
      throw new Error("--require-independent must be true or false");
    }
    if (
      independentReview &&
      !/^[0-9a-f]{40}$/u.test(options["candidate-sha"] ?? "")
    ) {
      throw new Error(
        "--independent-review requires --candidate-sha with a 40-character lowercase SHA",
      );
    }
    const result = independentReview
      ? validatePhase3IndependentReview({
          workspaceRoot: process.cwd(),
          reviewDirectory: independentReview,
          candidateSha: options["candidate-sha"],
        })
      : validatePhase3Evidence({
          workspaceRoot: process.cwd(),
          evidenceDirectory: options.evidence,
          requireIndependentReview,
        });
    if (options.output) writeJson(path.resolve(options.output), result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
