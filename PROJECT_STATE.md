<!-- Status: LIVING | Owner: Active technical lead | Update at every handoff -->

# Project State

## Project

LATTICEWORK

## Project state

`BOUNDED IMPLEMENTATION`

## Current milestone

`M3 — Data/provider/security decision gate`

## Current target

`reengineering/p3-decision-packet`

## Upstream baseline

`e7585999fc1af2707f410ae87356cf2b52e08d9c`

## Last verified commit

`6704dd502a140fce2fe8e06f8db336d0bd3839a5` (Phase 2 merge checkpoint)

The last verified implementation merge is
`c48505c5437c6b9cf67a652cdc2d8c81778c15a1`; the later commit changes only
post-merge control documentation.

## Last verified date

`2026-07-30 12:50 UTC`

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
| `LW-P2-001` | Isolated typed kernel/contracts/status-shell candidate | Codex root controller | `reengineering/m0-baseline-characterization` | `COMPLETED` | `docs/agents/handoffs/LW-P2-001.md` |
| `LW-P3-DEC-001` | Phase 3 storage/provider/security decision packet | Codex root controller | `reengineering/p3-decision-packet` | `IN_PROGRESS` | `reengineering/PHASE3_DECISION_PACKET.md` |

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
- The feature-free Phase 2 candidate at
  `7e928bba605e0309273989bf8fd1303d2a822923` implements strict typed
  lifecycle/status contracts, a dependency-injected kernel, and a local-only
  Lit status shell without changing a legacy route or durable state.
- **MEASURED:** the canonical Phase 2 run passed strict typecheck, 5 of 5
  kernel tests, 52 of 52 repository-control tests with zero skips, two byte-identical builds,
  and 6 of 6 browser scenarios; npm audit reported zero vulnerabilities.
- **VERIFIED:** independent QA reproduced the full gate from a separate
  detached Z:-local worktree on port 4182 and accepted the bounded work unit.
  This does not establish feature parity, migration, cutover, or release
  readiness.
- Pull request
  [`#1`](https://github.com/EmergentKnowledgeGroup/LATTICEWORK/pull/1)
  received the single authorized CodeRabbit review, resolved all 19 review
  threads, passed its required checks, and merged at
  `c48505c5437c6b9cf67a652cdc2d8c81778c15a1`.
- The post-merge control checkpoint was pushed to `main` at
  `6704dd502a140fce2fe8e06f8db336d0bd3839a5`.
- **PROPOSED:** ADR-004 through ADR-006 and
  `reengineering/PHASE3_DECISION_PACKET.*` now describe the bounded Phase 3
  storage, provider, and optional-proxy contracts. They have not been accepted
  and authorize no runtime, storage, provider, listener, or cutover change.

## Blockers

- `LW-BLK-002` through `LW-BLK-004` are closed by explicit acceptance of
  ADR-001 through ADR-003.
- `LW-BLK-005` remains open for Phase 3 data/storage work.
- `LW-BLK-006` remains open for optional gateway/worker/mesh work.
- `LW-BLK-007` remains open for eventual cutover.

## Open decisions

- Disposition of proposed ADR-004 before Phase 3 storage implementation.
- Disposition of proposed ADR-005 before Phase 3 provider-contract
  implementation.
- Disposition of proposed ADR-006 before later optional-proxy work; ADR-012
  remains required before LAN/worker/peer/Telegram implementation.
- Browser, desktop, launch-mode, and eventual cutover dispositions.

## AI work allowed without new approval

- Repository inventory.
- Baseline capture.
- Characterization tests.
- Documentation accuracy improvements.
- Reproducible measurement tooling.
- Documentation and evidence corrections that do not change product semantics.
- Read-only Phase 3 data/provider characterization and ADR drafting.

## Human decision required

- A versioned data/storage and migration ADR is required before Phase 3
  implementation.
- Provider/security implementation and any default-route cutover require
  separate accepted decisions.

## Risks

| Risk | Severity | Evidence | Mitigation | Owner |
|---|---|---|---|---|
| Existing smoke suite exits non-zero | High | `reengineering/checkpoints/LATEST.md` | Preserve exact output and freeze requirement manifest before implementation | `LW-M0-001` |
| Runtime mirrors may create canonical-source ambiguity | Critical | `FREELATTICE_REENGINEERING_GOAL_PROMPT.md` | Complete preservation and source maps before source changes | `LW-M0-001` |
| Mobile Garden role control overlaps the Garden title | High | `reengineering/evidence/phase-1/LW-P1-001/artifacts/mobile/mobile-overlap.json` | Preserve as a compatibility observation; resolve only through an accepted, tested divergence | `LW-P2-001` |
| Warm offline reload reaches `ERR_INTERNET_DISCONNECTED` despite an active worker/cache | High | `reengineering/evidence/phase-1/LW-P1-001/artifacts/offline/offline-reload-observation.json` | Preserve the failure fixture and require an explicit offline contract before changing it | `LW-P2-001` |

## Next handoff

**Next action:** Validate `LW-P3-DEC-001`, record independent review, and obtain
explicit maintainer dispositions for proposed ADR-004 through ADR-006 before
opening the separately claimed `LW-P3-001` implementation.

**Read first:** `reengineering/PHASE3_DECISION_PACKET.md`,
`docs/decisions/0004-versioned-storage-and-migration.md`,
`docs/decisions/0005-provider-abstraction-and-provenance.md`, and
`docs/decisions/0006-optional-local-proxy-security.md`.

**Do not touch:** stored-data/provider/security semantics, default routes,
legacy runtime files, deployment mirrors, or `LICENSE` without a new accepted
decision and work claim.

**Success condition:** the proposal validator and full repository-control suite
are green, independent reviewers report no unresolved issue, and maintainer
acceptance or rejection is recorded without weakening any blocker.

**Resume trigger:** `Read PROJECT_STATE.md, then the latest handoff in docs/agents/handoffs/`
