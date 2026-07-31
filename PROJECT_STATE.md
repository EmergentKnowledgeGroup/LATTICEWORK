<!-- Status: LIVING | Owner: Active technical lead | Update at every handoff -->

# Project State

## Project

LATTICEWORK

## Project state

`PHASE 5 LATTICE MEMORY CHARACTERIZATION VERIFIED`

## Current milestone

`M3 — bounded LatticeMemory compatibility and corrected-candidate planning`

## Current target

`Phase 5 LatticeMemory corrected candidate implementation — package-only and synthetic-only`

## Upstream baseline

`e7585999fc1af2707f410ae87356cf2b52e08d9c`

## Last verified commit

`0ec0de6bb49ef2545d63cde483ed0b901deb50f1` (Phase 5 LatticeMemory
characterization candidate independently reproduced against the immutable
baseline)

The verified Phase 3 candidate
`d746b96225a3eaf59a5b5937e3f531e2cad280ef` is contained in the merged
history, but its packages remain unregistered and inactive. The last verified
active runtime behavior remains the Phase 2 foundation; Phase 3 introduced no
route, listener, provider transport, real-data read, activation, or cutover.

The immutable original Phase 4 characterization remains 20 PASS, 16 UNKNOWN,
and 3 FAIL. The accepted amendment preserves those original results, records
eight confirmed baseline defects as divergences, and independently retests the
remaining eleven cases. The canonical amended result is 31 PASS, eight
ACCEPTED_DIVERGENCE, and zero BLOCKED.

**VERIFIED:** the amended runner completed once with zero retries; all 32
controls and all eleven browser retests passed. Independent QA reproduced the
same result from a clean detached worktree, verified all 41 manifest artifacts,
proved exact-loopback listener teardown and port release, and found no
sentinel/content leak, profile residue, run-root residue, reparse point, shared
dependency, or shared browser-cache use.

The corrected exact implementation packet is accepted and independently GREEN.
It authorizes only a removable, non-default `/p4.html` synthetic/mock slice.
Real data, credentials, provider traffic, application listeners, activation,
migration, deployment, and cutover remain unauthorized.

**MEASURED:** the exact non-default slice is now implemented. Its Chat
controller persists the user before dispatch, appends completed assistant text
only after a completed terminal, records content-free failure/cancellation
metadata, uses one operation controller, and performs zero retry/fallback.
The Lit workbench composes only the accepted in-process mock adapters and
candidate-only `latticework::conversation` repository. Targeted verification
passes every workspace typecheck, 63 unit/control assertions, and seven active
Chrome scenarios. The offline-contract scenario is explicitly skipped because
this packet authorizes no service worker and the candidate makes no offline
claim. Canonical verification passes 187/187 repository controls, deterministic
build, audit, SBOM, supply-chain, and hygiene gates. Independent QA reproduced
the complete gate from a new detached worktree on port 4294 and returned GREEN.

**VERIFIED:** the exact LatticeMemory characterization packet executed all 69
locked atoms in 13 single-worker Chrome groups with zero retry. The promoted
bundle contains 207 content-free receipts, 53 `MATCH` dispositions, 16
`ACCEPTED_DIVERGENCE_CANDIDATE` dispositions, complete listener, port,
profile, and run-root cleanup, and zero external egress or private-sentinel
leakage. Repository controls pass 230/230, the canonical evidence validator is
valid, and an independent clean detached worktree reproduced the result. This
grants no candidate implementation, candidate storage, real-data migration,
activation, deployment, or cutover authority.

## Last verified date

`2026-07-31 07:10 UTC`

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
| `LW-P3-001` | Synthetic conversation storage and deterministic provider foundation | Codex root controller | `main` | `COMPLETED — MERGED / VERIFIED` | `docs/agents/handoffs/LW-P3-001.md` |
| `LW-P4-CTRL-001` | Phase-closed historical and fail-closed active scope controls | Codex root controller | `reengineering/p4-chat-vertical-slice-preflight` | `COMPLETED — GREEN` | `docs/agents/handoffs/LW-P4-CTRL-001.md` |
| `LW-P4-PREFLIGHT-001` | Primary Chat baseline characterization lock | Codex root controller | `reengineering/p4-chat-vertical-slice-preflight` | `COMPLETED — LOCKED / GREEN` | `docs/agents/handoffs/LW-P4-PREFLIGHT-001.md` |
| `LW-P4-CHAR-001` | Synthetic primary Chat baseline characterization | Codex root controller | `reengineering/p4-chat-vertical-slice-preflight` | `COMPLETED — BLOCKED` | `docs/agents/handoffs/LW-P4-CHAR-001.md` |
| `LW-P4-AMEND-001` | Characterization amendment and initial implementation proposal | Codex root controller | `main` | `COMPLETED — MERGED / VERIFIED` | `docs/agents/handoffs/LW-P4-AMEND-001.md` |
| `LW-P4-RETEST-001` | Bounded amended characterization retests | Codex root controller | `reengineering/p4-characterization-retests` | `COMPLETED — GREEN` | `docs/agents/handoffs/LW-P4-RETEST-001.md` |
| `LW-P4-IMPL-PREFLIGHT-001` | Exact bounded implementation packet and range lock | Codex root controller | `reengineering/p4-characterization-retests` | `COMPLETED — ACCEPTED / GREEN` | `docs/agents/handoffs/LW-P4-IMPL-PREFLIGHT-001.md` |
| `LW-P4-001` | Non-default synthetic primary Chat vertical slice | Codex root controller | `main` | `COMPLETED — MERGED / VERIFIED` | `reengineering/evidence/phase-4/LW-P4-001/` |
| `LW-P5-CTRL-001` | Phase 4 closure and fail-closed Phase 5 active scope | Codex root controller | `reengineering/p5-lattice-memory` | `COMPLETED — GREEN` | `docs/agents/handoffs/LW-P5-CTRL-001.md` |
| `LW-P5-MEM-PREFLIGHT-001` | Exact synthetic LatticeMemory characterization lock | Codex root controller | `reengineering/p5-lattice-memory` | `COMPLETED — ACCEPTED / GREEN` | `docs/agents/handoffs/LW-P5-MEM-PREFLIGHT-001.md` |
| `LW-P5-MEM-CHAR-001` | Immutable LatticeMemory browser characterization | Codex root controller | `reengineering/p5-lattice-memory` | `COMPLETED — GREEN` | `docs/agents/handoffs/LW-P5-MEM-CHAR-001.md` |
| `LW-P5-MEM-IMPL-PREFLIGHT-001` | Corrected package-only LatticeMemory implementation lock | Codex root controller | `reengineering/p5-lattice-memory` | `COMPLETED — ACCEPTED / GREEN` | `docs/agents/handoffs/LW-P5-MEM-IMPL-PREFLIGHT-001.md` |

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
- **VERIFIED:** pull request
  [`#2`](https://github.com/EmergentKnowledgeGroup/LATTICEWORK/pull/2)
  merged into `main` at
  `67e960d6671fb2f55e8c795ef472d4fb2ba36f6e`. The automatic CodeRabbit
  status completed successfully but its review was rate-limited and produced
  no code findings; no additional review was requested. Separate
  clean-worktree QA was GREEN with no findings.
- **MEASURED:** post-merge verification on `main` passes six workspace
  typechecks, 51 integrated storage/provider/boundary tests, 107 of 107
  repository controls, five native Chromium IndexedDB scenarios, the valid
  protected-boundary gate, the valid 12-gate/138-artifact evidence validator,
  and a zero-vulnerability npm audit.
- **VERIFIED:** Phase 3 historical validators now inspect the exact closed
  base-to-terminal history, including add-then-delete paths, while a separate
  active Phase 4 validator rejects unauthorized committed, staged, unstaged,
  untracked, and force-added ignored paths. The focused suite passes 48 of 48,
  the full repository-control suite passes 116 of 116, and independent
  guardrail QA is GREEN.
- **VERIFIED:** `reengineering/PHASE4_PREFLIGHT.md` version 1.0 freezes 16
  reporting groups containing 39 mandatory atomic synthetic-profile subcases,
  exact mocked Ollama/OpenAI caller boundaries, denied egress, fresh profiles,
  evidence promotion and cleanup, owned paths, rollback, stop conditions, and
  a zero-UNKNOWN GREEN rule. It grants characterization authority only.
- **VERIFIED:** `LW-P4-RETEST-001` preserves every original result and hash,
  records only the eight maintainer-accepted divergences, and produces eleven
  separately receipted PASS retests. Canonical validation reports 31 PASS,
  eight ACCEPTED_DIVERGENCE, zero BLOCKED, and `valid: true`.
- **VERIFIED:** independent clean-worktree QA at exact candidate
  `55e3731ea1482f37b242da6dc1af8d8181624e9a` reproduced 32/32 controls,
  11/11 retests, 33/33 atomic JSON attachments, and 41/41 manifest artifacts
  with one canonical invocation and zero retries.
- **VERIFIED:** the exact Phase 4 implementation packet is pinned to
  `faf32dbaf8159e8499421fa68d9fba4bede0fdc9`, accepted by the maintainer's
  standing receipt, machine-valid, and independently GREEN after one bounded
  rework round. Focused controls pass 41/41 and full repository controls pass
  180/180.
- **VERIFIED:** the implemented Chat/controller/browser slice at
  `e65ca81940d50eabd5bb72a403deab3bf37bea93` passes targeted typecheck,
  63/63 assertions, 187/187 repository controls, seven active browser scenarios,
  one exact accepted offline-contract skip, deterministic builds, audit, SBOM,
  supply-chain, hygiene, and clean detached-worktree reproduction. No real
  provider/data/credential/application-listener/activation/deployment/cutover
  authority was added.
- **VERIFIED:** pull request
  [`#5`](https://github.com/EmergentKnowledgeGroup/LATTICEWORK/pull/5)
  received one CodeRabbit review, resolved all 14 inline threads after one
  consolidated fix pass, and merged into `main` at
  `1b7e1d10456e0a1e9aaa91df25db17e236bbea3e`. The automatic post-push status
  explicitly skipped an incremental review, so no second review ran.
- **MEASURED:** post-merge verification on `main` passes clean lockfile
  replay, all workspace typechecks, 63/63 targeted assertions, seven active
  browser scenarios plus the one intentional no-offline-contract skip, the
  exact implementation-scope gate, and diff hygiene.

## Blockers

- `LW-BLK-002` through `LW-BLK-004` are closed by explicit acceptance of
  ADR-001 through ADR-003.
- `LW-BLK-005` remains open for broader data ownership/schema/retention
  inventory and every real-data migration; the bounded synthetic conversation
  slice is verified but does not close those obligations.
- `LW-BLK-006` remains open for optional gateway/worker/mesh work.
- `LW-BLK-007` remains open for eventual cutover.
- `LW-BLK-008` is closed by the phase-closed historical and claim-specific
  active-scope controls.
- `LW-BLK-009` is closed by the canonical and independently reproduced amended
  characterization bundle: 31 PASS, eight ACCEPTED_DIVERGENCE, zero BLOCKED.
- `LW-BLK-010` is closed by the exact accepted packet, fail-closed range
  validator, complete negative controls, and independent GREEN re-review.

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
- Prepare a Phase 5 decision/preflight packet and characterization plan.
- Do not implement Phase 5 behavior until its exact work packet is accepted.

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

**Next action:** claim a narrow Phase 5 decision/preflight work unit, map the
first preserved feature boundary, and obtain an accepted implementation packet
before changing runtime behavior.

**Read first:** `docs/agents/handoffs/LW-P4-001.md`,
`reengineering/EXECUTION_CHECKLIST.md`, and `reengineering/BLOCKERBOARD.md`.

**Do not touch:** stored-data/provider/security semantics, default routes,
legacy runtime files, deployment mirrors, or `LICENSE` without a new accepted
decision and work claim.

**Success condition:** the next accepted packet names one bounded Phase 5
feature, preserves all unresolved compatibility obligations, and grants no
real-data, provider, activation, deployment, or cutover authority by accident.

**Resume trigger:** `Read PROJECT_STATE.md, then the latest handoff in docs/agents/handoffs/`
