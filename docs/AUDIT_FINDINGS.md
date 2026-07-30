<!-- Status: LIVING | Owner: Audit lead | Verified findings only -->

# Audit Findings

## Status

No finding is canonical until it has a pinned baseline, reproducible procedure, raw artifact, impact analysis, and review.

## Finding template

### `[FINDING_ID]` — `[TITLE]`

**Status:** `CANDIDATE | REPRODUCED | VERIFIED | DISPUTED | WITHDRAWN`
**Severity:** `INFO | LOW | MEDIUM | HIGH | CRITICAL`
**Evidence type:** `OBSERVED | MEASURED | INFERRED`
**Baseline commit:** `[SHA]`
**Reviewer:** `[NAME_OR_WORKFLOW]`

**Claim**

`[ONE_PRECISE_CLAIM]`

**Evidence**

- Source: `[LINK]`
- Command: `[COMMAND]`
- Raw output: `[LINK]`
- Runtime reproduction: `[LINK]`

**Impact**

`[USER_OR_ENGINEERING_IMPACT]`

**Alternative explanations tested**

- `[EXPLANATION_AND_RESULT]`

**Limitations**

- `[LIMIT]`

**LATTICEWORK response**

`[FIX_OR_ARCHITECTURAL_RESPONSE]`

**Verification**

`[TEST_OR_REVIEW]`

---

## Candidate areas requiring verification

The following are investigation targets, not published conclusions:

- Large single-file change surfaces.
- Exact and structural duplication.
- Test failures or test-claim mismatch.
- Implicit global state and coupling.
- Documentation discoverability.
- Stored-data versioning and migration.
- Service-worker cache consistency.
- Provider and network boundaries.
- Security and privacy claim verification.
- Agent handoff dependence on chronological logs.

Do not attach exact numbers until the methodology reproduces them.

## Reproduced Phase 0 observations

These are scoped engineering observations, not public comparative claims.

- **MEASURED:** the pinned baseline contains 302,560 first-party source lines,
  including nine exact duplicate source groups with 75,123 redundant lines under
  the documented classifier. Receipt:
  [`LW-P0-001/baseline-summary.json`](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json).
- **MEASURED:** `node tests/smoke.js` discovered 3,213 checks, passed 3,106,
  failed 107, and exited 1. Receipt:
  [`LW-P0-002-smoke/manifest.json`](../reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json).
- **MEASURED:** one primed Chrome offline reload navigated to the browser error
  page with `ERR_INTERNET_DISCONNECTED`; this does not establish all offline
  modes. Receipt:
  [`LW-P0-003-browser/README.md`](../reengineering/evidence/phase-0/LW-P0-003-browser/README.md).
- **OBSERVED:** first load created localStorage and IndexedDB state before
  onboarding completion and attempted local/external discovery requests. Names
  and request boundaries are stored in the browser receipt without values,
  credentials, or personal records.

## Reproduced Phase 1 observations

These executable observations remain scoped to Playwright 1.62.0 bundled
Chromium 151 on Windows 10 against baseline
`e7585999fc1af2707f410ae87356cf2b52e08d9c`.

- **MEASURED:** seven bounded characterization scenarios passed with no skips,
  unexpected results, or flakes. Receipt:
  [`LW-P1-001/summary.json`](../reengineering/evidence/phase-1/LW-P1-001/summary.json).
- **OBSERVED:** a fresh HTTP first run initialized 11 localStorage keys, 16
  IndexedDB databases with named stores, one active service worker, and cache
  `freelattice-v5.79.22` containing 174 entries. Values and user records were
  not captured. Receipt:
  [`runtime-snapshot.json`](../reengineering/evidence/phase-1/LW-P1-001/artifacts/shell-and-storage/runtime-snapshot.json).
- **OBSERVED:** at 390 × 844 the `✦ Presence` role button overlaps the Garden
  title by 3,511.0625 square CSS pixels. Receipt:
  [`mobile-overlap.json`](../reengineering/evidence/phase-1/LW-P1-001/artifacts/mobile/mobile-overlap.json).
- **OBSERVED:** after a warm online load with an active worker/cache, a forced
  offline reload fails with `ERR_INTERNET_DISCONNECTED` and leaves an empty
  document title. Receipt:
  [`offline-reload-observation.json`](../reengineering/evidence/phase-1/LW-P1-001/artifacts/offline/offline-reload-observation.json).
- **MEASURED:** six bounded browser flows recorded 96 blocked out-of-origin
  HTTP requests, one blocked external WebSocket attempt, eight blocked
  realtime-channel attempts, zero allowed external network requests, and no
  synthetic private-sentinel leak. Receipt:
  [`LW-P1-001/summary.json`](../reengineering/evidence/phase-1/LW-P1-001/summary.json).
- **VERIFIED:** an independent QA run on loopback port 4175 reproduced 19 of 19
  repository-control tests and 7 of 7 browser scenarios, revalidated the clean
  pinned baseline and safety invariants, and accepted only the bounded
  `LW-P1-001` work unit. Receipt:
  [`independent-review/`](../reengineering/evidence/phase-1/LW-P1-001/independent-review/README.md).

## Reproduced Phase 2 observations

These observations apply only to the feature-free candidate at
`c8a040fb38f627bf4d0353b3497645653a57139c`.

- **MEASURED:** strict typecheck, 5 of 5 kernel tests, 37 of 37 repository
  controls, and 6 of 6 browser scenarios passed; no browser test was skipped,
  unexpected, or flaky.
- **MEASURED:** an isolated package-lock replay was byte-identical, two clean
  builds emitted the same four declared artifacts and hashes, npm audit
  reported zero vulnerabilities, and the supply-chain/SBOM receipt was valid.
- **OBSERVED:** the tested candidate opened no out-of-origin request or
  realtime channel and created no localStorage, sessionStorage, IndexedDB,
  Cache Storage, or service worker state.
- **VERIFIED:** independent QA repeated the full gate from a separate
  evidence directory on port 4177 and accepted only the bounded Phase 2 work
  unit. Evidence:
  [`LW-P2-001`](../reengineering/evidence/phase-2/LW-P2-001/README.md).

These observations do not support a feature-parity, replacement, production,
or release-readiness conclusion.
