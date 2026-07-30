import { resolve } from "node:path";
import { defineConfig } from "vite";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const buildOutDir = resolve(
  workspaceRoot,
  "runtime/tmp/phase3-browser-dist",
);
const configuredPort = Number(process.env.LATTICEWORK_P3_PORT ?? "4193");
if (
  !Number.isInteger(configuredPort) ||
  configuredPort < 1024 ||
  configuredPort > 65535
) {
  throw new Error(
    "LATTICEWORK_P3_PORT must be an integer between 1024 and 65535.",
  );
}

export default defineConfig({
  root: import.meta.dirname,
  build: {
    emptyOutDir: true,
    outDir: buildOutDir,
  },
  preview: {
    host: "127.0.0.1",
    port: configuredPort,
    strictPort: true,
  },
  server: {
    host: "127.0.0.1",
    hmr: false,
    port: configuredPort,
    strictPort: true,
    fs: {
      allow: [workspaceRoot],
    },
  },
});
