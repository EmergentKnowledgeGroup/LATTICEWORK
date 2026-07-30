# Work Claim — `LW-P4-CTRL-001`

**Status:** Completed — GREEN
**Owner:** Codex root controller
**Base commit:** `e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd`
**Branch:** `reengineering/p4-chat-vertical-slice-preflight`
**Claim time:** `2026-07-30T20:49:38Z`

## Objective

Repair the cross-phase scope-control defect without widening any historical
Phase 3 allowlist: pin each historical Phase 3 validator to a closed
base-to-terminal range and add a dedicated fail-closed active Phase 4 scope
validator for current tracked and untracked state.

## Intended invariant

Historical Phase 3 validation judges only files that entered during the frozen
Phase 3 range. Legitimate later-phase descendants cannot make historical proof
red. Current Phase 4 work remains independently protected against unauthorized
tracked and untracked paths.

## In scope

- Pin the Phase 3 terminal commit to
  `e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd`.
- Verify Phase 3 base is ancestor of terminal and terminal is ancestor of
  current `HEAD`.
- Diff exact Phase 3 base-to-terminal ranges without current untracked files.
- Preserve semantic packet/ADR/blocker/safety controls and exact allowlists.
- Add a Phase 4 active-scope validator rooted at the terminal commit.
- Add positive, negative, ancestry, and CLI anti-bypass regression tests.

## Out of scope

- Adding Phase 4 paths to a Phase 3 allowlist.
- Disabling or reducing any semantic or scope check.
- Changing frozen Phase 3 evidence, application/runtime code, packages,
  provider/storage behavior, routes, listeners, activation, or cutover.
- Authorizing Phase 4 characterization or implementation.

## Owned paths

- `docs/agents/claims/LW-P4-CTRL-001.md`
- `tools/reengineering/validate-phase3-decision-packet.mjs`
- `tools/reengineering/validate-phase3-preflight.mjs`
- `tools/reengineering/git-scope-common.mjs`
- `tools/reengineering/validate-phase4-active-scope.mjs`
- `tests/reengineering/phase3-decision-packet.test.mjs`
- `tests/reengineering/phase3-preflight.test.mjs`
- `tests/reengineering/phase4-active-scope.test.mjs`
- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `docs/agents/handoffs/LW-P4-CTRL-001.md`
- `reengineering/evidence/phase-4/LW-P4-CTRL-001/**`
- the two checkpoint surfaces.

## Acceptance

- Canonical Phase 3 validators pass on a legitimate later Phase 4 descendant.
- An unauthorized path inside a synthetic closed historical range fails.
- A wrong or non-ancestor terminal fails.
- Canonical CLI callers cannot override base, terminal, or scope checking.
- Current unauthorized Phase 4 tracked or untracked paths fail the active
  Phase 4 validator.
- Full repository controls return green with no skip/todo reduction.
- Independent read-only QA finds no weakening or unguarded range.

## Backout

Revert this claim's validator/test/control-state changes. Do not alter Phase 3
evidence or expand allowlists as a fallback.
