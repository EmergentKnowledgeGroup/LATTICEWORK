<!-- Status: LIVING | Owner: Active technical lead | Update at every handoff -->

# Project State

## Project

LATTICEWORK

## Project state

`BOUNDED IMPLEMENTATION`

## Current milestone

`M2 — Typed candidate foundation`

## Current target

`reengineering/m0-baseline-characterization`

## Upstream baseline

`e7585999fc1af2707f410ae87356cf2b52e08d9c`

## Last verified commit

`e7585999fc1af2707f410ae87356cf2b52e08d9c` (baseline; documentation-pack changes are uncommitted)

## Last verified date

`2026-07-30 10:28 UTC`

## Locked constraints

- Preserve upstream Git history and MIT attribution.
- Do not claim compatibility before evidence.
- Do not remove behavior without an accepted divergence record.
- Public comparisons must use pinned commits and reproducible commands.
- Security, privacy, identity, cryptography, and stored-data changes require explicit approval.
- The repository, not private chat history, is the source of operational truth.

## Active workstreams

| ID | Workstream | Owner | Branch | Status | Evidence |
|---|---|---|---|---|---|
| `LW-M0-001` | Immutable baseline and Phase 0 characterization | Codex root controller | `reengineering/m0-baseline-characterization` | `COMPLETED` | `docs/agents/handoffs/LW-M0-001.md` |
| `LW-P1-001` | Executable baseline characterization and fixtures | Codex root controller | `reengineering/m0-baseline-characterization` | `COMPLETED` | `docs/agents/handoffs/LW-P1-001.md` |
| `LW-P2-PREFLIGHT-001` | Accepted architecture and exact Phase 2 execution packet | Codex root controller | `reengineering/m0-baseline-characterization` | `COMPLETED` | `docs/agents/handoffs/LW-P2-PREFLIGHT-001.md` |
| `LW-P2-001` | Isolated typed kernel/contracts/status-shell candidate | Codex root controller | `reengineering/m0-baseline-characterization` | `IN_PROGRESS` | `reengineering/PHASE2_PREFLIGHT.md` |

## Completed in current milestone

- Fork worktree installed at `Z:\LATTICEWORK` with upstream history preserved.
- Canonical documentation pack overlaid with the exact upstream `LICENSE` retained.
- Immutable baseline tag and detached worktree created at the pinned upstream SHA.
- Phase 0 preservation/archive, environment, structural, dependency, capability,
  data, network, browser, launch-mode, and test evidence frozen.
- Capability registry contains 278 unknown-preserve obligations; data registry
  contains 252 unknown-preserve storage obligations.
- ADR-001 through ADR-003 were explicitly accepted by the maintainer on
  2026-07-30; the fixed performance measurement contract remains the
  candidate gate.
- The additive Phase 1 Playwright harness passes 7 of 7 bounded
  characterization scenarios against the clean immutable baseline.
- Phase 1 freezes executable receipts for HTTP first run and skip, fresh
  storage initialization, Garden boot, no-WebGPU fallback, the Chat shell,
  Signal Report open/copy, the 390 × 844 Garden overlap, and the observed warm
  offline reload failure.
- The Phase 1 safety gate blocked 96 out-of-origin HTTP requests, one external
  WebSocket attempt, and eight realtime-channel attempts; allowed zero external
  network requests; and found no synthetic private-sentinel leak.
- An independent QA run on a separate loopback port reproduced 19 of 19 control
  tests and 7 of 7 browser scenarios and accepted the bounded `LW-P1-001` work
  unit as `VERIFIED`.
- The exact Phase 2 owned paths, dependency pins, no-touch fence, browser,
  performance, supply-chain, evidence, and rollback gates are frozen in
  `reengineering/PHASE2_PREFLIGHT.md`.

## Blockers

- `LW-BLK-002` through `LW-BLK-004` are closed by explicit acceptance of
  ADR-001 through ADR-003.
- `LW-BLK-005` remains open for Phase 3 data/storage work.
- `LW-BLK-006` remains open for optional gateway/worker/mesh work.
- `LW-BLK-007` remains open for eventual cutover.

## Open decisions

- A versioned data/storage and migration ADR before Phase 3.
- Provider and security boundary decisions before provider/worker work.
- Browser, desktop, launch-mode, and eventual cutover dispositions.

## AI work allowed without new approval

- Repository inventory.
- Baseline capture.
- Characterization tests.
- Documentation accuracy improvements.
- Reproducible measurement tooling.
- The exact additive `LW-P2-001` paths and verification work in
  `reengineering/PHASE2_PREFLIGHT.md`.

## Human decision required

- No further architecture decision is required for the bounded `LW-P2-001`
  status-shell spike.
- Phase 3 data/provider work and any default-route cutover still require
  separate accepted decisions.

## Risks

| Risk | Severity | Evidence | Mitigation | Owner |
|---|---|---|---|---|
| Existing smoke suite exits non-zero | High | `reengineering/checkpoints/LATEST.md` | Preserve exact output and freeze requirement manifest before implementation | `LW-M0-001` |
| Runtime mirrors may create canonical-source ambiguity | Critical | `FREELATTICE_REENGINEERING_GOAL_PROMPT.md` | Complete preservation and source maps before source changes | `LW-M0-001` |
| Mobile Garden role control overlaps the Garden title | High | `reengineering/evidence/phase-1/LW-P1-001/artifacts/mobile/mobile-overlap.json` | Preserve as a compatibility observation; resolve only through an accepted, tested divergence | `LW-P2-001` |
| Warm offline reload reaches `ERR_INTERNET_DISCONNECTED` despite an active worker/cache | High | `reengineering/evidence/phase-1/LW-P1-001/artifacts/offline/offline-reload-observation.json` | Preserve the failure fixture and require an explicit offline contract before changing it | `LW-P2-001` |

## Next handoff

**Next action:** Implement and verify `LW-P2-001` exactly as claimed in
`docs/agents/claims/LW-P2-001.md`.

**Read first:** `docs/agents/handoffs/LW-P2-PREFLIGHT-001.md`,
`reengineering/PHASE2_PREFLIGHT.md`, and
`docs/agents/claims/LW-P2-001.md`.

**Do not touch:** The no-touch fence in `reengineering/PHASE2_PREFLIGHT.md`,
stored-data/provider/security semantics, unrelated dirty work, or `LICENSE`.

**Success condition:** the isolated shell/kernel/contracts slice passes all
canonical and independent gates, produces a complete evidence manifest, and
leaves legacy protected paths byte-untouched.

**Resume trigger:** `Read PROJECT_STATE.md, then the latest handoff in docs/agents/handoffs/`
