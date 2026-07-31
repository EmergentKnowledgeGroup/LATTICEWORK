# Work Claim — `LW-P5-MEM-IMPL-PREFLIGHT-001`

**Status:** Claimed
**Owner:** Codex `/root/p5_memory_impl_preflight`
**Coordinator:** Codex root controller
**Base commit:** `ac45408307e91ee8d850c24753ce6b4d6e903f12`
**Branch:** `reengineering/p5-lattice-memory`

## Objective

Freeze a machine-validated, package-only corrected-candidate implementation
packet for the synthetic `pulse-medium` dataset. No candidate runtime source or
candidate storage is created by this work unit.

## In scope

- The exact implementation packet, its validator, negative controls, and this
  narrow claim.
- A future synthetic-only `pulse-medium` descriptor at schema `1`, database
  `latticework::pulse-medium`, store `pulses`.
- Preservation of all 53 characterization matches and explicit correction of
  all 16 accepted divergence candidates.
- The smallest Phase 5 active-scope transition needed for these four paths.

## Out of scope

- Candidate runtime source, any browser/global/route/UI integration, or a
  default entry.
- Real records, credentials, provider traffic, migration, import/export,
  legacy mutation, listener, worker, peer/LAN/proxy/Telegram work, activation,
  deployment, or cutover.
- Living state, checkpoints, handoffs, and evidence artifacts.

## Compatibility surfaces

- The characterized `LatticeMemory` pulse-medium public behavior, including
  timestamp, copy/isolation, filtering, Quiet Room, diagnostics, queue,
  retention, reload, and failure semantics.
- ADR-0004 dataset ownership and separate candidate namespace policy.

## Intended invariant

Only an independently GREEN packet may authorize a future, package-only,
synthetic and disposable candidate. It preserves the 53 observed matches and
corrects every one of the 16 explicitly listed legacy divergences without
touching legacy state or runtime wiring.

## Expected files

- `reengineering/PHASE5_LATTICE_MEMORY_IMPLEMENTATION_PACKET.md`
- `tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs`
- `tests/reengineering/phase5-lattice-memory-implementation-scope.test.mjs`
- `docs/agents/claims/LW-P5-MEM-IMPL-PREFLIGHT-001.md`
- Minimal Phase 5 active-scope validator/control updates for those exact paths.

## Stop condition

Stop and request a maintainer decision if this packet requires candidate source,
real data, a legacy mutation, runtime wiring, or a broader active-scope path.
