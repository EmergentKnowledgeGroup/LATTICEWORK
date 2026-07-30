# Work Claim — `LW-P4-AMEND-001`

**Status:** Completed — control packet green; runtime blocked
**Owner:** Codex root controller
**Coordinator:** Codex root controller
**Base commit:** `a9f8cdd877e835f7bd86edd49d44ba0b711ef205`
**Branch:** `reengineering/p4-characterization-amendment`
**Claim time:** `2026-07-30T23:20:10Z`

## Objective

Record the maintainer-approved Phase 4 characterization amendment, convert
confirmed baseline defects into explicit divergences, authorize one
run-owned loopback-only synthetic streaming fixture, and freeze the corrected
`LW-P4-IMPL-PREFLIGHT-001` packet without implementing or activating it.

## In scope

- A superseding Phase 4 amendment and machine-readable lock.
- Exact divergence records for missing cancellation and OpenAI-to-Groq routing.
- Characterization controls needed to distinguish accepted divergence from
  unproved behavior.
- A bounded `127.0.0.1` synthetic streaming fixture design and tests.
- The corrected candidate implementation packet, scope validator, tests,
  evidence, living docs, claim/handoff, and checkpoints.

## Out of scope

- Any edit to legacy or candidate application/runtime code.
- Real user data, credentials, provider traffic, billing, or provider claims.
- Runtime registration, route activation, migration, deployment, or cutover.
- Wildcard, LAN, worker, peer, gateway, proxy, or Telegram listeners.
- Starting `LW-P4-001` before separate maintainer acceptance of the corrected
  implementation packet.

## Locked constraints

- Confirmed baseline defects are preserved as evidence and named divergences;
  they are never relabeled as baseline PASS.
- The synthetic stream server binds exactly `127.0.0.1`, uses a run-selected
  port, accepts fixture-only content, denies external egress, and is deleted
  with its run-owned staging.
- Legacy remains the default; Phase 3 packages remain inactive.

## Compatibility surfaces

- Primary Chat onboarding/provider selection.
- Chat streaming, cancellation, terminal, retry, reload, diagnostics, mobile,
  and accessibility behavior.
- Candidate storage/provider seams from accepted ADR-004 and ADR-005.

## Files expected to change

- `reengineering/PHASE4_CHARACTERIZATION_AMENDMENT.md`
- `reengineering/PHASE4_IMPLEMENTATION_PACKET.md`
- additive Phase 4 amendment validators/tests/evidence
- exact Phase 4 characterization harness/validator controls
- Phase 4 living documents, this claim, handoff, and both checkpoints

## Files not to change

- `apps/**`
- `packages/**`
- immutable baseline worktree
- deployment, installer, server, worker, service-worker, or root manifest files

## Acceptance criteria

- Maintainer authorization is quoted exactly and projected into a locked,
  machine-readable amendment.
- Defects, accepted divergences, still-unproved behavior, and candidate
  requirements are distinct.
- The local fixture boundary is fail-closed and cannot contact a real provider.
- The implementation packet names exact candidate paths, imports, storage and
  provider authority, non-default entrypoint, tests, rollback, and stop
  conditions.
- Independent spec QA and all repository controls pass.

## Required tests

- Focused amendment/packet validator tests.
- Full `tests/reengineering/*.test.mjs`.
- Active-scope, JSON, syntax, link, and whitespace validation.

## Required documentation updates

- `PROJECT_STATE.md`, `ROADMAP.md`, `docs/COMPATIBILITY.md`
- `reengineering/{BLOCKERBOARD,EXECUTION_CHECKLIST,MIGRATION_LEDGER,PARITY_MATRIX}.md`
- `docs/agents/handoffs/LW-P4-AMEND-001.md`
- both checkpoint surfaces

## Risks

- Accidentally turning a documented divergence into implementation authority.
- Treating a local fixture as real-provider compatibility evidence.
- Broadening the listener exception beyond one run-owned loopback fixture.

## Escalation trigger

Stop and request decision when:

- runtime/application edits, real data/credentials/provider traffic, a
  non-loopback listener, activation, migration, deployment, or cutover is
  required.
