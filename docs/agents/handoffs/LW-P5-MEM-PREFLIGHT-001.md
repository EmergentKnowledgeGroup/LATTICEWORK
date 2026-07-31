# Handoff — `LW-P5-MEM-PREFLIGHT-001`

**From:** Codex root controller
**To:** `LW-P5-MEM-CHAR-001` controller
**Date:** `2026-07-31T06:12:52Z`
**Verified candidate commit:** `3ba1f10af6b8c5a0efe529d198517f8f519da6f8`
**Branch:** `reengineering/p5-lattice-memory`

## State in one paragraph

The LatticeMemory characterization packet is locked, accepted, and
independently GREEN. It authorizes only a synthetic, content-free browser
characterization of the immutable legacy pulse-medium module. It does not
authorize candidate implementation, real data, credentials, provider traffic,
activation, deployment, or cutover.

## Completed

- Froze the exact legacy module hash, public API, IndexedDB schema, bounds,
  profile rules, denied-network policy, and cleanup contract.
- Froze 13 reporting groups containing 69 exact atomic observations.
- Named observed privacy, integrity, readiness, timestamp, filtering, and
  loader defects as characterization expectations rather than desired design.
- Froze exact characterization-owned and protected paths.

## Verified

- Focused packet and scope controls: 35/35 PASS.
- Full repository controls: 223/223 PASS with zero skip.
- Both canonical validators: `valid: true`.
- Independent final source-to-contract review: GREEN.

## Not verified

- Any of the 69 browser observations against Chrome.
- Candidate LatticeMemory behavior or corrected divergence behavior.
- Real user data, migration, activation, deployment, or cutover.

## Changed files

- `reengineering/PHASE5_LATTICE_MEMORY_PREFLIGHT.md`
- `tools/reengineering/validate-phase5-lattice-memory-preflight.mjs`
- `tests/reengineering/phase5-lattice-memory-preflight.test.mjs`
- Phase 5 active-scope control, claim, evidence, living docs, and checkpoints.

## Important relationships

- An expected legacy defect passes characterization only when the exact defect
  is observed and labeled as an accepted divergence candidate.
- Any `FAIL`, `UNKNOWN`, or `SKIP` atom stops later implementation.
- Promoted evidence must contain no pulse content, private sentinel, browser
  profile, credential, or raw IndexedDB value.

## Known risks

- The 10,000-record bound is asynchronous and may expose a race under burst
  writes.
- Blocked IndexedDB open and malformed filters deliberately require bounded
  unresolved/error observations rather than fabricated success.

## Do not do next

- Do not edit the immutable legacy module.
- Do not use real profiles, data, credentials, providers, or external network.
- Do not implement corrected candidate behavior before characterization is
  independently GREEN.

## Read first

1. `reengineering/PHASE5_LATTICE_MEMORY_PREFLIGHT.md`
2. `docs/agents/claims/LW-P5-MEM-PREFLIGHT-001.md`
3. `reengineering/evidence/phase-5/LW-P5-MEM-PREFLIGHT-001/summary.json`

## Next exact action

Create `LW-P5-MEM-CHAR-001`, transition the exact Phase 5 active allowlist, and
implement only the additive characterization paths in the machine lock.

## Success condition

All 69 atoms are observed in Chrome with denied external egress, isolated
synthetic profiles, content-free evidence, complete cleanup, and independent
reproduction, or the workstream stops on an explicit evidence-backed blocker.

## Resume command

```powershell
Get-Content -Raw reengineering/PHASE5_LATTICE_MEMORY_PREFLIGHT.md
```
