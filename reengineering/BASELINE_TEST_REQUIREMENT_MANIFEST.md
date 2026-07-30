# Baseline Test and Requirement Manifest

**Status:** PHASE 0 FROZEN — FAILURE DISPOSITION CONTINUES
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`

| Suite | File | Baseline command | Observed result | Exit | Requirement |
|---|---|---|---|---:|---|
| Current smoke | `tests/smoke.js` | `node tests/smoke.js` | `3106 passed`, `107 failed` | 1 | Preserve every discovered check and classify failures; do not weaken or silently remove |
| Smoke history | `tests/smoke-history.js` | `node tests/smoke-history.js` | Parse-time `SyntaxError: Unexpected end of input` at line 99; no assertions executed | 1 | Preserve the malformed baseline file and receipt; characterize intended historical checks separately |

Receipts:

- Current smoke: `reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json`
- Smoke history: `reengineering/evidence/phase-0/LW-P0-002-smoke-history/manifest.json`

The current smoke discovers 3,213 checks at runtime: 3,106 pass and 107 fail.
No skipped/quarantined count is emitted by the harness. No check has been removed
or weakened by LATTICEWORK.

## Change accounting

Future gates must report separately:

- Baseline tests discovered.
- Baseline tests executed, passed, failed, skipped, quarantined, removed, or weakened.
- New tests added.
- Runtime errors not caught by tests.
- Characterization coverage versus source-string assertions.

No reduced gate may be described as green.
