# Work Claim — `LW-P5-MEM-001`

**Status:** Claimed
**Owner:** Codex root controller
**Base commit:** `92f97cf3f2c70764dbfc942f1fa23c8d638f3542`
**Branch:** `reengineering/p5-lattice-memory`

## Objective

Implement and verify the exact package-only, synthetic-only corrected
LatticeMemory candidate authorized by
`PHASE5_LATTICE_MEMORY_IMPLEMENTATION_PACKET.md`.

## Intended invariant

The candidate preserves all 53 compatibility matches, corrects all 16 named
legacy divergences, and writes only generated synthetic pulses to the
disposable `latticework::pulse-medium` namespace. It has no application,
global, route, UI, provider, migration, activation, deployment, or cutover
surface.

## In scope

- Exact packet-owned contracts and `packages/lattice-memory/`.
- Exact `tests/phase5/` unit/native-browser verification.
- Exact evidence validator, verification runner, evidence, living docs,
  handoff, and checkpoints.

## Out of scope

- Every protected path and reserved authority named in the accepted packet.
- Real profiles, records, credentials, provider traffic, migration,
  import/export, application wiring, activation, deployment, and cutover.

## Compatibility surfaces

- Five-key pulse shape, synchronous fan-out, filtering, QuietRoom policy,
  pending queue, retention, reload, heartbeat, fail-quiet persistence, and
  package-only audit inspection.
- All 16 corrected behavior IDs in the accepted packet.

## Verification

- Workspace typecheck and package unit tests.
- Native Chrome IndexedDB/reload/cleanup/denial suite.
- Exact implementation-scope and evidence validators.
- Prior Phase 3/4 gates, full repository controls, lock replay, deterministic
  build, audit, SBOM, hygiene, content scan, and independent clean-worktree
  reproduction.

## Stop condition

Stop on any protected-path change, real data, legacy database access,
credential/provider/network use, app/global/route/UI wiring, incomplete
cleanup, or validator/independent-review failure.
