# Work Claim — `LW-P4-CHAR-001`

**Status:** Completed — aggregate BLOCKED
**Owner:** Codex root controller
**Base commit:** `ae74e970d2cb0c461236f79fb7c56c96d3a5016b`
**Branch:** `reengineering/p4-chat-vertical-slice-preflight`
**Claim time:** `2026-07-30T21:24:36Z`

## Objective

Execute the locked Phase 4 characterization packet against the immutable
FreeLattice baseline and produce truthful, synthetic-only evidence for all 39
mandatory atomic primary-Chat subcases.

## Intended invariant

This work observes baseline behavior without changing it. Every atomic subcase
uses a fresh disposable synthetic profile, mocked provider responses are
intercepted before transmission, external egress is denied, and no
characterization result grants candidate implementation authority.

## In scope

- The exact fixture, spec, support, runner, validator, control, evidence,
  living-document, handoff, and checkpoint paths frozen in
  `reengineering/PHASE4_PREFLIGHT.md`.
- `P4-PRV-OLLAMA` and `P4-PRV-OPENAI` protocol fixtures for the primary Chat
  caller path only.
- The existing harness-owned Python static server on one recorded
  `127.0.0.1` port.
- Fresh synthetic profiles, ignored raw staging, content-free receipts, and
  independently reproducible promoted evidence.

## Out of scope

- Any legacy or candidate application/runtime edit.
- Any import from `apps/web` or
  `packages/{contracts,kernel,storage,providers}`.
- Shared Playwright config, package manifests, existing characterization
  fixtures/specs/support, service workers, routes, deployment, activation,
  migration, cleanup, cutover, or release claims.
- Real browser profiles, user data, credentials, provider traffic, billable
  requests, listeners beyond the static harness, proxies, LAN/worker/peer, or
  Telegram behavior.

## Owned paths

- `tests/characterization/fixtures/phase4-chat-contract.json`
- `tests/characterization/specs/phase4-chat.spec.mjs`
- `tests/characterization/support/phase4-chat.mjs`
- `tools/reengineering/run-phase4-characterization.ps1`
- `tools/reengineering/validate-phase4-characterization.mjs`
- `tools/reengineering/validate-phase4-active-scope.mjs`
- `tests/reengineering/phase4-characterization-validation.test.mjs`
- `tests/reengineering/phase4-active-scope.test.mjs`
- `reengineering/evidence/phase-4/LW-P4-CHAR-001/**`
- `docs/agents/claims/LW-P4-CHAR-001.md`
- `docs/agents/handoffs/LW-P4-CHAR-001.md`
- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `docs/COMPATIBILITY.md`
- `reengineering/PARITY_MATRIX.md`
- `reengineering/MIGRATION_LEDGER.md`
- `PROJECT_STATE.md`
- `ROADMAP.md`
- both checkpoint surfaces.

## Acceptance

- All 39 mandatory subcases execute with one fresh profile each.
- Every expected fixture request is observed and no real provider request is
  transmitted.
- Promoted evidence contains no credential, prompt, response, draft, raw
  provider body, real-looking user data, or host clipboard content.
- All 14 locked gates pass, including full controls, manifest validation,
  cleanup proof, and independent clean-worktree reproduction.
- Aggregate GREEN requires 39 PASS and zero CONDITIONAL, UNKNOWN, FAIL, skip,
  todo, or expected-failure results.

## Outcome

- **MEASURED:** all 39 atomic subcases executed once with one worker, zero
  retries, and one run-owned persistent Chromium profile per subcase.
- **MEASURED:** the result is `20 PASS`, `16 UNKNOWN`, `3 FAIL`, and
  `0 CONDITIONAL`; aggregate status is `BLOCKED`.
- **OBSERVED:** the primary Chat exposes no visible cancellation control.
- **OBSERVED:** the visible OpenAI onboarding choice dispatches the Groq Chat
  Completions target instead of the locked OpenAI target; all such requests
  were blocked before transmission.
- **VERIFIED:** strict GREEN validation rejects the bundle, all 125 repository
  controls pass, the immutable baseline remains clean, raw profiles/staging are
  deleted, and no real data, credential, or provider traffic was used.
- **VERIFIED:** independent read-only source QA passed after three
  evidence-integrity defects were repaired; this blocked packet does not claim
  a separate clean-worktree full browser reproduction.
- `LW-BLK-009` and `LW-BLK-010` remain open. This completed characterization
  work unit grants no implementation authority.

## Stop conditions

Stop without implementation if the baseline lacks a required behavior, a
result is UNKNOWN/conditional/failing, evidence cleanup cannot be proven, or
any forbidden path, dependency, data, credential, transport, listener, or
product-policy choice is required.

## Backout

Remove only additive harness code and unaccepted run-owned staging. Retain any
accepted evidence with a superseding invalidation receipt. Do not modify the
immutable baseline, legacy runtime/data, candidate application, packages, or
deployment paths.
