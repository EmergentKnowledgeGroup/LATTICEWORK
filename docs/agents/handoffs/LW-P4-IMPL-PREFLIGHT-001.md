# Handoff — `LW-P4-IMPL-PREFLIGHT-001`

## Status

`COMPLETED — ACCEPTED AND INDEPENDENTLY GREEN`

## Intended invariant

The Phase 4 implementation range is pinned to
`faf32dbaf8159e8499421fa68d9fba4bede0fdc9`. Only exact owned paths may
change; protected Phase 3, legacy, default-web, server, worker, deployment,
service-worker, and characterization paths remain immutable. The application
cannot listen. One exact-loopback, port-zero, synthetic, run-owned test fixture
may listen and must close.

## Acceptance

The maintainer's standing receipt is:

`Continue and consider anything you write as accepted.`

It applies only to the exact machine lock in
`reengineering/PHASE4_IMPLEMENTATION_PACKET.md`. All real-data, credential,
real-provider, application-listener, activation, deployment, and cutover flags
remain false.

## Verification

- **VERIFIED:** amended characterization is canonical and independently GREEN.
- **MEASURED:** amendment validator reports valid.
- **MEASURED:** implementation-range validator reports valid, scope checked,
  pinned base exact, application listener false, and test listener true.
- **MEASURED:** focused amendment and implementation-scope controls pass 41/41
  with zero fail/skip/todo.
- **MEASURED:** full repository controls pass 180/180 with zero
  fail/skip/todo.
- **VERIFIED:** independent first review returned REWORK for claim-base drift,
  incomplete authority negatives, and missing listener-close enforcement.
- **VERIFIED:** the one permitted rework fixed all three findings; independent
  re-review returned GREEN after reproducing both validators and 41/41 focused
  tests.
- **VERIFIED:** CLI base/scope overrides fail closed; protected paths win over
  ownership; every forbidden authority has an isolated mutation test.

## Effect

`LW-BLK-010` is closed. `LW-P4-001` may begin only after its own claim and
phase-start checkpoint. This does not authorize activation, deployment,
cutover, real data, credentials, or real provider traffic.

## Next command

Create `docs/agents/claims/LW-P4-001.md`, checkpoint `LW_P4_IMPLEMENTATION
WORK`, then implement only the accepted non-default synthetic/mock slice.
