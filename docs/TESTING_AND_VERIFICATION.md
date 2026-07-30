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
| Repository control tests | `node --test tests/reengineering/*.test.mjs` | evidence tooling, registries, Phase 0 control plane, Phase 1 evidence validator and negative safety fixtures | Windows 10; Node 24.13.0 | 19 | 19 pass | [Phase 1 command and manifest](../reengineering/evidence/phase-1/LW-P1-001/README.md) |

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

**UNKNOWN:** the Phase 1 result does not establish real provider behavior,
message send/stream/cancel/retry, persisted-record values or migrations,
cross-browser/OS parity, full accessibility, PWA update/rollback, desktop
packaging, or clean-room candidate parity.
