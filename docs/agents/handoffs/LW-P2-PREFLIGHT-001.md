# Handoff — `LW-P2-PREFLIGHT-001`

**From:** Codex root controller
**To:** `LW-P2-001` implementation
**Date:** `2026-07-30T10:28:59Z`
**Current commit:** `e7585999fc1af2707f410ae87356cf2b52e08d9c` (baseline; reengineering changes uncommitted)
**Branch:** `reengineering/m0-baseline-characterization`

## State in one paragraph

The maintainer accepted ADR-001 through ADR-003 and directed execution to
continue. The exact bounded Phase 2 source, dependency, test, evidence, safety,
and rollback contract is frozen in `reengineering/PHASE2_PREFLIGHT.md`.
Implementation may now create only the isolated candidate status shell,
lifecycle/status contracts, feature-free kernel, and their verification
surfaces.

## Completed

- Recorded the maintainer decision in all three ADRs.
- Defined exact dependency pins and rejected unnecessary Phase 2 tooling.
- Defined the no-touch fence, stop conditions, compatibility invariants,
  required browser/performance/supply-chain gates, and rollback.
- Verified Docker MCP Toolkit exposes Context7 tools through the `home` profile.

## Verified

- npm registry metadata was reproduced with Node `24.13.0` and npm `11.6.2`.
- Vite, Lit, and TypeScript documentation was queried through Context7.
- No candidate workspace, package, dependency, build output, or legacy runtime
  file existed or changed during preflight.

## Not verified

- Lockfile integrity, transitive dependencies, audit, license graph, or SBOM.
- Candidate typecheck, unit tests, build determinism, browser behavior,
  accessibility, performance, or package evidence.

## Changed files

- ADR-001 through ADR-003.
- `reengineering/PHASE2_PREFLIGHT.md`.
- `docs/agents/claims/LW-P2-PREFLIGHT-001.md`.
- This handoff and both checkpoint surfaces.
- Living status/blocker records.

## Important relationships

- `LW-P2-001` is additive and cannot import or embed legacy runtime code.
- Phase 1 remains the baseline behavior receipt; the empty candidate shell does
  not advance broad compatibility rows.

## Known risks

- A small shell can become a hidden rewrite if feature/data/provider behavior
  leaks into the spike.
- Registry-latest TypeScript 7 was intentionally not selected for the first
  slice; pin exact TypeScript 6.0.3.

## Do not do next

- Do not touch `docs/app.html`, root HTML mirrors, workers, service workers,
  gateways, desktop shells, persistence, providers, or legacy tests.
- Do not add packages beyond Vite, TypeScript, Lit, and the isolated exact
  Playwright version without a new decision.

## Read first

1. `reengineering/PHASE2_PREFLIGHT.md`
2. `docs/agents/claims/LW-P2-001.md`
3. ADR-001 through ADR-003

## Next exact action

Create the exact root workspace and lockfile, then implement contracts/kernel
tests before the Lit shell.

## Success condition

The candidate shell is independently verified, produces deterministic artifacts
and complete evidence, and leaves every legacy surface byte-untouched.

## Resume command

```powershell
Get-Content -Raw reengineering/PHASE2_PREFLIGHT.md
```
