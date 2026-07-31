# Work Claim — `LW-P5-MEM-CHAR-001`

**Status:** Claimed
**Owner:** Codex root controller
**Coordinator:** Codex root controller
**Base commit:** `e34aa4304c51a7a870ab5a4fa1f45a4216cb8d38`
**Branch:** `reengineering/p5-lattice-memory`
**Claim time:** `2026-07-31T06:15:35Z`

## Objective

Execute and promote a content-free Chrome characterization of all 69 exact
legacy LatticeMemory observations frozen by the accepted preflight packet.

## In scope

- Exact additive characterization harness, fixture, validator, runner, evidence,
  claim/handoff, living docs, checkpoints, and Phase 5 active-scope transition
  listed in the accepted packet.

## Out of scope

- Legacy or candidate runtime edits.
- Real data, credentials, provider traffic, external egress, activation,
  deployment, cutover, and any other Phase 5 feature.

## Locked constraints

- Immutable baseline module hash must match before it is served.
- Exact `127.0.0.1` OS-selected listener; one Chrome worker; zero retries.
- Fresh repository-local synthetic profile for every scenario group.
- All external HTTP, WebSocket, realtime, and beacon traffic denied.
- Every atom produces its own status and content-free receipt.
- Expected defects pass only when the exact frozen legacy behavior is observed.
- Any `FAIL`, `UNKNOWN`, or `SKIP` atom stops implementation.

## Compatibility surfaces

- `window.LatticeMemory` exact public API.
- IndexedDB `LatticeMemory` v1 / `pulses` schema, queue, retention, reload, and
  failure behavior.
- Quiet Room exclusion, loader registration, subscriber/filter semantics, and
  storage/network isolation.

## Files expected to change

- Exact `characterization_owned_exact_paths` and
  `characterization_owned_prefixes` in
  `reengineering/PHASE5_LATTICE_MEMORY_PREFLIGHT.md`.

## Files not to change

- Every `protected_exact_paths` and `protected_prefixes` entry in the packet,
  especially `docs/modules/lattice-memory.js`, application code, packages,
  manifests, deployment, and Phase 0–4 evidence.

## Acceptance criteria

- All 69 atomic observations PASS with correct divergence dispositions.
- Content-free evidence, manifest, storage/network isolation, cleanup, and
  immutable-source gates are valid.
- Full repository controls and independent clean-worktree reproduction are
  GREEN.

## Required tests

- `powershell -File tools/reengineering/run-phase5-lattice-memory-characterization.ps1`
- `node tools/reengineering/validate-phase5-lattice-memory-characterization.mjs`
- `node --test tests/reengineering/*.test.mjs`
- `git diff --check`

## Required documentation updates

- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `docs/agents/handoffs/LW-P5-MEM-CHAR-001.md`
- Both checkpoint planes.

## Risks

- Asynchronous retention and failure specimens can hang without strict bounded
  observation windows.
- Synthetic private sentinels can leak through legacy warning behavior and
  must never be promoted.

## Escalation trigger

Stop and request decision when:

- immutable source drifts, external transmission occurs, a profile survives,
  evidence contains a sentinel, or any required atom is not PASS.
