# Work Claim — `LW-P5-MEM-PREFLIGHT-001`

**Status:** Claimed
**Owner:** Codex `/root`
**Coordinator:** UltariumV3
**Base commit:** `1108fe5d4a73315cbb71574361c4928b84e394da`
**Branch:** `reengineering/p5-lattice-memory`
**Claim time:** `2026-07-31T05:47:22Z`

## Objective

Freeze and validate the exact synthetic-only characterization contract for the
deployed legacy `LatticeMemory` pulse medium before any candidate
implementation.

## In scope

- `docs/modules/lattice-memory.js` as a read-only pinned legacy source,
  including documented doctrine versus observable divergences.
- Public `commit`, `subscribe`, `recent`, and `_internal` inspection/reset
  behavior.
- `LatticeMemory` v1 / `pulses` schema and bounded retention behavior.
- Shape validation, Quiet Room exclusion, pending queue, fan-out, reload, and
  fail-quiet behavior.
- Unbounded string channels, Quiet Room read/subscription gaps, `_internal`
  inspection/reset behavior, loader registration, and blocked/malformed schema
  behavior.
- Synthetic disposable browser profiles with external egress denied.
- Exact packet, validator, negative tests, evidence, handoff, and living docs.

## Out of scope

- Every other memory-named subsystem.
- Legacy source edits.
- Candidate package or implementation.
- Real records, migration, import/export, providers, credentials, listeners
  beyond one run-owned loopback static fixture, activation, deployment, or
  cutover.

## Locked constraints

- Immutable baseline SHA is
  `e7585999fc1af2707f410ae87356cf2b52e08d9c`.
- Legacy module SHA-256 is
  `a65dba17a30ab8a657e52423ab8b1ac58d5597a83fe4ee823aecb83dc9588052`.
- One Playwright worker, zero retries, Chrome channel.
- Every profile and run root is a strict repository descendant under
  `runtime/tmp/` and is removed before promotion.
- Evidence contains no pulse summary content, credentials, or real data.

## Compatibility surfaces

- `PRES-MODULE-037` and the exact deployed pulse-medium module.
- `LatticeMemory` v1 / `pulses`.
- Quiet Room privacy boundary.
- Existing static smoke locks in `tests/smoke.js`.

## Files expected to change

- `reengineering/PHASE5_LATTICE_MEMORY_PREFLIGHT.md`
- `tools/reengineering/validate-phase5-lattice-memory-preflight.mjs`
- `tests/reengineering/phase5-lattice-memory-preflight.test.mjs`
- `docs/agents/claims/LW-P5-MEM-PREFLIGHT-001.md`
- `docs/agents/handoffs/LW-P5-MEM-PREFLIGHT-001.md`
- `reengineering/evidence/phase-5/LW-P5-MEM-PREFLIGHT-001/**`
- Phase 5 active scope validator/test, living docs, and both checkpoint pairs

## Files not to change

- `docs/modules/lattice-memory.js`
- `docs/app.html`
- `tests/smoke.js`
- `apps/**`
- `packages/**`
- `server/**`, `desktop/**`, `worker/**`, `deployment/**`
- promoted Phase 0–4 evidence

## Acceptance criteria

- The machine lock names all 69 atomic behaviors, every path, authority flag,
  and gate.
- Negative controls reject weakened privacy, profile, egress, source identity,
  schema, retention, or implementation-authority clauses.
- Phase 5 active scope remains exact and fail-closed.
- Full repository controls and independent packet review are GREEN.

## Required tests

- `node --test tests/reengineering/phase5-lattice-memory-preflight.test.mjs tests/reengineering/phase5-active-scope.test.mjs`
- `node --test tests/reengineering/*.test.mjs`
- `node tools/reengineering/validate-phase5-lattice-memory-preflight.mjs`
- `node tools/reengineering/validate-phase5-active-scope.mjs`
- `git diff --check`

## Required documentation updates

- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `docs/agents/handoffs/LW-P5-MEM-PREFLIGHT-001.md`
- both checkpoint pairs

## Risks

- Accidentally treating other memory systems as the same dataset.
- Encoding intended comments instead of observed runtime behavior.
- Promoting private pulse summaries or real browser state into evidence.

## Escalation trigger

Stop and request decision when:

- Characterization would require real records or a legacy source edit.
- The immutable module hash differs.
- Any test requires provider traffic, credentials, or a non-loopback listener.
