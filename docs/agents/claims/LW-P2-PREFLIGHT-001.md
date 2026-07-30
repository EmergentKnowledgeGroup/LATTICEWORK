# Work Claim — `LW-P2-PREFLIGHT-001`

**Status:** Completed
**Owner:** Codex root controller
**Coordinator:** Codex root controller
**Base commit:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`
**Branch:** `reengineering/m0-baseline-characterization`
**Claim time:** `2026-07-30T10:19:22Z`

## Objective

Prepare the exact, reviewable Phase 2 implementation packet so explicit
maintainer acceptance of ADR-001 through ADR-003 can lead directly to a narrow
workspace/kernel/contracts/status-shell slice without another discovery cycle.

## In scope

- A plain-language maintainer disposition packet for ADR-001 through ADR-003.
- Exact proposed workspace, package, source, build, test, and evidence
  touchpoints for `LW-P2-001`.
- Minimal dependency pins and Node/npm compatibility.
- Runtime invariants, compatibility surfaces, rollback boundary, and test gates.
- Documentation/checkpoint updates only.

## Out of scope

- Accepting or modifying ADR status on behalf of the maintainer.
- Creating `apps/`, `packages/`, build configuration, generated artifacts, or
  candidate runtime code.
- Modifying legacy runtime, deployment, desktop, worker, storage, provider,
  identity, cryptographic, privacy, or security behavior.
- Installing dependencies or opening a pull request.

## Locked constraints

- ADR-001 through ADR-003 remain `Proposed` until explicit maintainer
  disposition.
- The Phase 2 packet must preserve the legacy runtime as the default runnable
  product and limit the first candidate to a non-destructive shell/status
  surface.
- No real credentials, personal data, provider mutation, or persistent
  candidate state.
- All temporary work remains on `Z:`.

## Compatibility surfaces

- Canonical source and generated artifact boundary.
- Browser launch and first-render behavior.
- Static-host and direct-file constraints.
- Legacy runtime coexistence and rollback.
- Accessibility, mobile layout, network denial, and diagnostics.

## Files expected to change

- `docs/agents/claims/LW-P2-PREFLIGHT-001.md`
- One Phase 2 preflight/maintainer-decision packet under `reengineering/`.
- `PROJECT_STATE.md` only if the next action or active workstream changes.
- Both checkpoint surfaces.

## Files not to change

- `docs/decisions/0001-canonical-source-and-build-strategy.md`
- `docs/decisions/0002-typescript-module-architecture.md`
- `docs/decisions/0003-ui-rendering-strategy.md`
- Existing upstream runtime, deployment, desktop, worker, and smoke-test files.
- `LICENSE`, `Z:\LATTICEWORK_BASELINE_e7585999`, and `Z:\FreeLattice`.

## Acceptance criteria

- The packet gives the maintainer one unambiguous accept/reject/change request.
- Every Phase 2 path is explicitly `PROPOSED`, not represented as implemented.
- Exact dependency pins, commands, acceptance tests, rollback, evidence paths,
  and compatibility invariants are present.
- The first implementation slice cannot silently replace or mutate the legacy
  runtime.
- Canonical documents and checkpoints agree on the remaining decision gate.

## Required tests

- JSON parse for both checkpoint ledgers.
- Canonical control-plane validation.
- Markdown relative-link check for the new packet.
- `git diff --check`.

## Required documentation updates

- `reengineering/PHASE2_PREFLIGHT.md`
- `PROJECT_STATE.md` if needed.
- Both checkpoint surfaces.
- A compact handoff if the preflight reaches green before maintainer response.

## Risks

- Over-specifying Phase 2 before acceptance could accidentally imply a decision.
- Dependency research can drift; exact registry observations require date and
  environment.
- A “small shell” can become an unauthorized big-bang rewrite unless owned
  paths and non-goals remain explicit.

## Escalation trigger

Stop before runtime edits when:

- Any required ADR remains `Proposed`.
- The preflight discovers a security, privacy, identity, cryptographic, or
  stored-data decision not covered by accepted architecture.
- The smallest slice would require changing the default legacy launch path.

## Outcome

- **OBSERVED** — the maintainer accepted ADR-001 through ADR-003 on
  2026-07-30 and directed execution to continue.
- **VERIFIED** — the implementation packet is recorded in
  `reengineering/PHASE2_PREFLIGHT.md`.
- **VERIFIED** — the packet keeps every candidate path additive and keeps the
  legacy runtime, launch routes, durable state, providers, workers, desktop
  shells, and service workers outside `LW-P2-001`.
- **MEASURED** — npm registry metadata was captured with Node `24.13.0` and npm
  `11.6.2`; Context7 documentation was queried through Docker MCP Toolkit's
  `home` profile.
