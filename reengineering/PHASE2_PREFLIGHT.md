# Phase 2 Preflight — `LW-P2-001`

**Status:** ACCEPTED FOR BOUNDED EXECUTION
**Date:** 2026-07-30
**Base:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`
**Decision gate:** ADR-001, ADR-002, and ADR-003 accepted 2026-07-30

## Maintainer decision

**OBSERVED:** the maintainer explicitly approved the proposed architecture
choices in the active Codex task and directed execution to continue.

That acceptance means:

1. `apps/web/src/` becomes the sole authored candidate browser tree.
2. New runtime code uses strict TypeScript and native modules behind small,
   testable contracts and a feature-free kernel.
3. Lit Web Components are the default boundary for the bounded candidate shell.

It does **not** mean:

- the candidate replaces or embeds the legacy application;
- any existing route, source mirror, store, provider, worker, desktop shell,
  service worker, or user-data behavior may change;
- the shell proves compatibility, parity, production readiness, or cutover
  readiness.

## Intended invariant

`LW-P2-001` adds one isolated, locally runnable status shell and the minimum
typed lifecycle seam needed to boot it. The immutable legacy runtime stays
runnable and byte-untouched. The candidate performs no network, provider,
storage, credential, crypto, worker, service-worker, import/export, GPU, audio,
clipboard, file, notification, or external mutation work.

## Exact owned paths

| Area | Paths | Purpose |
|---|---|---|
| Root toolchain | `package.json`, `package-lock.json`, `tsconfig.base.json` | Private npm workspace, exact runtime/tool pins, strict shared compiler policy, deterministic commands |
| Candidate browser | `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/main.ts`, `apps/web/src/empty-status-shell.ts`, `apps/web/src/styles.css` | Static local-only status shell built by Vite and rendered by Lit |
| Contracts | `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/src/index.ts`, `packages/contracts/src/lifecycle.ts`, `packages/contracts/src/diagnostics.ts`, `packages/contracts/src/status.ts` | Only the lifecycle, diagnostics, and status-view-model types required by the shell |
| Kernel | `packages/kernel/package.json`, `packages/kernel/tsconfig.json`, `packages/kernel/src/index.ts`, `packages/kernel/src/kernel.ts`, `packages/kernel/src/kernel.test.mjs` | Dependency-injected registration, lifecycle sequencing, diagnostics, and status aggregation; no feature logic; JavaScript test wrapper avoids adding Node type packages to the four-package spike |
| Candidate browser QA | `tests/phase2/package.json`, `tests/phase2/playwright.config.ts`, `tests/phase2/empty-status-shell.spec.ts` | Fresh-context desktop/mobile/keyboard/forced-colors/reduced-motion/no-egress/no-storage/no-worker smoke |
| Verification | `tools/reengineering/verify-phase2-build.mjs`, `tools/reengineering/verify-phase2-boundary.mjs`, `tools/reengineering/collect-phase2-supply-chain.mjs`, `tools/reengineering/validate-phase2-evidence.mjs`, `tools/reengineering/run-phase2-verification.ps1`, `tests/reengineering/phase2-build-verification.test.mjs`, `tests/reengineering/phase2-boundary.test.mjs`, `tests/reengineering/phase2-supply-chain.test.mjs`, `tests/reengineering/phase2-evidence-validation.test.mjs`, `reengineering/evidence/phase-2/LW-P2-001/**` | Repeatable commands, lockfile replay, artifact comparison, supply-chain/boundary/bundle validation, raw receipts, hashes, environment, and manifest |
| Living records | `docs/agents/claims/LW-P2-001.md`, `docs/agents/handoffs/LW-P2-001.md`, `PROJECT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/COMPATIBILITY.md`, `docs/DEPENDENCY_INVENTORY.md`, `docs/TESTING_AND_VERIFICATION.md`, `reengineering/EXECUTION_CHECKLIST.md`, `reengineering/BLOCKERBOARD.md`, `reengineering/MIGRATION_LEDGER.md`, both checkpoint surfaces | Keep accepted design, implemented reality, bounded evidence, and remaining unknowns aligned |

`packages/ui-system/` is intentionally deferred. One shell is not enough
evidence for a reusable UI package.

## No-touch fence

The work unit must not modify:

- `docs/app.html`, `index.html`, or root `app.html`;
- `docs/modules/**`, root `modules/**`, `docs/sw.js`, or root `sw.js`;
- `server.js`, `server.py`, `desktop/**`, `worker/**`, or
  `telegram-worker.js`;
- baseline `tests/smoke*.js` or Phase 1 `tests/characterization/**`;
- `Z:\LATTICEWORK_BASELINE_e7585999` or `Z:\FreeLattice`;
- legacy persistence, provider, security, identity, cryptographic, privacy, or
  user-data semantics.

Generated candidate output belongs in ignored
`output/lw-p2-001/web/`; `docs/` remains untouched in this spike.

## Toolchain decision

Registry observations were made on 2026-07-30 with Node `24.13.0`, npm
`11.6.2`, and a reachable npm registry. Context7 documentation was queried
through Docker MCP Toolkit's `home` profile.

| Package | Exact pin | Role | Evidence and restraint |
|---|---:|---|---|
| `vite` | `8.1.5` | Candidate build/preview | **MEASURED:** requires Node `^20.19.0 || >=22.12.0`; Context7 confirms relative `base`, fixed `outDir`, manifest, and local preview behavior for Vite 8 |
| `typescript` | `6.0.3` | Strict typecheck | **MEASURED:** supports the pinned Node runtime; chosen over registry-latest 7.x to avoid a new compiler-generation transition during the first spike |
| `lit` | `3.3.3` | Candidate shell only | **OBSERVED:** scoped Web Component rendering and lifecycle fit the accepted bounded-spike decision |
| `@playwright/test` | `1.62.0` | Isolated Phase 2 browser QA | **MEASURED:** exact match to the independently green Phase 1 Playwright version; kept in `tests/phase2`, not the runtime package |

The root manifest pins:

```json
{
  "engines": {
    "node": ">=24.13.0 <25",
    "npm": ">=11.6.2 <12"
  },
  "packageManager": "npm@11.6.2"
}
```

No ESLint, `typescript-eslint`, Vitest, framework router, state manager, CSS
framework, UI kit, PWA plugin, or production server is justified in this
slice. Direct-package metadata showed no install lifecycle scripts, but that is
not a transitive supply-chain verdict. The lockfile, audit, licenses, and SBOM
must be captured after installation.

## Required behavior

The candidate must:

- show a semantic heading, short “candidate only” explanation, kernel state,
  lifecycle state, and diagnostics count;
- expose a stable ready marker for automation;
- remain readable and keyboard navigable at desktop and 390 × 844 mobile;
- honor reduced motion and remain perceivable under forced colors;
- render a clear no-migrated-features message;
- boot from a small kernel whose lifecycle and failure behavior are unit tested.

The candidate must not:

- imply that legacy features were migrated;
- use or create durable browser storage;
- register a service worker;
- perform an out-of-origin request or open realtime channels;
- load a legacy route or script;
- create a candidate canvas/GPU/audio loop;
- hide boot errors or silently continue after a required lifecycle failure.

## Verification gates

1. isolated workspace replay of `npm install --package-lock-only --ignore-scripts`
   with a byte-identical comparison to the committed lockfile;
2. `npm ci --ignore-scripts`
3. `npm run p2:typecheck`
4. `npm run p2:test`
5. two clean `npm run p2:build` runs with identical declared paths and SHA-256
   hashes;
6. `npm run p2:browser` for desktop, mobile, keyboard, reduced-motion,
   forced-colors, no-egress, no-storage, no-worker, and no-legacy assertions;
7. `npm audit --workspaces --include-workspace-root --json`;
8. direct dependency license receipt and CycloneDX or SPDX SBOM;
9. `node --test tests/reengineering/*.test.mjs`;
10. immutable-baseline cleanliness and protected-file hash comparison before
    and after the slice;
11. independent QA rerun from a separate evidence directory and loopback port.

The evidence package is
`reengineering/evidence/phase-2/LW-P2-001/` and must include exact commands,
exit codes, versions, commit/base SHA, timestamps, raw output, artifact hashes,
audit/license/SBOM receipts, browser artifacts, and a hash-verifying manifest.

## Provisional performance gates

The accepted spike inherits `reengineering/PERFORMANCE_PLAN.md`:

- every successful online run: DOMContentLoaded `<= 2,000 ms`, load
  `<= 2,250 ms`, navigation transfer `<= 3,000,000` bytes;
- zero candidate long tasks `>= 50 ms`;
- zero candidate-owned live canvases, animation loops, or GPU contexts;
- record raw/gzip/Brotli JavaScript and CSS bytes before proposing a bundle
  ceiling.

These are candidate gates, not baseline parity or public benchmark claims.

## Rollback

Remove only the additive `LW-P2-001` candidate commit and ignored
`output/lw-p2-001/web/` output. Continue running the immutable legacy
application. No data restore, service-worker repair, provider rollback, route
switch, or feature flag is needed because this slice cannot touch those
surfaces.

## Stop conditions

Stop and request a new maintainer decision if implementation would require:

- changing a default legacy route or generated `docs/` artifact;
- defining or mutating persistence/provider/security/identity/crypto contracts;
- adding a dependency outside the exact four-package toolchain;
- weakening Phase 1 evidence or compatibility obligations;
- claiming a browser/platform/feature as supported from the empty shell.

## Execution order

1. Record ADR acceptance and close only `LW-BLK-002` through `LW-BLK-004`.
2. Claim `LW-P2-001` and checkpoint Phase 2 start.
3. Create the minimal root workspace and exact lockfile.
4. Implement contracts and kernel with tests.
5. Implement the candidate status shell.
6. Add build verifier and browser tests.
7. Run the full local gate and create the canonical evidence package.
8. Run independent QA in a separate evidence directory.
9. Update living documents and leave a handoff.

Phase 2 completion does not authorize Phase 3 or a legacy cutover.
