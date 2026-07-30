# Work Claim — `LW-P3-PREFLIGHT-001`

**Status:** Completed
**Owner:** Codex root controller
**Coordinator:** Codex root controller
**Base commit:** `6fa553ee3f5c7d1952f7aed836873467c4626068`
**Branch:** `reengineering/p3-decision-packet`
**Claim time:** `2026-07-30T13:40:00Z`

## Objective

Prepare and validate the exact implementation preflight for the separately
gated `LW-P3-001` synthetic storage/provider slice so explicit ADR acceptance
can lead directly to bounded code without another design cycle.

## In scope

- Map exact candidate package paths, contracts, dependencies, fixtures, tests,
  evidence, rollback, performance, and clean-worktree gates.
- Freeze a synthetic `conversation` schema-version-1 storage slice and
  deterministic local/cloud mock provider slice that conform to the Proposed
  packet.
- Add a machine-readable preflight plus negative controls that reject runtime
  authority, real data, real credentials/traffic, listeners, legacy paths,
  default-route changes, or cutover.
- Update living state, execution checklist, handoff, and both checkpoint
  surfaces.

## Out of scope

- Accepting ADR-004, ADR-005, or ADR-006.
- Creating storage/provider packages or implementation fixtures.
- Reading or mutating real user data.
- Using real credentials or provider endpoints.
- Starting a listener or changing gateway/LAN/worker/peer/Telegram behavior.
- Editing legacy runtime, candidate app/kernel/contracts packages, manifests,
  lockfiles, routes, deployment mirrors, service workers, or desktop sources.
- Opening a pull request or requesting another CodeRabbit review.

## Locked invariants

- `reengineering/PHASE3_DECISION_PACKET.json` remains proposal-only with
  `implementation_authorized: false`.
- `LW-P3-001` remains `BLOCKED` until explicit ADR-004 and ADR-005 acceptance.
- All 252 pinned preservation IDs remain a minimum floor.
- The first implementation dataset remains stable ID `conversation`, schema
  version 1, with synthetic `conversations` and `messages` fixtures only.
- Provider work remains deterministic mocks only with zero real egress.
- ADR-006 authorizes no Phase 3 listener even if later accepted.

## Compatibility surfaces

- `reengineering/PHASE3_DECISION_PACKET.*`
- `docs/decisions/0004-versioned-storage-and-migration.md`
- `docs/decisions/0005-provider-abstraction-and-provenance.md`
- `docs/decisions/0006-optional-local-proxy-security.md`
- `docs/COMPATIBILITY.md`
- `reengineering/DATA_INVENTORY.md`
- `reengineering/SECURITY_BOUNDARY_MAP.md`

## Expected files

- `reengineering/PHASE3_PREFLIGHT.md`
- `reengineering/PHASE3_PREFLIGHT.json`
- `tools/reengineering/validate-phase3-preflight.mjs`
- `tests/reengineering/phase3-preflight.test.mjs`
- `docs/agents/handoffs/LW-P3-PREFLIGHT-001.md`
- Evidence-linked living documents and both checkpoint surfaces

## Acceptance criteria

- Exact owned/no-touch paths and package dependency directions are frozen.
- Storage descriptor, journal, repository, import/export, mock-provider,
  provenance, and policy contracts have measurable tests and stop conditions.
- Every command, output/evidence path, environment requirement, and rollback
  action is explicit.
- Negative controls reject weakened authority, real-data/credential/traffic,
  listener, legacy mutation, cutover, or missing verification gates.
- Full repository controls remain green.
- Independent QA confirms the preflight is implementation-ready if and only if
  ADR-004 and ADR-005 are explicitly accepted.

## Required tests

- `node tools/reengineering/validate-phase3-preflight.mjs`
- `node --test tests/reengineering/phase3-preflight.test.mjs`
- `node --test --test-reporter=tap tests/reengineering/*.test.mjs`
- JSON parse checks, Node syntax checks, link/scope audit, and
  `git diff --check`

## Escalation trigger

Stop before implementation unless an explicit maintainer receipt accepts
ADR-004 and ADR-005. Stop and request a separate decision if the preflight
would require real data, real egress, credentials, a listener, a legacy path,
or a new security/privacy/identity/cryptographic/cutover semantic.
