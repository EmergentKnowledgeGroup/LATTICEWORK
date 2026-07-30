import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { collectPhase2SupplyChain } from "../../tools/reengineering/collect-phase2-supply-chain.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEST_ROOT = path.join(REPO_ROOT, "runtime", "tmp", "phase2-supply-chain-tests");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test("captures integrity, license, and ignored lifecycle scripts from a lock fixture", () => {
  const root = path.join(TEST_ROOT, "complete");
  fs.rmSync(root, { recursive: true, force: true });
  writeJson(path.join(root, "package.json"), {
    name: "fixture",
    private: true,
    devDependencies: { tool: "1.2.3" },
  });
  writeJson(path.join(root, "package-lock.json"), {
    name: "fixture",
    lockfileVersion: 3,
    packages: {
      "": { name: "fixture", devDependencies: { tool: "1.2.3" } },
      "node_modules/tool": {
        version: "1.2.3",
        resolved: "https://registry.npmjs.org/tool/-/tool-1.2.3.tgz",
        integrity: "sha512-fixture",
        dev: true,
      },
    },
  });
  writeJson(path.join(root, "node_modules", "tool", "package.json"), {
    name: "tool",
    version: "1.2.3",
    license: "MIT",
    scripts: { postinstall: "node install.js", test: "node test.js" },
  });
  const output = path.join(root, "evidence", "supply-chain.json");

  const summary = collectPhase2SupplyChain({
    workspaceRoot: root,
    outputPath: output,
  });

  assert.equal(summary.valid, true);
  assert.equal(summary.lockfile_version, 3);
  assert.equal(summary.external_packages.length, 1);
  assert.deepEqual(summary.external_packages[0].lifecycle_scripts, ["postinstall"]);
  assert.equal(summary.external_packages[0].license, "MIT");
  assert.equal(summary.external_packages[0].integrity, "sha512-fixture");
});

test("records a platform-skipped optional package from lock metadata without failing", () => {
  const root = path.join(TEST_ROOT, "optional-skipped");
  fs.rmSync(root, { recursive: true, force: true });
  writeJson(path.join(root, "package.json"), {
    name: "fixture",
    private: true,
    optionalDependencies: { "platform-addon": "1.0.0" },
  });
  writeJson(path.join(root, "package-lock.json"), {
    name: "fixture",
    lockfileVersion: 3,
    packages: {
      "": { name: "fixture", optionalDependencies: { "platform-addon": "1.0.0" } },
      "node_modules/platform-addon": {
        version: "1.0.0",
        resolved: "https://registry.npmjs.org/platform-addon/-/platform-addon-1.0.0.tgz",
        integrity: "sha512-optional",
        license: "MIT",
        optional: true,
        os: ["linux"],
        hasInstallScript: true,
      },
    },
  });

  const summary = collectPhase2SupplyChain({
    workspaceRoot: root,
    outputPath: path.join(root, "evidence", "supply-chain.json"),
  });

  assert.equal(summary.valid, true);
  assert.equal(summary.installed_external_package_count, 0);
  assert.equal(summary.skipped_optional_package_count, 1);
  assert.deepEqual(summary.external_packages[0], {
    path: "node_modules/platform-addon",
    name: "platform-addon",
    version: "1.0.0",
    license: "MIT",
    integrity: "sha512-optional",
    resolved: "https://registry.npmjs.org/platform-addon/-/platform-addon-1.0.0.tgz",
    dev: false,
    optional: true,
    installed: false,
    os: ["linux"],
    cpu: [],
    lockfile_has_install_script: true,
    lifecycle_scripts: [],
  });
});

test("permits skipped optional metadata without installed license or integrity", () => {
  const root = path.join(TEST_ROOT, "optional-without-installed-metadata");
  fs.rmSync(root, { recursive: true, force: true });
  writeJson(path.join(root, "package.json"), { name: "fixture", private: true });
  writeJson(path.join(root, "package-lock.json"), {
    name: "fixture",
    lockfileVersion: 3,
    packages: {
      "": { name: "fixture" },
      "node_modules/platform-addon": { version: "1.0.0", optional: true },
    },
  });

  const summary = collectPhase2SupplyChain({
    workspaceRoot: root,
    outputPath: path.join(root, "evidence", "supply-chain.json"),
  });

  assert.equal(summary.valid, true);
  assert.equal(summary.skipped_optional_package_count, 1);
});

test("discovers nested node_modules packages using their innermost package name", () => {
  const root = path.join(TEST_ROOT, "nested-node-modules");
  fs.rmSync(root, { recursive: true, force: true });
  writeJson(path.join(root, "package.json"), { name: "fixture", private: true });
  writeJson(path.join(root, "package-lock.json"), {
    name: "fixture",
    lockfileVersion: 3,
    packages: {
      "": { name: "fixture" },
      "node_modules/parent/node_modules/child": {
        version: "1.0.0", integrity: "sha512-child", license: "MIT",
      },
    },
  });
  writeJson(path.join(root, "node_modules", "parent", "node_modules", "child", "package.json"), {
    name: "child", version: "1.0.0", license: "MIT",
  });

  const summary = collectPhase2SupplyChain({
    workspaceRoot: root,
    outputPath: path.join(root, "evidence", "supply-chain.json"),
  });

  assert.equal(summary.valid, true);
  assert.equal(summary.external_packages[0].name, "child");
});

test("reports missing external license and integrity metadata", () => {
  const root = path.join(TEST_ROOT, "incomplete");
  fs.rmSync(root, { recursive: true, force: true });
  writeJson(path.join(root, "package.json"), {
    name: "fixture",
    private: true,
    dependencies: { unsafe: "1.0.0" },
  });
  writeJson(path.join(root, "package-lock.json"), {
    name: "fixture",
    lockfileVersion: 3,
    packages: {
      "": { name: "fixture", dependencies: { unsafe: "1.0.0" } },
      "node_modules/unsafe": { version: "1.0.0" },
    },
  });
  writeJson(path.join(root, "node_modules", "unsafe", "package.json"), {
    name: "unsafe",
    version: "1.0.0",
  });

  const summary = collectPhase2SupplyChain({
    workspaceRoot: root,
    outputPath: path.join(root, "evidence", "supply-chain.json"),
  });

  assert.equal(summary.valid, false);
  assert.match(summary.failures.join("\n"), /missing license/i);
  assert.match(summary.failures.join("\n"), /missing (?:lockfile )?integrity/i);
});
