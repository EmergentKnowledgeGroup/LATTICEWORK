# Work Claim — `LW-P5-CTRL-001`

**Status:** Claimed
**Owner:** Codex `/root`
**Coordinator:** UltariumV3
**Base commit:** `80f5e0bc29ce23296a024849a3464d3e17d25bea`
**Branch:** `reengineering/p5-lattice-memory`
**Claim time:** `2026-07-31T00:00:00-05:00`

## Objective

Close the Phase 4 scope validator at the merged Phase 4 terminal commit and add
a fail-closed active Phase 5 scope validator before any Phase 5 feature work.

## In scope

- Pin Phase 4 historical validation from its accepted base through the merged
  Phase 4 terminal commit.
- Preserve the Phase 4 allowlist without expansion.
- Add a Phase 5 active-scope validator covering committed, staged, unstaged,
  untracked, and force-added ignored paths.
- Add positive and negative regression controls.
- Record evidence, living-document state, checkpoints, and a handoff.

## Out of scope

- Any feature characterization or implementation.
- Legacy runtime mutation.
- Candidate package, route, or UI changes.
- Real user data, credentials, provider traffic, listeners, activation,
  deployment, migration, or cutover.

## Locked constraints

- Phase 4 historical range is
  `e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd..1b7e1d10456e0a1e9aaa91df25db17e236bbea3e`.
- Both range endpoints must be proven ancestors of the current head.
- Add-then-delete paths inside the historical range remain visible.
- Canonical CLIs reject caller attempts to disable or rebase validation.
- Phase 5 begins at the Phase 4 terminal commit and remains fail-closed.

## Compatibility surfaces

- Phase 4 historical evidence and scope ownership.
- Phase 5 repository control plane.
- Multi-track checkpoint state.

## Files expected to change

- `tools/reengineering/validate-phase4-active-scope.mjs`
- `tools/reengineering/validate-phase4-implementation-scope.mjs`
- `tools/reengineering/validate-phase5-active-scope.mjs`
- `tests/reengineering/phase4-active-scope.test.mjs`
- `tests/reengineering/phase4-implementation-scope.test.mjs`
- `tests/reengineering/phase5-active-scope.test.mjs`
- `docs/agents/claims/LW-P5-CTRL-001.md`
- `docs/agents/handoffs/LW-P5-CTRL-001.md`
- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `runtime/checkpoints/LATEST.md`
- `runtime/checkpoints/LATEST.json`
- `reengineering/checkpoints/LATEST.md`
- `reengineering/checkpoints/LATEST.json`
- `reengineering/evidence/phase-5/LW-P5-CTRL-001/**`

## Files not to change

- `docs/app.html`
- `docs/modules/**`
- `apps/**`
- `packages/**`
- `server/**`
- `desktop/**`
- `workers/**`
- `telegram-worker.js`
- Phase 0–4 promoted evidence

## Acceptance criteria

- Later Phase 5 descendants do not fail the closed Phase 4 validator.
- Unauthorized paths in the historical Phase 4 range still fail.
- The Phase 5 validator detects committed, staged, unstaged, untracked, and
  force-added ignored unauthorized paths.
- Exact control-plane paths pass.
- Both canonical CLIs reject scope override flags.
- Focused and full reengineering controls pass.

## Required tests

- `node --test tests/reengineering/phase4-active-scope.test.mjs tests/reengineering/phase5-active-scope.test.mjs`
- `node --test tests/reengineering/*.test.mjs`
- `node tools/reengineering/validate-phase4-active-scope.mjs`
- `node tools/reengineering/validate-phase5-active-scope.mjs`
- `git diff --check`

## Required documentation updates

- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `docs/agents/handoffs/LW-P5-CTRL-001.md`
- both checkpoint pairs

## Risks

- Closing the wrong historical terminal could hide Phase 4 changes.
- Widening the Phase 4 allowlist could weaken preserved evidence.
- An incomplete active-path collector could miss dirty or ignored changes.

## Escalation trigger

Stop and request decision when:

- The pinned terminal is not an ancestor of the current head.
- The historical range contains an unauthorized path not already dispositioned.
- The control repair would require modifying runtime or prior evidence.
