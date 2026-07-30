# Phase 3 implementation preflight — `LW-P3-001`

**Status:** READY PENDING MAINTAINER ACCEPTANCE
**Date:** 2026-07-30
**Base:** `6fa553ee3f5c7d1952f7aed836873467c4626068`
**Decision gate:** ADR-004 and ADR-005 must be explicitly accepted

## Authority

This preflight is implementation-ready but does not itself authorize code.
ADR-006 may freeze a future proxy contract, but Phase 3 starts no listener.

- implementation authorized: false
- real user data: forbidden
- real provider traffic: forbidden
- real credentials: forbidden
- listener: forbidden
- cutover: forbidden
- legacy mutation: forbidden

## Intended invariant

The bounded Phase 3 candidate may exercise only synthetic conversation storage
and deterministic in-process provider mocks. Legacy data and runtime remain
authoritative and untouched; no real credential, provider endpoint, listener,
route, feature, or cutover is used.

## Exact implementation surface after acceptance

The only new runtime packages are:

- `@latticework/storage` at `packages/storage`, dependent only on
  `@latticework/contracts`
- `@latticework/providers` at `packages/providers`, dependent only on
  `@latticework/contracts`

Public contracts are added only in:

- `packages/contracts/src/storage.ts`
- `packages/contracts/src/provider.ts`
- `packages/contracts/src/index.ts`

Synthetic/browser verification lives under `tests/phase3/`. Phase 3 may make
the exact manifest, verification-tool, evidence, living-document, claim,
handoff, and checkpoint edits enumerated in the JSON packet. It may not change
`apps/web/`, a legacy runtime path, a default route, or a deployment surface.

## Storage slice

- stable dataset ID: `conversation`
- dataset schema version: `1`
- synthetic source: `FreeLatticeDB` version `3`
- owned legacy stores: `conversations`, `messages`
- characterization-only stores: `meta`, `memoryIndex`
- candidate namespace: `latticework::conversation`
- migration journal: `latticework::migration`
- hostile import staging:
  `latticework::staging::<operation-id>::conversation`
- unknown values: typed projection plus native structured clone
- migration: copy-on-write, batch-checkpointed, resumable, idempotent
- activation: forbidden
- rollback: exact candidate/staging namespace only; immutable terminal journal
  receipt retained; legacy remains untouched

The synthetic fixture must include Unicode, false, zero, null, ordered arrays,
unknown nested fields, dates, blobs, and array buffers. Browser verification
must prove the source remains structured-clone equivalent and that `meta` and
`memoryIndex` are neither copied nor exported.

## Provider slice

- adapters: deterministic local mock and deterministic cloud mock
- transport: in-process scripted; no `fetch`, HTTP server, listener, or real
  endpoint
- one adapter invocation: one attempt
- retry owner: router
- default retry count: `0`
- stable identity: one `operation_id` per logical request
- unique identity: one `attempt_id` per attempt
- retry after first delta: forbidden
- fallback: explicit, visible, and consented
- credentials: synthetic references only; immutable exact egress grant before
  resolution; no secret material
- cancellation: exactly one terminal outcome and an honest
  `transport-aborted` or `provider-cancel-acknowledged` scope
- provenance: content-free for every operation and attempt
- legacy registration: none

## Dependencies

No new runtime dependency is permitted. The slice reuses exact existing pins:

- TypeScript `6.0.3`
- Vite `8.1.5`
- Lit `3.3.3`
- Playwright `1.62.0`
- Node `24.13.0` built-in test runner

Native browser IndexedDB is exercised through Playwright. If a new package
becomes necessary, implementation stops for a separate pinned dependency and
supply-chain decision.

## Verification gates

All of these gates are mandatory:

1. strict typecheck
2. Node unit and contract tests
3. real-browser synthetic IndexedDB migration tests
4. provider no-egress and no-listener controls
5. protected legacy/baseline boundary comparison
6. deterministic candidate build
7. byte-identical lockfile replay
8. audit, license, and SBOM supply-chain receipts
9. the full repository-control suite
10. a hash-verifying evidence manifest
11. independent clean-worktree reproduction
12. diff, JSON, syntax, and whitespace hygiene

Evidence belongs only under
`reengineering/evidence/phase-3/LW-P3-001/` and must pin the base and candidate
commits, environment, exact commands, exit codes, raw outputs, artifact hashes,
sentinel results, and independent review. Mock success is not a real-provider
compatibility claim.

## No-touch fence

The following remain outside the implementation claim:

- root and `docs/` legacy HTML/runtime mirrors
- root and `docs/` legacy modules and service workers
- `server.js`, `server.py`, `desktop/`, `worker/`, and `telegram-worker.js`
- baseline smoke tests, Phase 1 characterization, and `apps/web/`
- `Z:\LATTICEWORK_BASELINE_e7585999` and `Z:\FreeLattice`
- real browser profiles, real stores, real credentials, and provider endpoints

## Rollback

Before activation, remove only the additive Phase 3 package commit and ignored
candidate/evidence output. A failed synthetic migration closes and deletes or
quarantines only its exact candidate or staging namespace, while retaining its
terminal migration journal receipt. The legacy runtime, data, routes,
credentials, and provider selection never change, so they require no rollback.

## Stop conditions

Stop if ADR-004/005 acceptance or an `LW-P3-001` claim is missing; if real data,
credentials, traffic, a listener, a new dependency, a legacy edit, activation,
or cutover becomes necessary; if unknown values cannot be preserved; or if
evidence could contain private content.
