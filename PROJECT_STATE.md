<!-- Status: LIVING | Owner: Active technical lead | Update at every handoff -->

# Project State

## Project

LATTICEWORK

## Project state

`BOUNDED FOUNDATION VERIFIED / NOT ACTIVATED`

## Current milestone

`M3 — Synthetic storage/provider foundation`

## Current target

`LW-P3-001 — verified; PR #2 open`

## Upstream baseline

`e7585999fc1af2707f410ae87356cf2b52e08d9c`

## Last verified commit

`d746b96225a3eaf59a5b5937e3f531e2cad280ef` (`LW-P3-001` verified implementation candidate)

The last verified merged runtime implementation remains
`c48505c5437c6b9cf67a652cdc2d8c81778c15a1`. The independently verified
Phase 3 candidate is not registered into the runtime and has not yet merged.
It begins from `93a36626f786a880210c53b8486c961e8b86e9ea`.

## Last verified date

`2026-07-30 15:59 UTC`

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
| `LW-P3-DEC-001` | Phase 3 storage/provider/security decision packet | Codex root controller | `reengineering/p3-decision-packet` | `COMPLETED — ACCEPTED` | `docs/agents/handoffs/LW-P3-DEC-001.md` |
| `LW-P3-PREFLIGHT-001` | Exact synthetic storage/provider implementation preflight | Codex root controller | `reengineering/p3-decision-packet` | `COMPLETED — GREEN` | `docs/agents/handoffs/LW-P3-PREFLIGHT-001.md` |
| `LW-P3-001` | Synthetic conversation storage and deterministic provider foundation | Codex root controller | `reengineering/p3-storage-provider-foundation` | `COMPLETED — VERIFIED` | `docs/agents/handoffs/LW-P3-001.md` |

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
- **OBSERVED:** the maintainer accepted ADR-004 through ADR-006 on 2026-07-30
  with the receipt `approved choices - continue`. ADR-004/005 authorize only
  the exact synthetic/mock `LW-P3-001` preflight scope; ADR-006 freezes a future
  proxy contract and authorizes no listener.
- **MEASURED:** the Phase 3 proposal validator is valid and scope-checked, 23
  focused controls and 75 full repository controls pass with zero fail/skip,
  and the evidence bundle is stored under
  `reengineering/evidence/phase-3/LW-P3-DEC-001/`.
- **VERIFIED:** independent final QA reproduced the decision and preflight
  gates and returned GREEN with no actionable findings.
- **MEASURED:** `reengineering/PHASE3_PREFLIGHT.*` freezes exactly two
  candidate packages, three storage namespaces, 12 required verification
  gates, and 15 forbidden legacy/runtime prefixes. Its 15 focused controls and
  the 91-test full repository-control suite pass with zero fail/skip.
- **OBSERVED:** the accepted preflight records
  `implementation_authorized: true` only for its exact synthetic/mock package
  surface. Real-data reads, credentials, provider calls, listeners, legacy
  routes/features, activation, and cutover remain forbidden.
- **VERIFIED:** independent QA reproduced the canonical validator, 39 focused
  controls, 91 full controls, syntax/JSON/link/diff gates, and returned GREEN
  with no actionable finding.
- **VERIFIED:** the bounded `LW-P3-001` candidate
  `d746b96225a3eaf59a5b5937e3f531e2cad280ef` contains additive
  `@latticework/storage` and `@latticework/providers` packages plus shared
  contracts. Canonical and separate clean-worktree gates pass all 12 frozen
  requirements: six workspace typechecks, 26 storage tests, 19 provider tests,
  six boundary tests, ten evidence-validator controls, five native Chromium
  IndexedDB scenarios, and 107 of 107 repository controls with zero
  fail/skip/todo. The evidence manifest contains 138 hashed artifacts and the
  independent review is GREEN with no findings.
- **OBSERVED:** no Phase 3 package is imported by `apps/web` or a legacy
  runtime path. The implementation has no real-data fixture, provider
  transport, listener, ambient credential read, activation API, feature
  registration, or cutover.
- **OBSERVED:** pull request
  [`#2`](https://github.com/EmergentKnowledgeGroup/LATTICEWORK/pull/2)
  is open against `main` from verified branch head
  `f009842574a6df8210ed7c49c812d1b85bb78774`.

## Blockers

- `LW-BLK-002` through `LW-BLK-004` are closed by explicit acceptance of
  ADR-001 through ADR-003.
- `LW-BLK-005` remains open for broader data ownership/schema/retention
  inventory and every real-data migration; the bounded synthetic conversation
  slice is verified but does not close those obligations.
- `LW-BLK-006` remains open for optional gateway/worker/mesh work.
- `LW-BLK-007` remains open for eventual cutover.

## Open decisions

- ADR-012 remains required before LAN/worker/peer/Telegram or optional-proxy
  runtime implementation.
- Browser, desktop, launch-mode, and eventual cutover dispositions.

## AI work allowed without new approval

- Repository inventory.
- Baseline capture.
- Characterization tests.
- Documentation accuracy improvements.
- Reproducible measurement tooling.
- Documentation and evidence corrections that do not change product semantics.
- Evidence-linked documentation and review/merge work for the completed
  bounded synthetic-only `LW-P3-001` claim.

## Human decision required

- Real-data migration, optional-proxy runtime, provider activation, and any
  default-route cutover require separate accepted decisions and evidence.

## Risks

| Risk | Severity | Evidence | Mitigation | Owner |
|---|---|---|---|---|
| Existing smoke suite exits non-zero | High | `reengineering/checkpoints/LATEST.md` | Preserve exact output and freeze requirement manifest before implementation | `LW-M0-001` |
| Runtime mirrors may create canonical-source ambiguity | Critical | `FREELATTICE_REENGINEERING_GOAL_PROMPT.md` | Complete preservation and source maps before source changes | `LW-M0-001` |
| Mobile Garden role control overlaps the Garden title | High | `reengineering/evidence/phase-1/LW-P1-001/artifacts/mobile/mobile-overlap.json` | Preserve as a compatibility observation; resolve only through an accepted, tested divergence | `LW-P2-001` |
| Warm offline reload reaches `ERR_INTERNET_DISCONNECTED` despite an active worker/cache | High | `reengineering/evidence/phase-1/LW-P1-001/artifacts/offline/offline-reload-observation.json` | Preserve the failure fixture and require an explicit offline contract before changing it | `LW-P2-001` |

## Next handoff

**Next action:** Commit the finalized hash-pinned evidence and terminal
documentation, open one review-ready pull request for the verified
`LW-P3-001` candidate, pass required CI without requesting another CodeRabbit
review, merge, and verify `main`.

**Read first:** `reengineering/PHASE3_PREFLIGHT.md`,
`reengineering/PHASE3_DECISION_PACKET.md`,
`docs/decisions/0004-versioned-storage-and-migration.md`,
`docs/decisions/0005-provider-abstraction-and-provenance.md`, and
`docs/decisions/0006-optional-local-proxy-security.md`.

**Do not touch:** stored-data/provider/security semantics, default routes,
legacy runtime files, deployment mirrors, or `LICENSE` without a new accepted
decision and work claim.

**Success condition:** the single Phase 3 pull request is merged, `main`
contains the verified candidate and evidence, post-merge controls remain
green, and no candidate runtime path has been activated.

**Resume trigger:** `Read PROJECT_STATE.md, then the latest handoff in docs/agents/handoffs/`
