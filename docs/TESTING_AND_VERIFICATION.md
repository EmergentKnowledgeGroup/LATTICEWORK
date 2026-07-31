<!-- Status: LIVING | Owner: Verification lead -->

# Testing and Verification

## Verification layers

1. Static checks.
2. Unit tests.
3. Contract tests.
4. Characterization tests.
5. Integration tests.
6. Storage and migration tests.
7. Browser end-to-end tests.
8. Offline and service-worker tests.
9. Provider adapter tests.
10. Peer-to-peer tests.
11. Security and privacy checks.
12. Clean-room compatibility runs.
13. Release smoke tests.

## Test inventory

| Suite | Command | Scope | Environment | Expected count | Current result | Artifact |
|---|---|---|---|---:|---|---|
| Baseline smoke | `node tests/smoke.js` | cumulative source/release assertions | Windows 10; Node 24.13.0; immutable baseline | 3,213 | 3,106 pass; 107 fail; exit 1; 4.434 s | [receipt](../reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json) |
| Baseline smoke history | `node tests/smoke-history.js` | archived historical assertions | same | 0 executed | parse-time SyntaxError at line 99; exit 1; 0.053 s | [receipt](../reengineering/evidence/phase-0/LW-P0-002-smoke-history/manifest.json) |
| Evidence tools | `node --test tests/reengineering/evidence-tools.test.mjs` | receipt/hash/capture tooling | Windows 10; Node 24.13.0 | 4 | 4 pass | current workstream receipt pending |
| Capability registry | `node --test tests/reengineering/capability-registry.test.mjs` | preservation-row generation and schema invariants | Windows 10; Node 24.13.0 | 1 | 1 pass | current workstream receipt pending |
| Phase 0 Chrome characterization | Playwright CLI named sessions; commands in receipt/report | onboarding, skip, Garden, mobile, forced colors/reduced motion, no-WebGPU, offline reload, Signal Report, storage/network | Windows 10; Chrome 150; local HTTP | bounded flows | Partial C1 observations; offline reload failed; no pass/fail aggregate | [receipt](../reengineering/evidence/phase-0/LW-P0-003-browser/README.md) |
| Phase 0 Edge/direct-file launch | Playwright CLI for Edge; isolated Chrome headless for `file://` | first-run shell, runtime names, network requests, direct-file first render | Windows 10; Edge/Chrome 150 | two bounded launch flows | Partial C1 observations; interaction/cross-browser parity not established | [receipt](../reengineering/evidence/phase-0/LW-P0-003-browser/README.md) |
| Phase 0 fixed performance profiles | commands to be captured per profile | cold/warm desktop, emulated mobile, accessibility, offline warm, GPU cleanup | pinned by profile | five runs per applicable profile | PROPOSED; execution pending | [measurement contract](../reengineering/PERFORMANCE_PLAN.md) |
| Phase 1 executable characterization | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/reengineering/run-phase1-characterization.ps1` | HTTP first run/skip, fresh storage shape, Garden, Chat shell, Signal Report, mobile, no-WebGPU, warm offline reload, denied network | Windows 10; Node 24.13.0; Playwright 1.62.0; bundled Chromium 151; immutable baseline | 7 | 7 pass; 0 skip/unexpected/flaky; exit 0; 31.188 s | [measured summary](../reengineering/evidence/phase-1/LW-P1-001/summary.json) |
| Repository control tests | `node --test --test-reporter=tap tests/reengineering/*.test.mjs` | evidence tooling, registries, Phase 0/1 controls, Phase 2 boundary/build/supply-chain/evidence validators, Phase 3 decision/preflight controls, and negative safety fixtures | Windows 10; Node 24.13.0; immutable baseline root supplied | 91 | 91 pass; 0 fail/skip | [Phase 3 preflight receipt](../reengineering/evidence/phase-3/LW-P3-PREFLIGHT-001/commands/controls/manifest.json); [decision receipt](../reengineering/evidence/phase-3/LW-P3-DEC-001/commands/controls/manifest.json); [Phase 2 receipt](../reengineering/evidence/phase-2/LW-P2-001/commands/controls/manifest.json) preserves the earlier 52-test gate |
| Phase 2 strict typecheck | `npm run p2:typecheck` | candidate web, contracts, and kernel workspaces | Windows 10; Node 24.13.0; TypeScript 6.0.3 | 3 workspaces | pass; exit 0 | [receipt](../reengineering/evidence/phase-2/LW-P2-001/commands/typecheck/manifest.json) |
| Phase 2 kernel unit tests | `npm run p2:test` | lifecycle order, duplicate rejection, reverse stop, and safe failure diagnostics | same | 5 | 5 pass | [receipt](../reengineering/evidence/phase-2/LW-P2-001/commands/unit/manifest.json) |
| Phase 2 deterministic build | two clean `npm run p2:build` runs plus verifier | relative Vite output paths and raw/gzip/Brotli artifact bytes | same; Vite 8.1.5 | 4 artifacts per build | byte-identical; valid | [comparison](../reengineering/evidence/phase-2/LW-P2-001/build-comparison.json) |
| Phase 2 candidate browser gate | `npm run p2:browser` | desktop, 390 x 844 mobile, keyboard, reduced motion, forced colors, no egress/storage/worker/legacy, and provisional performance | Windows 10; Playwright 1.62.0; bundled Chromium | 6 | 6 pass; 0 skip/unexpected/flaky | [summary](../reengineering/evidence/phase-2/LW-P2-001/summary.json) |
| Phase 2 supply-chain gate | `npm audit --workspaces --include-workspace-root --json`, CycloneDX SBOM, and repository collector | exact lockfile integrity, licenses, optional packages, lifecycle scripts, and vulnerability count | same | 58 external lockfile packages | valid; 0 audit vulnerabilities | [receipt](../reengineering/evidence/phase-2/LW-P2-001/supply-chain.json) |
| Phase 2 evidence validator | `node tools/reengineering/validate-phase2-evidence.mjs ...` | command receipts, hashes, identity, browser artifacts, protected paths, and sentinel safety | same | 16 commands; 8 protected paths; 8 required browser artifacts | valid; 0 failures | [validation](../reengineering/evidence/phase-2/LW-P2-001/validation.json) |
| Phase 3 decision/preflight acceptance controls | `node --test tests/reengineering/phase3-decision-packet.test.mjs tests/reengineering/phase3-preflight.test.mjs` | exact maintainer receipt, accepted bounded authority, additive registry floor, blockers, exact safety contracts/invariants, implementation scope fence, Markdown projection, and unsafe mutation rejection | Windows 10; Node 24.13.0 | 39 | 39 pass | Acceptance run on 2026-07-30; [implementation evidence](../reengineering/evidence/phase-3/LW-P3-001/summary.json) |
| Phase 3 strict typecheck | `npm run p3:typecheck` | web, contracts, kernel, storage, provider, and browser-harness TypeScript projects | Windows 10; Node 24.13.0; TypeScript 6.0.3 | 6 workspaces | pass; exit 0 | [canonical receipt](../reengineering/evidence/phase-3/LW-P3-001/commands/strict-typecheck/manifest.json) |
| Phase 3 storage/provider tests | `npm run p3:test` | storage migration/import/journal/native-value behavior; provider routing/stream/retry/deadline/cancellation/provenance; no-egress and namespace boundaries | same | 51 | 51 pass; 0 fail/skip | [canonical receipt](../reengineering/evidence/phase-3/LW-P3-001/commands/node-unit/manifest.json) |
| Phase 3 native IndexedDB browser gate | `npm run p3:browser` | synthetic v3 copy, every checkpoint resume, rollback, future abstention, hostile staging, blocked upgrade, quota failure, source equivalence, and no egress | Windows 10; Playwright 1.62.0; bundled Chromium | 5 | 5 pass; 0 skip/unexpected/flaky | [canonical receipt](../reengineering/evidence/phase-3/LW-P3-001/commands/browser-indexeddb/manifest.json) |
| Phase 3 evidence-validator controls | `node --test tests/reengineering/phase3-evidence-validation.test.mjs` | hash/identity/gate/review/secret/completeness acceptance, clean-worktree receipt validation, isolated replay descendant proof, restored workspace lifecycle scripts, and negative fixtures | Windows 10; Node 24.13.0 | 10 | 10 pass | [canonical receipt](../reengineering/evidence/phase-3/LW-P3-001/commands/full-repository-controls/manifest.json) |
| Phase 4 amended characterization | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/reengineering/run-phase4-amendment-retests.ps1 -IndependentReviewPath <receipt>` | eleven frozen retests, immutable original hashes/statuses, exact-loopback synthetic stream, denied egress, profile/run-root cleanup, and independent reproduction | Windows 10; Node 24.13.0; Playwright 1.62.0; bundled Chromium; immutable baseline | 32 controls; 11 retests | 32/32 controls and 11/11 retests pass; final 31 PASS / 8 ACCEPTED_DIVERGENCE / 0 BLOCKED | [canonical summary](../reengineering/evidence/phase-4/LW-P4-RETEST-001/summary.json); [independent receipt](../reengineering/evidence/phase-4/LW-P4-RETEST-001/independent-review.json) |
| Phase 4 synthetic Chat targeted gate | `npm run p4:typecheck && npm run p4:test && npm run p4:browser` | controller persistence/terminal/cancel invariants, exact-loopback fixture lifecycle, packet controls, mock-local/cloud UI, reload, diagnostics, mobile/a11y media, unchanged `/` | Windows 10; Node 24.13.0; TypeScript 6.0.3; Playwright 1.62.0; bundled Chromium | 52 unit/control assertions; 7 browser cases | typecheck pass; 52/52 assertions pass; 6 browser pass and 1 explicit offline-contract skip | canonical committed evidence pending at `reengineering/evidence/phase-4/LW-P4-001/` |

## Characterization tests

Characterization tests capture upstream behavior before replacement.

They should identify whether a behavior is:

- Intended and supported.
- Accidental but user-visible.
- A bug to correct.
- Unknown.
- Unsafe or impossible to preserve.

## Verification gates

A structural pull request cannot merge unless:

- Relevant existing tests pass.
- New behavior has tests.
- Compatibility surfaces are updated.
- Data changes have migration tests.
- Raw output is attached.
- Documentation matches implementation.
- Rollback is possible or explicitly waived.

## Clean-room verification

Major claims should be reproduced from a clean clone using documented commands by a reviewer who did not implement the change.

## Test quality checks

Passing counts are insufficient.

Review:

- Assertion relevance.
- False positives.
- Skipped tests.
- Flakiness.
- Shared mutable state.
- Hidden network dependencies.
- Order dependence.
- Tests that only search source text.
- Tests that pass while runtime errors occur.
- Fixtures that do not represent real stored data.

## Current status

**MEASURED:** the baseline gate is red. The current smoke has 107 failures and
the historical file does not parse. No reduced subset may be called green.

Failure disposition in the current smoke:

| Category | Count | Current interpretation |
|---|---:|---|
| Stale version/cache/version assertions | 100 | Historical release assertions, not authorization to delete |
| Historical feature/structure literals | 4 | Intent requires explicit disposition |
| Repository/environment assertion | 1 | Executable-bit expectation on Windows |
| Current source-behavior checks | 2 | Search sentinel stripping and emotion target-HSL assignment require owner/behavior investigation |

**UNKNOWN:** comprehensive browser behavior, real provider calls, stored-record
schemas and values, offline update/rollback, cross-browser/OS behavior, complete
accessibility, fixed-profile performance, and desktop flows have not yet been
verified.

The Phase 0 Chrome receipt reduces, but does not close, those unknowns: provider
calls, record schemas, full accessibility, accepted performance budgets,
cross-browser/OS behavior, PWA update/rollback, and desktop flows remain open.

**MEASURED:** the additive Phase 1 suite turns seven bounded Chrome paths into
repeatable C2 fixtures without modifying the baseline. Its safety gate recorded
six network receipts, blocked 96 out-of-origin HTTP requests, one external
WebSocket attempt, and eight realtime-channel attempts; allowed zero external
network requests; and found no synthetic private-sentinel leak. The suite
preserves rather than hides the mobile Presence-button/title overlap and the
warm offline reload failure.

**VERIFIED:** an independent QA run used a separate loopback port and separate
Z:-local evidence directory, reproduced 19 of 19 repository-control tests and 7
of 7 browser scenarios, revalidated the clean pinned baseline and safety
invariants, and accepted the bounded `LW-P1-001` work unit. This acceptance does
not upgrade broader compatibility or release readiness. Receipt:
[`independent-review/`](../reengineering/evidence/phase-1/LW-P1-001/independent-review/README.md).

**MEASURED:** the canonical Phase 2 run at candidate
`7e928bba605e0309273989bf8fd1303d2a822923` passed all rows above, reproduced
the committed lockfile in an isolated workspace, produced two byte-identical
builds, and kept all eight protected legacy committed blobs byte-equal to the
pinned baseline independently of checkout line-ending conversion.

**VERIFIED:** independent Phase 2 QA reran the complete verifier from a
separate detached worktree on loopback port 4183 and reproduced 5 of 5 kernel
tests, 52 of 52 controls with zero skips, 6 of 6 browser scenarios, zero audit
vulnerabilities, the deterministic lock/build gates, and the protected/no-state
browser boundary. Receipt:
[`Phase 2 independent review`](../reengineering/evidence/phase-2/LW-P2-001/independent-review/REVIEW.md).

The Phase 2 result is a feature-free architecture foundation. It does not
upgrade any legacy compatibility level or establish real provider, stored-data,
PWA, desktop, full accessibility, or release behavior.

**MEASURED:** the combined Phase 3 decision/preflight acceptance controls pass
39 of 39 positive and negative cases. They prove the exact accepted receipt,
bounded implementation authority, safety contract, and scope fence while
preventing accidental blocker closure or wider authority. They do not test a
storage repository, provider adapter, migration, proxy, or cutover because none
is implemented or authorized.

**VERIFIED:** independent final QA at
`22c3742cdc7863f16bf190ee23ddc67eabc20ec1` reproduced the validator, 23
focused controls, 75 full repository controls, CLI scope-bypass rejection, and
`git diff --check`; it returned GREEN with no actionable findings. Receipt:
[`independent-review.md`](../reengineering/evidence/phase-3/LW-P3-DEC-001/independent-review.md).

**VERIFIED:** the accepted `LW-P3-001` candidate
`d746b96225a3eaf59a5b5937e3f531e2cad280ef` satisfies all 12 frozen
Phase 3 gates. The canonical run records 107 of 107 repository controls with
zero fail/skip/todo, six workspace typechecks, 51 storage/provider/boundary
tests, ten evidence-validator controls, five native Chromium IndexedDB
scenarios, byte-identical builds and isolated lock replay, zero audit
vulnerabilities, protected-boundary/no-egress receipts, and a 138-artifact
hash manifest. A separate clean detached worktree reproduced the required
gates and returned GREEN with no findings. Receipts:
[summary](../reengineering/evidence/phase-3/LW-P3-001/summary.json),
[manifest](../reengineering/evidence/phase-3/LW-P3-001/manifest.json), and
[independent review](../reengineering/evidence/phase-3/LW-P3-001/independent-review/REVIEW.md).

The storage gate uses only generated synthetic records and native browser
IndexedDB; the provider gate uses only deterministic in-process adapters and
source-enforced no-egress boundaries. No package is registered into the
application. This is not evidence of real provider behavior, real-data
migration, feature parity, activation, cutover, or release readiness.

**UNKNOWN:** the Phase 1 result does not establish real provider behavior,
message send/stream/cancel/retry, persisted-record values or migrations,
cross-browser/OS parity, full accessibility, PWA update/rollback, desktop
packaging, or clean-room candidate parity.
