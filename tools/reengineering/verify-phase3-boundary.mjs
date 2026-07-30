import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMPLEMENTATION_BASE = "93a36626f786a880210c53b8486c961e8b86e9ea";
const ACCEPTANCE_CONTROL_PATHS = new Set([
  "ROADMAP.md",
  "docs/KNOWN_LIMITATIONS.md",
  "docs/agents/claims/LW-P3-001.md",
  "docs/decisions/README.md",
  "docs/decisions/0004-versioned-storage-and-migration.md",
  "docs/decisions/0005-provider-abstraction-and-provenance.md",
  "docs/decisions/0006-optional-local-proxy-security.md",
  "reengineering/PHASE3_DECISION_PACKET.json",
  "reengineering/PHASE3_DECISION_PACKET.md",
  "reengineering/PHASE3_PREFLIGHT.json",
  "reengineering/PHASE3_PREFLIGHT.md",
  "tests/reengineering/phase3-decision-packet.test.mjs",
  "tests/reengineering/phase3-preflight.test.mjs",
  "tools/reengineering/validate-phase3-decision-packet.mjs",
  "tools/reengineering/validate-phase3-preflight.mjs",
]);
const PROVIDER_FORBIDDEN_PATTERNS = [
  [/\bfetch\s*\(/, "fetch"],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest"],
  [/\bWebSocket\b/, "WebSocket"],
  [/\bEventSource\b/, "EventSource"],
  [/\bWebTransport\b/, "WebTransport"],
  [/\bRTCPeerConnection\b/, "RTCPeerConnection"],
  [/node:(?:http|https|net|tls|dgram)\b/, "Node network module"],
  [/\b(?:Deno|Bun)\.serve\b/, "runtime listener"],
  [/\.(?:listen|createServer)\s*\(/, "server listener"],
  [/\bprocess\.env\b/, "ambient process credentials"],
];
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:PRIVATE|SECRET)_(?:SENTINEL|TOKEN|KEY)(?:_[A-Z0-9_]+)?\b/,
];

function normalizeGitPath(value) {
  return value.trim().replaceAll("\\", "/");
}

function runGit(root, args, failures, label) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    failures.push(
      `${label} failed: ${result.stderr?.trim() || "unknown Git error"}`,
    );
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map(normalizeGitPath)
    .filter(Boolean);
}

function readJson(root, relativePath, failures) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(root, relativePath), "utf8").replace(/^\uFEFF/, ""),
    );
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function isAllowedPath(relativePath, ownedPaths) {
  if (ACCEPTANCE_CONTROL_PATHS.has(relativePath)) return true;
  return ownedPaths.some((ownedPath) =>
    ownedPath.endsWith("/")
      ? relativePath.startsWith(ownedPath)
      : relativePath === ownedPath,
  );
}

function validateScope(root, preflight, failures) {
  const ancestry = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", IMPLEMENTATION_BASE, "HEAD"],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
  if (ancestry.status !== 0) {
    failures.push(`implementation base ${IMPLEMENTATION_BASE} is not an ancestor of HEAD`);
    return [];
  }
  const changed = runGit(
    root,
    ["diff", "--name-only", IMPLEMENTATION_BASE, "--"],
    failures,
    "changed-path query",
  );
  const untracked = runGit(
    root,
    ["ls-files", "--others", "--exclude-standard"],
    failures,
    "untracked-path query",
  );
  const scope = [...new Set([...changed, ...untracked])].filter(
    (relativePath) => !relativePath.startsWith("runtime/tmp/"),
  );
  const ownedPaths = preflight?.scope?.implementation_owned_paths;
  const forbiddenPrefixes = preflight?.scope?.forbidden_path_prefixes;
  if (!Array.isArray(ownedPaths) || !Array.isArray(forbiddenPrefixes)) {
    failures.push("preflight scope is unavailable");
    return scope;
  }
  for (const relativePath of scope) {
    if (
      forbiddenPrefixes.some((prefix) =>
        prefix.endsWith("/")
          ? relativePath.startsWith(prefix)
          : relativePath === prefix ||
            relativePath.startsWith(`${prefix}/`),
      )
    ) {
      failures.push(`forbidden Phase 3 path changed: ${relativePath}`);
    }
    if (!isAllowedPath(relativePath, ownedPaths)) {
      failures.push(`Phase 3 path is outside the accepted scope: ${relativePath}`);
    }
  }
  return scope;
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic links are forbidden in Phase 3 source: ${absolute}`);
    }
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

function validatePackageManifests(root, failures) {
  const expected = new Map([
    ["packages/storage/package.json", "@latticework/storage"],
    ["packages/providers/package.json", "@latticework/providers"],
  ]);
  for (const [relativePath, expectedName] of expected) {
    const manifest = readJson(root, relativePath, failures);
    if (!manifest) continue;
    if (
      manifest.name !== expectedName ||
      manifest.private !== true ||
      manifest.type !== "module" ||
      JSON.stringify(manifest.dependencies) !==
        JSON.stringify({ "@latticework/contracts": "0.0.0" })
    ) {
      failures.push(`${relativePath} has an unexpected runtime contract`);
    }
    if (
      manifest.devDependencies !== undefined &&
      Object.keys(manifest.devDependencies).length > 0
    ) {
      failures.push(`${relativePath} must not add package-local dependencies`);
    }
  }
}

function validateProviderSource(root, failures) {
  let files = [];
  try {
    files = walkFiles(path.join(root, "packages", "providers", "src")).filter(
      (filePath) => filePath.endsWith(".ts"),
    );
  } catch (error) {
    failures.push(error.message);
    return;
  }
  const text = files
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
  for (const [pattern, label] of PROVIDER_FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      failures.push(`provider source uses forbidden ${label}`);
    }
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) failures.push("provider source contains secret-like text");
  }
}

export function verifyPhase3Boundary({ workspaceRoot }) {
  const root = path.resolve(workspaceRoot);
  const failures = [];
  const preflight = readJson(
    root,
    "reengineering/PHASE3_PREFLIGHT.json",
    failures,
  );
  const changedPaths = validateScope(root, preflight, failures);
  validatePackageManifests(root, failures);
  validateProviderSource(root, failures);
  return {
    schema: "latticework.phase3-boundary-verification.v1",
    valid: failures.length === 0,
    implementationBase: IMPLEMENTATION_BASE,
    changedPaths,
    checks: {
      realUserData: "not-accessed",
      providerNetwork: "source-denied",
      listener: "source-denied",
      legacyMutation: "path-denied",
      candidateActivation: "not-authorized",
      cutover: "not-authorized",
    },
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
  const result = verifyPhase3Boundary({ workspaceRoot: process.cwd() });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.valid ? 0 : 1;
}
