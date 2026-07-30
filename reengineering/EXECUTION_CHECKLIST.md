# LATTICEWORK Execution Checklist

**Status values:** `PENDING`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `DEFERRED`

| ID | Phase | Status | Owned paths | Depends on | Complexity | Acceptance | Validation | Evidence | Rollback |
|---|---:|---|---|---|---:|---|---|---|---|
| `LW-P0-001` | 0 | `DONE` | docs/control/evidence only | none | 4 | Fork, provenance, exact license, tag, detached worktree verified | Git/hash checks | `evidence/phase-0/LW-P0-001/` | Remove candidate-only refs/files; baseline untouched |
| `LW-P0-002` | 0 | `DONE` | `reengineering/evidence/phase-0/**` | P0-001 | 6 | Tree, metrics, dependency, data, network, capability, and test inventories reproduced | Evidence scripts + JSON parse | `evidence/phase-0/` | Regenerate from pinned worktree |
| `LW-P0-003` | 0 | `DONE` | living docs and reengineering maps | P0-002 | 5 | Control artifacts link to receipts and contain no unsupported upgrade of evidence labels | Hash/link/placeholder control validator | `evidence/phase-0/LW-P0-003-control-validation/` | Revert living-doc update |
| `LW-P0-004` | 0 | `DONE` | `docs/decisions/0001-0003*` | P0-002 | 7 | Canonical source, module architecture, and UI strategy proposals include alternatives, compatibility, rollback, and verification | ADR review checklist in control validator | `evidence/phase-0/LW-P0-003-control-validation/` | Leave Proposed/reject |
| `LW-P1-001` | 1 | `DONE` | additive characterization tests/fixtures | P0-003, P0-004 | 8 | Seven bounded workflows have executable browser/storage/network receipts against the immutable baseline; evidence safety gate is green | 7/7 Playwright characterization; 19/19 reengineering controls; Phase 1 validator plus negative safety fixtures | `evidence/phase-1/LW-P1-001/` | Remove additive harness only |
| `LW-P2-001` | 2 | `IN_PROGRESS` | workspace, kernel, contracts, empty shell | Accepted ADR-001..003, P1-001 | 8 | Strict typed shell builds/boots; legacy remains runnable; generated output reproducible | typecheck/unit/build/browser smoke | `evidence/phase-2/LW-P2-001/` | Delete candidate shell commit; baseline unchanged |
| `LW-P3-001` | 3 | `BLOCKED` | storage/provider packages | P2-001, accepted ADR-004/005 | 9 | Versioned repositories, migration runner, provider contracts, import/export round-trip | unit/contract/integration | `evidence/phase-3/LW-P3-001/` | Feature flag + data restore |
| `LW-P4-001` | 4 | `BLOCKED` | onboarding/provider/chat/conversations/diagnostics | P3-001 | 9 | First vertical slice passes browser E2E, mobile/desktop, offline local, mock cloud, accessibility, recovery | full vertical-slice gate | `evidence/phase-4/LW-P4-001/` | Legacy route remains default |
| `LW-P5-001` | 5 | `BLOCKED` | Core/memory/Question Corner/Workshop/export/sync | P4-001 | 10 | Each feature has contract, owned state, migration receipt, E2E, and parity disposition | per-feature gate | `evidence/phase-5/` | Feature-by-feature rollback |
| `LW-P6-001` | 6 | `BLOCKED` | creative/GPU features | P5-001 | 10 | Lazy lifecycle, cleanup, budgets, reduced motion, safe mode, mobile fallback | browser/perf/a11y | `evidence/phase-6/` | Legacy feature boundary |
| `LW-P7-001` | 7 | `BLOCKED` | gateway/workers/mesh/Telegram | accepted security ADRs, P3-001 | 10 | Authenticated, optional, rate-limited, observable, network-denial local mode | security/integration suite | `evidence/phase-7/` | Disable optional services |
| `LW-P8-001` | 8 | `BLOCKED` | selected desktop shell | accepted desktop-strategy ADR (number unassigned) | 9 | One supported or honestly deferred desktop strategy with least privilege | platform/security E2E | `evidence/phase-8/` | Defer desktop release |
| `LW-P9-001` | 9 | `BLOCKED` | cutover/migration/release | P4-P8 complete | 10 | Complete parity dispositions, migration/rollback, reproducible release, owner cutover approval | release gate | `evidence/phase-9/` | Promote previous known-good artifact |
| `LW-P10-001` | 10 | `BLOCKED` | post-parity UX/quality | P9-001 | 8 | Improvements do not conceal missing parity and meet budgets | regression/perf/a11y | `evidence/phase-10/` | Revert bounded improvement |

## Completion rule

A row moves to `DONE` only when its evidence directory contains a manifest with exact commands, exit codes, commit SHAs, environment, timestamps, and hashes.
