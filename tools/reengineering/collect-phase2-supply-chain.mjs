#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseNamedArgs, writeJson } from "./evidence-common.mjs";

const LIFECYCLE_SCRIPT_NAMES = ["preinstall", "install", "postinstall", "prepare"];

function isStrictDescendant(targetPath, parentPath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(targetPath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function normalizeLicense(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const licenses = value.map(normalizeLicense).filter(Boolean);
    return licenses.length > 0 ? licenses.join(" OR ") : null;
  }
  if (value && typeof value === "object") {
    return normalizeLicense(value.type);
  }
  return null;
}

function packageNameFromLockPath(lockPath) {
  const normalized = lockPath.replaceAll("\\", "/");
  const marker = "node_modules/";
  const packagePath = normalized.slice(normalized.lastIndexOf(marker) + marker.length);
  const segments = packagePath.split("/");
  return packagePath.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
}

function inspectExternalPackage(workspaceRoot, lockPath, lockEntry, failures) {
  const packageDirectory = path.join(workspaceRoot, lockPath);
  const packageJsonPath = path.join(packageDirectory, "package.json");
  const lockLicense = normalizeLicense(lockEntry.license);
  if (!fs.existsSync(packageJsonPath)) {
    const record = {
      path: lockPath.replaceAll("\\", "/"),
      name: packageNameFromLockPath(lockPath),
      version: lockEntry.version ?? null,
      license: lockLicense,
      integrity: lockEntry.integrity ?? null,
      resolved: lockEntry.resolved ?? null,
      dev: Boolean(lockEntry.dev),
      optional: Boolean(lockEntry.optional),
      installed: false,
      os: lockEntry.os ?? [],
      cpu: lockEntry.cpu ?? [],
      lockfile_has_install_script: Boolean(lockEntry.hasInstallScript),
      lifecycle_scripts: [],
    };
    if (!record.optional) {
      failures.push(`required installed package metadata is missing: ${lockPath}/package.json`);
    }
    if (!record.license) {
      failures.push(`${record.name} is missing license metadata`);
    }
    if (!record.integrity) {
      failures.push(`${record.name} is missing lockfile integrity metadata`);
    }
    return record;
  }

  const packageJson = readJson(packageJsonPath);
  const license = normalizeLicense(packageJson.license ?? packageJson.licenses) ?? lockLicense;
  const lifecycleScripts = LIFECYCLE_SCRIPT_NAMES.filter(
    (name) => typeof packageJson.scripts?.[name] === "string",
  );
  const record = {
    path: lockPath.replaceAll("\\", "/"),
    name: packageJson.name ?? null,
    version: packageJson.version ?? lockEntry.version ?? null,
    license,
    integrity: lockEntry.integrity ?? null,
    resolved: lockEntry.resolved ?? null,
    dev: Boolean(lockEntry.dev),
    optional: Boolean(lockEntry.optional),
    installed: true,
    os: lockEntry.os ?? [],
    cpu: lockEntry.cpu ?? [],
    lockfile_has_install_script: Boolean(lockEntry.hasInstallScript),
    lifecycle_scripts: lifecycleScripts,
  };

  if (!record.name || !record.version) {
    failures.push(`${lockPath} is missing package name or version`);
  }
  if (!record.license) {
    failures.push(`${record.name ?? lockPath} is missing license metadata`);
  }
  if (!record.integrity) {
    failures.push(`${record.name ?? lockPath} is missing lockfile integrity metadata`);
  }
  return record;
}

export function collectPhase2SupplyChain({ workspaceRoot, outputPath }) {
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedOutput = path.resolve(outputPath);
  if (!isStrictDescendant(resolvedOutput, resolvedRoot)) {
    throw new Error(`Supply-chain output must be a strict repository descendant: ${resolvedOutput}`);
  }

  const rootManifestPath = path.join(resolvedRoot, "package.json");
  const lockfilePath = path.join(resolvedRoot, "package-lock.json");
  if (!fs.existsSync(rootManifestPath) || !fs.existsSync(lockfilePath)) {
    throw new Error("package.json and package-lock.json are required");
  }

  const rootManifest = readJson(rootManifestPath);
  const lockfile = readJson(lockfilePath);
  const failures = [];
  if (lockfile.lockfileVersion !== 3) {
    failures.push(`lockfileVersion must be 3; observed ${lockfile.lockfileVersion ?? "missing"}`);
  }
  if (!lockfile.packages || typeof lockfile.packages !== "object") {
    failures.push("lockfile packages map is missing");
  }

  const externalPackages = Object.entries(lockfile.packages ?? {})
    .filter(([lockPath, entry]) => lockPath.startsWith("node_modules/") && !entry.link)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([lockPath, entry]) =>
      inspectExternalPackage(resolvedRoot, lockPath, entry, failures),
    );

  const summary = {
    schema: "latticework.phase2-supply-chain.v1",
    evidence_label: "MEASURED",
    captured_at: new Date().toISOString(),
    valid: failures.length === 0,
    workspace_root: resolvedRoot,
    root_package: {
      name: rootManifest.name ?? null,
      version: rootManifest.version ?? null,
      package_manager: rootManifest.packageManager ?? null,
      engines: rootManifest.engines ?? {},
      workspaces: rootManifest.workspaces ?? [],
    },
    lockfile_version: lockfile.lockfileVersion ?? null,
    external_package_count: externalPackages.length,
    installed_external_package_count: externalPackages.filter((entry) => entry.installed).length,
    skipped_optional_package_count: externalPackages.filter(
      (entry) => !entry.installed && entry.optional,
    ).length,
    packages_with_lifecycle_scripts: externalPackages
      .filter(
        (entry) => entry.lifecycle_scripts.length > 0 || entry.lockfile_has_install_script,
      )
      .map((entry) => ({
        name: entry.name,
        version: entry.version,
        scripts: entry.lifecycle_scripts,
        installed: entry.installed,
        lockfile_has_install_script: entry.lockfile_has_install_script,
      })),
    external_packages: externalPackages,
    failures,
  };
  writeJson(resolvedOutput, summary);
  return summary;
}

function isMain() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  try {
    const { options, command } = parseNamedArgs(process.argv.slice(2));
    if (command.length > 0) {
      throw new Error("This collector does not accept a command after --");
    }
    if (!options["workspace-root"] || !options.output) {
      throw new Error(
        "Usage: collect-phase2-supply-chain.mjs --workspace-root PATH --output PATH",
      );
    }
    const summary = collectPhase2SupplyChain({
      workspaceRoot: options["workspace-root"],
      outputPath: options.output,
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exitCode = summary.valid ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
