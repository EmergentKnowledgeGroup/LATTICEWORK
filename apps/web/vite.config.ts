import { existsSync, lstatSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { defineConfig, loadEnv } from "vite";

const defaultOutputDirectory = "../../output/lw-p2-001/web";
const defaultPreviewPort = 4174;

export function requireSafeRepositoryOutput(
  target: string,
  workspaceRoot: string,
  label: string,
): string {
  const resolvedWorkspace = resolve(workspaceRoot);
  const resolved = resolve(target);
  const relativePath = relative(resolvedWorkspace, resolved);
  if (
    relativePath.length === 0 ||
    relativePath.startsWith("..") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`${label} must stay inside the LATTICEWORK repository.`);
  }

  const realWorkspace = realpathSync.native(resolvedWorkspace);
  let existingPath = resolvedWorkspace;
  for (const segment of relativePath.split(sep)) {
    existingPath = resolve(existingPath, segment);
    if (!existsSync(existingPath)) {
      break;
    }
    if (lstatSync(existingPath).isSymbolicLink()) {
      throw new Error(`${label} must not traverse a symbolic link or junction.`);
    }
    const realExistingPath = realpathSync.native(existingPath);
    const realRelativePath = relative(realWorkspace, realExistingPath);
    if (
      realRelativePath.startsWith("..") ||
      isAbsolute(realRelativePath)
    ) {
      throw new Error(`${label} resolves outside the LATTICEWORK repository.`);
    }
  }
  return resolved;
}

export function candidateOutputDirectory(mode: string): string {
  const appRoot = import.meta.dirname;
  const workspaceRoot = resolve(import.meta.dirname, "../..");
  const loaded = loadEnv(mode, workspaceRoot, "LATTICEWORK_P2_");
  const configured = (
    process.env.LATTICEWORK_P2_OUT_DIR ?? loaded.LATTICEWORK_P2_OUT_DIR
  )?.trim();

  if (configured === undefined || configured.length === 0) {
    return requireSafeRepositoryOutput(
      resolve(appRoot, defaultOutputDirectory),
      workspaceRoot,
      "Candidate output directory",
    );
  }

  return requireSafeRepositoryOutput(
    isAbsolute(configured) ? configured : resolve(workspaceRoot, configured),
    workspaceRoot,
    "Candidate output directory",
  );
}

export function candidatePreviewPort(mode: string): number {
  const workspaceRoot = resolve(import.meta.dirname, "../..");
  const loaded = loadEnv(mode, workspaceRoot, "LATTICEWORK_P2_");
  const configured = process.env.LATTICEWORK_P2_PORT ?? loaded.LATTICEWORK_P2_PORT;
  if (configured === undefined || configured.trim().length === 0) {
    return defaultPreviewPort;
  }
  const port = Number(configured);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("LATTICEWORK_P2_PORT must be an integer between 1024 and 65535.");
  }
  return port;
}

export default defineConfig(({ mode }) => ({
  base: "./",
  build: {
    emptyOutDir: true,
    manifest: true,
    outDir: candidateOutputDirectory(mode)
  },
  preview: {
    host: "127.0.0.1",
    port: candidatePreviewPort(mode),
    strictPort: true
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true
  }
}));

export { defaultOutputDirectory, defaultPreviewPort };
