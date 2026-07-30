# Handoff — `LW-P4-CHAR-001`

**From:** Codex root controller
**To:** Maintainer / next available characterization owner
**Date:** `2026-07-30T22:08:00Z`
**Current commit:** `6151404511facb3916541512da78f74f3a2e6ec6`
**Branch:** `reengineering/p4-chat-vertical-slice-preflight`

## State in one paragraph

The exact locked Phase 4 primary-Chat characterization packet has executed all
39 mandatory atomic subcases against the immutable baseline with one run-owned
persistent Chromium profile per case, one worker, zero retries, exact in-browser
provider interception, and denied external egress. The honest result is
`20 PASS`, `16 UNKNOWN`, `3 FAIL`, and `0 CONDITIONAL`, so the strict GREEN
validator rejects the bundle and `LW-P4-001` remains blocked.

## Completed

- Added the frozen 16-group/39-subcase fixture contract.
- Added visible-UI onboarding, provider, Chat, Signal Report, responsive,
  accessibility, degraded-operation, and denied-egress observations.
- Added strict active-scope and promoted-evidence validators with positive and
  negative tests.
- Added a run-owned persistent-profile runner that promotes only redacted
  structural receipts and deletes raw profiles/staging after process-closure,
  containment, ownership, and reparse checks.
- Updated compatibility, parity, migration, blocker, roadmap, project-state,
  claim, and checkpoint surfaces without changing runtime behavior.

## Verified

- **MEASURED:** Playwright executed `39/39` in approximately four minutes with
  one worker and zero retries.
- **MEASURED:** result counts are `20 PASS`, `16 UNKNOWN`, `3 FAIL`.
- **MEASURED:** repository controls pass `125/125` with zero fail, skip, or todo.
- **VERIFIED:** the strict GREEN validator returns invalid for the BLOCKED
  bundle.
- **VERIFIED:** the immutable baseline worktree remains clean at
  `e7585999fc1af2707f410ae87356cf2b52e08d9c`.
- **VERIFIED:** raw run/profile roots are deleted; the promoted manifest hashes
  146 redacted artifacts and the content scan reports zero findings.
- **VERIFIED:** independent read-only source QA passed after operation,
  cleanup, and independent-review proof mechanics were hardened. The review
  receipt remains BLOCKED because it is not a separate clean-worktree full
  browser reproduction.
- **OBSERVED:** selecting OpenAI through visible onboarding dispatches
  `https://api.groq.com/openai/v1/chat/completions`; the request is blocked
  before transmission and the locked OpenAI target is never exercised.
- **OBSERVED:** primary Chat exposes no visible cancel or abort control.

## Not verified

- Timed incremental wire fragmentation without a provider listener.
- Cancel-before-dispatch, cancel-after-delta, late-delta rejection, or
  cancellation persistence.
- Several duplicate/reload/race semantics.
- A complete primary-Chat live-region/accessibility contract.
- Real-provider compatibility, credential validity, billing, or provider-side
  cancellation.
- Candidate old/new parity, implementation, activation, or cutover.

## Changed files

- `tests/characterization/fixtures/phase4-chat-contract.json`
- `tests/characterization/specs/phase4-chat.spec.mjs`
- `tests/characterization/support/phase4-chat.mjs`
- `tools/reengineering/run-phase4-characterization.ps1`
- `tools/reengineering/validate-phase4-characterization.mjs`
- `tools/reengineering/validate-phase4-active-scope.mjs`
- `tests/reengineering/phase4-characterization-validation.test.mjs`
- `tests/reengineering/phase4-active-scope.test.mjs`
- `reengineering/evidence/phase-4/LW-P4-CHAR-001/`
- the exact living-document and checkpoint paths claimed by
  `docs/agents/claims/LW-P4-CHAR-001.md`.

## Important relationships

- The Phase 3 storage/provider packages remain inactive and unregistered.
- The immutable baseline is observed, never edited.
- A route-intercepted fixture proves browser behavior under a mock, not real
  provider compatibility.
- A definitive baseline absence is not silently relabeled PASS under the
  current lock.
- Characterization completion does not grant implementation authority.

## Known risks

- The current preflight's all-PASS rule and no-listener boundary make GREEN
  impossible for timed fragmentation and cancellation behavior absent from the
  baseline.
- Treating the OpenAI-to-Groq dispatch as a harness defect would hide a real
  visible-flow baseline failure.
- Broadening the packet without an explicit amendment would invalidate the
  evidence and authority boundary.

## Do not do next

- Do not edit the baseline to make the tests pass.
- Do not start a provider listener or contact a real provider under this claim.
- Do not relabel UNKNOWN/FAIL observations as PASS.
- Do not import Phase 3 packages into `apps/web`, activate a route, migrate
  data, or begin `LW-P4-001`.
- Do not request repeated CodeRabbit reviews.

## Read first

1. `reengineering/PHASE4_PREFLIGHT.md`
2. `reengineering/evidence/phase-4/LW-P4-CHAR-001/summary.json`
3. `reengineering/BLOCKERBOARD.md`
4. `docs/COMPATIBILITY.md`

## Next exact action

Record maintainer disposition for a separately claimed Phase 4 characterization
amendment that explicitly handles definitive baseline absences, the
OpenAI-to-Groq wrong-target defect, and any observation requiring a capability
forbidden by the current packet.

## Success condition

A new scope-validated packet is independently reviewed and explicitly accepted
without granting runtime implementation, real-data, credential, real-provider,
listener, activation, or cutover authority.

## Resume command

```powershell
python tools/context_checkpoint.py --repo-root . resume --track "LW_P4_CHARACTERIZATION WORK"
```
