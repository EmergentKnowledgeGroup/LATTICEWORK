# Work Claim — `LW-P4-IMPL-PREFLIGHT-001`

**Status:** Claimed
**Owner:** Codex root controller
**Base commit:** `8d59d4e1dc2c3f1de0b923db68917118062ed458`
**Branch:** `reengineering/p4-characterization-retests`
**Claim time:** `2026-07-31T03:28:00Z`

## Objective

Correct the exact Phase 4 implementation packet, machine-lock its ownership,
protected boundaries, authority flags, listener contract, and verification
commands, then obtain independent GREEN review before starting `LW-P4-001`.

## In scope

- `reengineering/PHASE4_IMPLEMENTATION_PACKET.md`.
- One fail-closed implementation-range validator and its negative tests.
- This claim, the matching handoff, living documents, and checkpoint updates.
- Recording the maintainer's standing acceptance only after the corrected
  packet is independently GREEN.

## Out of scope

- Any application, package, feature, route, or product implementation.
- Real data, credentials, provider traffic, source readers, migration,
  activation, deployment, cutover, or application listener.
- Any default or protected legacy/Phase 3 file.

## Intended invariant

The accepted implementation packet is exact and non-expandable by command-line
override. Every changed implementation path must be explicitly owned, every
protected path must remain byte-identical to the pinned base, and only one
run-owned exact-loopback synthetic test fixture may listen.

## Acceptance

- Packet validator reports valid against the exact pinned base.
- Negative tests independently reject ownership drift, protected-path drift,
  authority drift, unsafe listeners, runtime network/credential/migration
  primitives, and CLI scope/base overrides.
- Full repository controls and diff hygiene are GREEN.
- Independent QA returns GREEN before `LW-BLK-010` closes.

## Stop conditions

Stop for any need to change application/package behavior, weaken a protected
boundary, use real data/credentials/provider traffic, start an application
listener, or enable activation/deployment/cutover.
