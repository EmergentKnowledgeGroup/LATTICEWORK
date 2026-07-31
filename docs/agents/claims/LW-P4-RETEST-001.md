# Work Claim — `LW-P4-RETEST-001`

**Status:** Claimed
**Owner:** Codex root controller
**Base commit:** `9ae0c54a6b6d76622cb2a89efee5bf909ff6858e`
**Branch:** `reengineering/p4-characterization-retests`
**Claim time:** `2026-07-31T01:59:44Z`

## Objective

Execute the eleven bounded retests frozen by
`reengineering/PHASE4_CHARACTERIZATION_AMENDMENT.md`, produce an amended
characterization receipt without rewriting the original evidence, and decide
whether `LW-BLK-009` can close.

## In scope

- Additive characterization harness, fixture, validator, tests, evidence,
  living docs, handoff, and checkpoint changes required for the eleven retests.
- One run-owned synthetic stream fixture bound exactly to `127.0.0.1` on an
  operating-system-selected port.
- Fresh disposable browser profiles, denied external egress, synthetic content,
  and a synthetic non-secret invalid-configuration sentinel.
- Independent reproduction and honest final dispositions.

## Out of scope

- `apps/**`, `packages/**`, legacy runtime, default route, or product behavior.
- Real data, browser profiles, credentials, provider traffic, activation,
  migration, deployment, or cutover.
- Application listeners, wildcard/LAN binds, proxies, workers, peers, gateways,
  or Telegram.
- Starting `LW-P4-001` before this gate is complete.

## Intended invariant

Every original result remains immutable. Each retested case receives a
separately receipted amended result. A confirmed absence may be documented but
cannot be relabeled as baseline `PASS`; aggregate GREEN permits only original
or new `PASS` and the eight already accepted divergences.

## Exact retest set

- Loopback stream: `P4-CHAT-001A`, `P4-CHAT-003B`, `P4-CHAT-010A`,
  `P4-CHAT-010B`, `P4-RESP-001A`.
- Existing harness: `P4-A11Y-001A`, `P4-A11Y-001B`, `P4-A11Y-001C`,
  `P4-CHAT-008A`, `P4-DEG-001A`, `P4-ONB-001C`.

## Acceptance

- All eleven cases execute with zero retries and complete evidence.
- Test listener ownership, exact bind, OS-selected port, denied egress, and
  teardown are proven.
- Synthetic configuration sentinel does not enter promoted evidence and its
  disposable profile is deleted.
- The amended manifest contains exactly 20 original PASS, eight accepted
  divergences, and eleven new final dispositions.
- Full controls, content scan, scope validation, and independent reproduction
  are GREEN before blocker closure.

## Stop conditions

Stop for any real-data/profile/credential/provider requirement, non-loopback
listener, product/runtime edit, activation/deployment/cutover need, content
leak, cleanup uncertainty, or result that cannot be honestly classified.

