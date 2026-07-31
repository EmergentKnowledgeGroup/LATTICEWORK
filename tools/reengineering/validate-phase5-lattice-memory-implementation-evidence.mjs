import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[0-9a-f]{40}$/u;
const IMPLEMENTATION_BASE = "ac45408307e91ee8d850c24753ce6b4d6e903f12";
const REQUIRED_GATES = [
  "environment",
  "install",
  "scope",
  "typecheck",
  "unit",
  "browser",
  "phase3_boundary",
  "phase4_verification",
  "repository_controls",
  "deterministic_build",
  "audit",
  "sbom",
  "hygiene",
];
const REQUIRED_SAFETY = {
  real_user_data: "not-accessed",
  real_provider_traffic: "none",
  real_credentials: "none",
  application_listener: "none",
  test_listener: "exact-loopback-run-owned",
  candidate_activation: "none",
  deployment: "none",
  cutover: "none",
};

function readJson(file, failures, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${label} is missing or invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function descendant(root, relative, failures, label) {
  if (typeof relative !== "string" || relative.length === 0 || path.isAbsolute(relative)) {
    failures.push(`${label} must be a non-empty relative path`);
    return null;
  }
  const absolute = path.resolve(root, relative);
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!absolute.startsWith(prefix)) {
    failures.push(`${label} escapes the evidence directory`);
    return null;
  }
  return absolute;
}

function receiptFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

export async function validatePhase5LatticeMemoryImplementationEvidence({
  evidenceDirectory,
  candidateSha,
  requireIndependent = true,
}) {
  const failures = [];
  const root = path.resolve(evidenceDirectory);
  const summary = readJson(path.join(root, "summary.json"), failures, "summary");
  const manifest = readJson(path.join(root, "manifest.json"), failures, "manifest");

  if (!summary || !manifest) return { valid: false, failures };
  if (summary.schema !== "latticework.phase5-lattice-memory-implementation-summary.v1") failures.push("summary schema mismatch");
  if (summary.work_id !== "LW-P5-MEM-001") failures.push("summary work_id mismatch");
  if (summary.evidence_label !== "MEASURED") failures.push("summary evidence_label must be MEASURED");
  if (summary.valid !== true || summary.status !== "GREEN") failures.push("summary must be valid GREEN");
  if (summary.implementation_base_commit !== IMPLEMENTATION_BASE) failures.push("implementation base mismatch");
  if (!SHA.test(summary.candidate_sha ?? "")) failures.push("summary candidate SHA is invalid");
  if (candidateSha && summary.candidate_sha !== candidateSha) failures.push("summary candidate SHA does not match requested candidate");
  if (manifest.candidate_sha !== summary.candidate_sha) failures.push("manifest candidate SHA mismatch");

  for (const [key, expected] of Object.entries(REQUIRED_SAFETY)) {
    if (summary.safety?.[key] !== expected) failures.push(`unsafe or missing safety value ${key}`);
  }

  const controls = summary.repository_controls ?? {};
  if (!(controls.tests > 0) || controls.pass !== controls.tests || controls.fail !== 0 || controls.skipped !== 0 || controls.todo !== 0) {
    failures.push("repository controls must be all-pass with no skip or todo");
  }

  const browser = summary.browser ?? {};
  if (browser.expected !== 4 || browser.unexpected !== 0 || browser.flaky !== 0 || browser.skipped !== 0) {
    failures.push("browser inventory must be exactly four expected and zero unexpected/flaky/skipped");
  }

  for (const gate of REQUIRED_GATES) {
    const receipt = descendant(root, summary.gates?.[gate], failures, `gate ${gate}`);
    if (!receipt) continue;
    const data = readJson(receipt, failures, `gate ${gate}`);
    if (!data) continue;
    const exitCode = data.exit_code ?? data.exitCode ?? data.command?.exit_code;
    if (exitCode !== 0) failures.push(`gate ${gate} did not exit green`);
    if (data.candidate_sha && data.candidate_sha !== summary.candidate_sha) failures.push(`gate ${gate} candidate SHA mismatch`);
  }

  const browserResults = readJson(path.join(root, "browser", "results.json"), failures, "browser results");
  if (browserResults) {
    const stats = browserResults.stats ?? {};
    if (stats.expected !== 4 || stats.unexpected !== 0 || stats.flaky !== 0 || stats.skipped !== 0) {
      failures.push("browser results inventory mismatch");
    }
  }
  const receipts = receiptFiles(path.join(root, "browser", "attachments"));
  if (receipts.length !== 8 || browser.content_free_receipts !== 8) failures.push("browser must contain exactly eight content-free receipts");
  for (const file of receipts) {
    const receipt = readJson(file, failures, `browser receipt ${path.basename(file)}`);
    if (!receipt) continue;
    if (receipt.schema !== "latticework.phase5.browser-receipt.v1" || receipt.content_free !== true) {
      failures.push(`browser receipt ${path.basename(file)} is not content-free`);
    }
    for (const forbidden of ["pulse", "refs", "source", "summary", "credential", "token"]) {
      if (Object.hasOwn(receipt, forbidden)) failures.push(`browser receipt ${path.basename(file)} contains forbidden field ${forbidden}`);
    }
  }

  if (requireIndependent) {
    const review = summary.independent_review;
    if (!review || review.verdict !== "GREEN" || review.candidate_sha !== summary.candidate_sha) {
      failures.push("independent GREEN review is missing or mismatched");
    } else {
      const reviewFile = descendant(root, review.receipt, failures, "independent review receipt");
      const reviewData = reviewFile ? readJson(reviewFile, failures, "independent review") : null;
      if (reviewData && (
        reviewData.verdict !== "GREEN"
        || reviewData.candidate_sha !== summary.candidate_sha
        || !Array.isArray(reviewData.findings)
        || reviewData.findings.length !== 0
      )) failures.push("independent review receipt is not clean GREEN");
    }
  }

  return {
    schema: "latticework.phase5-lattice-memory-implementation-evidence-validation.v1",
    valid: failures.length === 0,
    evidenceDirectory: root,
    candidateSha: summary.candidate_sha,
    failures,
  };
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Arguments must be --key value pairs.");
    options[key.slice(2)] = value;
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.evidence) {
    throw new Error("Usage: validate-phase5-lattice-memory-implementation-evidence.mjs --evidence PATH [--candidate-sha SHA] [--require-independent true|false] [--output PATH]");
  }
  const result = await validatePhase5LatticeMemoryImplementationEvidence({
    evidenceDirectory: options.evidence,
    candidateSha: options["candidate-sha"],
    requireIndependent: options["require-independent"] !== "false",
  });
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (options.output) fs.writeFileSync(options.output, serialized, "utf8");
  process.stdout.write(serialized);
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
