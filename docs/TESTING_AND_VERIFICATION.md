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
| Repository control tests | `node --test tests/reengineering/*.test.mjs` | evidence tooling, registries, Phase 0/1 controls, Phase 2 boundary/build/supply-chain/evidence validators, and negative safety fixtures | Windows 10; Node 24.13.0 | 37 | 37 pass | [Phase 2 command receipt](../reengineering/evidence/phase-2/LW-P2-001/commands/controls/manifest.json) |
| Phase 2 strict typecheck | `npm run p2:typecheck` | candidate web, contracts, and kernel workspaces | Windows 10; Node 24.13.0; TypeScript 6.0.3 | 3 workspaces | pass; exit 0 | [receipt](../reengineering/evidence/phase-2/LW-P2-001/commands/typecheck/manifest.json) |
| Phase 2 kernel unit tests | `npm run p2:test` | lifecycle order, duplicate rejection, reverse stop, and safe failure diagnostics | same | 5 | 5 pass | [receipt](../reengineering/evidence/phase-2/LW-P2-001/commands/unit/manifest.json) |
| Phase 2 deterministic build | two clean `npm run p2:build` runs plus verifier | relative Vite output paths and raw/gzip/Brotli artifact bytes | same; Vite 8.1.5 | 4 artifacts per build | byte-identical; valid | [comparison](../reengineering/evidence/phase-2/LW-P2-001/build-comparison.json) |
| Phase 2 candidate browser gate | `npm run p2:browser` | desktop, 390 x 844 mobile, keyboard, reduced motion, forced colors, no egress/storage/worker/legacy, and provisional performance | Windows 10; Playwright 1.62.0; bundled Chromium | 6 | 6 pass; 0 skip/unexpected/flaky | [summary](../reengineering/evidence/phase-2/LW-P2-001/summary.json) |
| Phase 2 supply-chain gate | `npm audit --all --json`, CycloneDX SBOM, and repository collector | exact lockfile integrity, licenses, optional packages, lifecycle scripts, and vulnerability count | same | 58 external lockfile packages | valid; 0 audit vulnerabilities | [receipt](../reengineering/evidence/phase-2/LW-P2-001/supply-chain.json) |
| Phase 2 evidence validator | `node tools/reengineering/validate-phase2-evidence.mjs ...` | command receipts, hashes, identity, browser artifacts, protected paths, and sentinel safety | same | 16 commands; 8 protected paths; 8 required browser artifacts | valid; 0 failures | [validation](../reengineering/evidence/phase-2/LW-P2-001/validation.json) |

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
`c8a040fb38f627bf4d0353b3497645653a57139c` passed all rows above, reproduced
the committed lockfile in an isolated workspace, produced two byte-identical
builds, and kept all eight protected legacy files byte-equal to the pinned
baseline.

**VERIFIED:** independent Phase 2 QA reran the complete verifier from a
separate evidence directory on loopback port 4177 and reproduced 5 of 5 kernel
tests, 37 of 37 controls, 6 of 6 browser scenarios, zero audit
vulnerabilities, the deterministic lock/build gates, and the protected/no-state
browser boundary. Receipt:
[`Phase 2 independent review`](../reengineering/evidence/phase-2/LW-P2-001/independent-review/REVIEW.md).

The Phase 2 result is a feature-free architecture foundation. It does not
upgrade any legacy compatibility level or establish real provider, stored-data,
PWA, desktop, full accessibility, or release behavior.

**UNKNOWN:** the Phase 1 result does not establish real provider behavior,
message send/stream/cancel/retry, persisted-record values or migrations,
cross-browser/OS parity, full accessibility, PWA update/rollback, desktop
packaging, or clean-room candidate parity.
