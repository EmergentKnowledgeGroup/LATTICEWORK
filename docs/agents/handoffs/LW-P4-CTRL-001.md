# Handoff — `LW-P4-CTRL-001`

**From:** Codex root controller
**To:** `LW-P4-CHAR-001` controller
**Date:** `2026-07-30T21:15:43Z`
**Current commit:** `e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd` plus verified control working tree
**Branch:** `reengineering/p4-chat-vertical-slice-preflight`

## State in one paragraph

The cross-phase scope defect is repaired without widening a Phase 3 allowlist.
Historical validators inspect the exact closed Phase 3 history, including
add-then-delete paths. The separate active Phase 4 validator inspects committed,
staged, unstaged, untracked, and force-added ignored paths and currently
authorizes only the completed control and preflight claims.

## Completed

- Added shared NUL-safe Git path collection.
- Pinned Phase 3 historical validators to the accepted terminal commit.
- Added a current-claim-specific Phase 4 active-scope validator.
- Added positive, ancestry, anti-bypass, staged/unstaged/untracked,
  add-then-delete, and force-added staging controls.

## Verified

- Focused scope suite: 48 of 48 PASS.
- Full repository controls: 116 of 116 PASS, zero fail/skip/todo.
- Independent post-repair guardrail review: GREEN.

## Not verified

- Phase 4 characterization behavior or evidence.
- Any implementation, integration, activation, migration, or cutover.

## Changed files

- `tools/reengineering/git-scope-common.mjs`
- `tools/reengineering/validate-phase3-decision-packet.mjs`
- `tools/reengineering/validate-phase3-preflight.mjs`
- `tools/reengineering/validate-phase4-active-scope.mjs`
- `tests/reengineering/phase3-decision-packet.test.mjs`
- `tests/reengineering/phase3-preflight.test.mjs`
- `tests/reengineering/phase4-active-scope.test.mjs`
- Control ledgers, claim, handoff, and checkpoints.

## Important relationships

- Historical Phase 3 proof is base-to-terminal, not base-to-current-HEAD.
- Active authority is work-claim-specific; a future path is not authorized
  merely because a planning packet names it.

## Known risks

- `LW-P4-CHAR-001` must deliberately transition the active validator and its
  tests to the exact characterization claim paths before adding them.

## Do not do next

- Do not widen a Phase 3 allowlist.
- Do not add a phase-wide Phase 4 prefix.
- Do not authorize `runtime/tmp/**`; ignored scratch is not promotable proof.

## Read first

1. `reengineering/PHASE4_PREFLIGHT.md`
2. `tools/reengineering/validate-phase4-active-scope.mjs`

## Next exact action

Claim `LW-P4-CHAR-001`, then test-first transition the active allowlist from
CTRL/PREFLIGHT ownership to the exact characterization paths frozen in the
locked preflight.

## Success condition

The characterization claim is the only newly authorized path set, and all
prior historical and active negative controls remain green.

## Resume command

```powershell
node tools/reengineering/validate-phase4-active-scope.mjs
```
