import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[0-9a-f]{40}$/u;
const BASELINE_SHA = "e7585999fc1af2707f410ae87356cf2b52e08d9c";
const IMPLEMENTATION_BASE = "ac45408307e91ee8d850c24753ce6b4d6e903f12";
const MANIFEST_SCHEMA = "latticework.evidence.artifact-bundle.v1";
const REQUIRED_GATES = [
  "environment", "install", "scope", "typecheck", "unit", "browser",
  "phase3_boundary", "phase4_verification", "repository_controls",
  "deterministic_build", "audit", "sbom", "hygiene",
];
const REQUIRED_SAFETY = {
  real_user_data: "not-accessed", real_provider_traffic: "none",
  real_credentials: "none", application_listener: "none",
  test_listener: "exact-loopback-run-owned", candidate_activation: "none",
  deployment: "none", cutover: "none",
};
const CMD = (text) => ["cmd.exe", "/d", "/s", "/c", text];
const COMMANDS = {
  environment: CMD("node --version && npm --version && npx playwright --version && git --version"),
  install: CMD("npm ci --ignore-scripts"),
  scope: CMD("node tools/reengineering/validate-phase5-active-scope.mjs && node tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs"),
  typecheck: CMD("npm run p5:typecheck"), unit: CMD("npm run p5:test"),
  browser: CMD("npm run p5:browser"), phase3_boundary: CMD("npm run p3:boundary"),
  phase4_verification: CMD("node tools/reengineering/validate-phase4-active-scope.mjs && node tools/reengineering/validate-phase4-amendment.mjs && node tools/reengineering/validate-phase4-implementation-scope.mjs && npm run p4:typecheck && npm run p4:test && npm run p4:browser"),
  repository_controls: CMD("node --test --test-reporter=tap tests/reengineering/*.test.mjs"),
  audit: CMD("npm audit --workspaces --include-workspace-root --json"),
  sbom: CMD("npm sbom --sbom-format cyclonedx"),
  hygiene: CMD(`git diff --check ${IMPLEMENTATION_BASE} -- && node --check tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs && node --check tools/reengineering/validate-phase5-lattice-memory-implementation-evidence.mjs`),
};

function readJson(file, failures, label) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { failures.push(`${label} is missing or invalid JSON: ${error.message}`); return null; }
}
function normalized(value) { return path.resolve(value).replaceAll("\\", "/").toLowerCase(); }
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

function artifactPath(root, relative, failures, label) {
  if (typeof relative !== "string" || !relative || relative.includes("\\") || path.posix.isAbsolute(relative) || path.posix.normalize(relative) !== relative || relative.startsWith("../")) {
    failures.push(`${label} must be a canonical bundle-relative path`);
    return null;
  }
  const absolute = path.resolve(root, ...relative.split("/"));
  if (!normalized(absolute).startsWith(`${normalized(root)}/`)) {
    failures.push(`${label} escapes the evidence directory`);
    return null;
  }
  let cursor = root;
  for (const part of relative.split("/")) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) { failures.push(`${label} is missing: ${relative}`); return null; }
    if (fs.lstatSync(cursor).isSymbolicLink()) {
      failures.push(`${label} traverses a symlink or reparse point: ${relative}`);
      return null;
    }
  }
  if (!fs.statSync(absolute).isFile()) { failures.push(`${label} is not a regular file: ${relative}`); return null; }
  return absolute;
}

function inventory(root, failures) {
  const paths = new Set();
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replaceAll("\\", "/");
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) { failures.push(`evidence bundle contains a symlink or reparse point: ${relative}`); continue; }
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) paths.add(relative);
      else failures.push(`evidence bundle contains a non-regular entry: ${relative}`);
    }
  };
  if (fs.lstatSync(root).isSymbolicLink()) failures.push("evidence directory is a symlink or reparse point");
  else visit(root);
  paths.delete("manifest.json");
  return paths;
}

export function phase5DeterministicPackageCommand(repoRoot, port) {
  const scratch = path.join(repoRoot, "runtime", "tmp", `phase5-lattice-memory-verification-${port}`);
  const cache = path.join(scratch, "npm-cache");
  const pack1 = path.join(scratch, "pack-1.json");
  const pack2 = path.join(scratch, "pack-2.json");
  const script = [
    `$env:npm_config_cache='${cache}'`,
    "$pack1Output = & npm pack --workspace @latticework/lattice-memory --dry-run --json",
    "if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }",
    `$pack1Output | Set-Content -Encoding utf8 '${pack1}'`,
    "$pack2Output = & npm pack --workspace @latticework/lattice-memory --dry-run --json",
    "if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }",
    `$pack2Output | Set-Content -Encoding utf8 '${pack2}'`,
    `$first = Get-Content '${pack1}' -Raw | ConvertFrom-Json`,
    `$second = Get-Content '${pack2}' -Raw | ConvertFrom-Json`,
    "if (@($first).Count -ne 1 -or @($second).Count -ne 1) { exit 1 }",
    "if ($first[0].name -ne '@latticework/lattice-memory' -or $second[0].name -ne '@latticework/lattice-memory') { exit 1 }",
    "if (-not (@($first[0].files.path) -contains 'src/index.ts') -or -not (@($second[0].files.path) -contains 'src/index.ts')) { exit 1 }",
    `if ((Get-FileHash '${pack1}').Hash -ne (Get-FileHash '${pack2}').Hash) { exit 1 }`,
  ].join("; ");
  return ["powershell.exe", "-NoProfile", "-Command", script];
}

function expectedDeterministic(command, repoRoot) {
  if (!Array.isArray(command) || command.length !== 4 || typeof command[3] !== "string") return false;
  const match = /phase5-lattice-memory-verification-(\d+)[\\/]npm-cache/u.exec(command[3]);
  if (!match) return false;
  return JSON.stringify(command) === JSON.stringify(
    phase5DeterministicPackageCommand(repoRoot, Number.parseInt(match[1], 10)),
  );
}

function validateManifest(root, manifest, summary, failures) {
  if (manifest.schema !== MANIFEST_SCHEMA || manifest.receipt_id !== "LW-P5-MEM-001-bundle" || manifest.baseline_sha !== BASELINE_SHA || manifest.candidate_sha !== summary.candidate_sha || typeof manifest.directory !== "string" || normalized(manifest.directory) !== normalized(root)) failures.push("canonical artifact manifest identity or directory binding mismatch");
  const listed = new Set();
  if (!Array.isArray(manifest.artifacts)) failures.push("manifest artifacts must be an array");
  else for (const artifact of manifest.artifacts) {
    const relative = artifact?.path;
    if (listed.has(relative)) { failures.push(`duplicate artifact path: ${String(relative)}`); continue; }
    listed.add(relative);
    const absolute = artifactPath(root, relative, failures, "manifest artifact");
    if (!absolute) continue;
    if (artifact.repository_artifact !== true) failures.push(`manifest artifact is not marked repository_artifact: ${relative}`);
    if (artifact.bytes !== fs.statSync(absolute).size || artifact.sha256 !== sha256(absolute)) failures.push(`artifact byte length or sha256 mismatch: ${relative}`);
  }
  const actual = inventory(root, failures);
  for (const relative of actual) if (!listed.has(relative)) failures.push(`evidence artifact is omitted from manifest: ${relative}`);
  for (const relative of listed) if (!actual.has(relative)) failures.push(`manifest artifact is not in exact evidence inventory: ${relative}`);
  return listed;
}

export async function validatePhase5LatticeMemoryImplementationEvidence({ evidenceDirectory, candidateSha, requireIndependent = true }) {
  const failures = [];
  const root = path.resolve(evidenceDirectory);
  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory()) return { valid: false, failures: ["evidence directory is missing or not a directory"] };
  const summary = readJson(path.join(root, "summary.json"), failures, "summary");
  const manifest = readJson(path.join(root, "manifest.json"), failures, "manifest");
  if (!summary || !manifest) return { valid: false, failures };
  const allowed = requireIndependent ? summary.status === "GREEN" : ["GREEN", "PENDING_INDEPENDENT_CLEAN_WORKTREE_REVIEW"].includes(summary.status);
  if (summary.schema !== "latticework.phase5-lattice-memory-implementation-summary.v1" || summary.work_id !== "LW-P5-MEM-001" || summary.evidence_label !== "MEASURED") failures.push("summary identity mismatch");
  if (summary.valid !== true || !allowed || summary.implementation_base_commit !== IMPLEMENTATION_BASE || !SHA.test(summary.candidate_sha ?? "") || (candidateSha && summary.candidate_sha !== candidateSha)) failures.push("summary validity, status, base, or candidate mismatch");
  for (const [key, expected] of Object.entries(REQUIRED_SAFETY)) if (summary.safety?.[key] !== expected) failures.push(`unsafe or missing safety value ${key}`);
  const controls = summary.repository_controls ?? {};
  if (!(controls.tests > 0) || controls.pass !== controls.tests || controls.fail !== 0 || controls.skipped !== 0 || controls.todo !== 0) failures.push("repository controls must be all-pass with no skip or todo");
  const browser = summary.browser ?? {};
  if (browser.expected !== 4 || browser.unexpected !== 0 || browser.flaky !== 0 || browser.skipped !== 0) failures.push("browser inventory must be exactly four expected and zero unexpected/flaky/skipped");
  const listed = validateManifest(root, manifest, summary, failures);
  const expectedCwd = normalized(process.cwd());
  for (const gate of REQUIRED_GATES) {
    const relative = summary.gates?.[gate];
    if (!listed.has(relative)) { failures.push(`gate ${gate} receipt is not covered by manifest`); continue; }
    const absolute = artifactPath(root, relative, failures, `gate ${gate}`);
    const receipt = absolute && readJson(absolute, failures, `gate ${gate}`);
    if (!receipt) continue;
    const commandMatches = gate === "deterministic_build"
      ? expectedDeterministic(receipt.command, process.cwd())
      : JSON.stringify(receipt.command) === JSON.stringify(COMMANDS[gate]);
    const cwdMatches = typeof receipt.cwd === "string" && path.isAbsolute(receipt.cwd) && normalized(receipt.cwd) === expectedCwd;
    if (receipt.schema !== "latticework.evidence.command.v1" || receipt.receipt_id !== `LW-P5-MEM-001-${gate.replaceAll("_", "-")}` || receipt.baseline_sha !== BASELINE_SHA || receipt.candidate_sha !== summary.candidate_sha || !cwdMatches || receipt.repository?.head !== summary.candidate_sha || receipt.exit_code !== 0 || receipt.signal !== null || receipt.spawn_error !== null || !commandMatches) failures.push(`gate ${gate} receipt identity, command, or green execution proof mismatch`);
  }
  const browserResults = readJson(path.join(root, "browser", "results.json"), failures, "browser results");
  if (browserResults && (browserResults.stats?.expected !== 4 || browserResults.stats?.unexpected !== 0 || browserResults.stats?.flaky !== 0 || browserResults.stats?.skipped !== 0)) failures.push("browser results inventory mismatch");
  const attachments = path.join(root, "browser", "attachments");
  const receipts = fs.existsSync(attachments) ? fs.readdirSync(attachments).filter((name) => name.endsWith(".json")) : [];
  if (receipts.length !== 8 || browser.content_free_receipts !== 8) failures.push("browser must contain exactly eight content-free receipts");
  for (const name of receipts) {
    const receipt = readJson(path.join(attachments, name), failures, `browser receipt ${name}`);
    if (!receipt) continue;
    if (receipt.schema !== "latticework.phase5.browser-receipt.v1" || receipt.content_free !== true) failures.push(`browser receipt ${name} is not content-free`);
    for (const field of ["pulse", "refs", "source", "summary", "credential", "token"]) if (Object.hasOwn(receipt, field)) failures.push(`browser receipt ${name} contains forbidden field ${field}`);
  }
  if (requireIndependent) {
    const review = summary.independent_review;
    if (!review || review.verdict !== "GREEN" || review.candidate_sha !== summary.candidate_sha || !listed.has(review.receipt)) failures.push("independent GREEN review is missing, mismatched, or not manifest-covered");
    else {
      const reviewPath = artifactPath(root, review.receipt, failures, "independent review receipt");
      const data = reviewPath && readJson(reviewPath, failures, "independent review");
      if (!data || data.schema !== "latticework.phase5-independent-review.v1" || data.verdict !== "GREEN" || data.candidate_sha !== summary.candidate_sha || !Array.isArray(data.findings) || data.findings.length !== 0) failures.push("independent review receipt is not clean GREEN");
    }
  }
  return { schema: "latticework.phase5-lattice-memory-implementation-evidence-validation.v1", valid: failures.length === 0, evidenceDirectory: root, candidateSha: summary.candidate_sha, failures };
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]; const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Arguments must be --key value pairs.");
    options[key.slice(2)] = value;
  }
  return options;
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.evidence) throw new Error("Usage: validate-phase5-lattice-memory-implementation-evidence.mjs --evidence PATH [--candidate-sha SHA] [--require-independent true|false] [--output PATH]");
  const result = await validatePhase5LatticeMemoryImplementationEvidence({ evidenceDirectory: options.evidence, candidateSha: options["candidate-sha"], requireIndependent: options["require-independent"] !== "false" });
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (options.output) fs.writeFileSync(options.output, serialized, "utf8");
  process.stdout.write(serialized);
  if (!result.valid) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
