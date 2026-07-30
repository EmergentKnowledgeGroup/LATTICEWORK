# Work Claim — `LW-P3-DEC-001`

**Status:** Claimed
**Owner:** Codex root controller
**Coordinator:** Codex root controller
**Base commit:** `6704dd502a140fce2fe8e06f8db336d0bd3839a5`
**Branch:** `reengineering/p3-decision-packet`
**Claim time:** `2026-07-30T12:55:05Z`

## Objective

Draft and validate the bounded Phase 3 data/storage, provider/security, and
cutover decision packet without changing runtime behavior, persisted data,
external-service behavior, or deployment routing.

## In scope

- Characterize the decision surfaces behind `LW-BLK-005` through
  `LW-BLK-007`.
- Draft proposed ADRs for versioned storage/migration, provider abstraction,
  and optional-proxy security; freeze reversible cutover as a future ADR-009
  owner gate rather than deciding it here.
- Define invariants, stop conditions, rollback, fixtures, and executable
  verification required before implementation.
- Add repository controls that reject an incomplete or prematurely accepted
  decision packet.
- Update living state, blocker, roadmap, inventory, claim, handoff, and
  checkpoint documents to match the validated proposal state.

## Out of scope

- Any storage read/write adapter or schema migration.
- Any provider, credential, gateway, worker, peer, Telegram, or mesh runtime.
- Any change to security, privacy, identity, or cryptographic semantics.
- Any legacy feature extraction, route switch, service-worker change,
  deployment mirror edit, or capability retirement.
- Marking an ADR `Accepted` without an explicit maintainer disposition.

## Locked constraints

- Preserve all 252 pinned registry rows and every newly discovered row as
  unknown-preserve obligations until characterized and accepted otherwise.
- Exact legacy identifiers, unknown fields, and unrecognized records within an
  explicitly authorized in-scope dataset survive every proposed migration and
  rollback; excluded datasets remain untouched and unexported.
- Credentials and sensitive values never enter fixtures, evidence, logs, or
  version control.
- Default provider, bind, network, and route behavior remain unchanged.
- The immutable baseline and all Phase 2 protected paths remain untouched.

## Compatibility surfaces

- Browser storage and import/export:
  `reengineering/DATA_INVENTORY.md`.
- Preservation obligations:
  `reengineering/DATA_PRESERVATION_REGISTRY.json`.
- Provider and trust boundaries:
  `reengineering/SECURITY_BOUNDARY_MAP.md`.
- Migration and rollback:
  `reengineering/MIGRATION_LEDGER.md`.
- Current compatibility contract:
  `docs/COMPATIBILITY.md`.

## Files expected to change

- `docs/decisions/0004-*.md`
- `docs/decisions/0005-*.md`
- `docs/decisions/0006-*.md`
- `reengineering/PHASE3_DECISION_PACKET.md`
- `reengineering/PHASE3_DECISION_PACKET.json`
- `reengineering/PHASE3_BASELINE_PRESERVATION_IDS.json`
- `tests/reengineering/phase3-decision-packet.test.mjs`
- `tools/reengineering/validate-phase3-decision-packet.mjs`
- Evidence-linked living documents and this work unit's handoff
- Both checkpoint surfaces under `runtime/` and `reengineering/`

## Files not to change

- Legacy runtime and deployment mirrors, including root/`docs` HTML, modules,
  workers, service workers, gateways, and desktop sources.
- `apps/web/**`, `packages/**`, package manifests, and lockfiles.
- `LICENSE`, baseline evidence, Phase 1 evidence, and Phase 2 evidence.

## Acceptance criteria

- Three proposed ADRs state exact decisions, invariants, alternatives,
  compatibility impact, data/security impact, verification, and rollback.
- The decision packet maps every open blocker to a disposition gate and
  contains no implementation claim.
- Repository controls prove blocker/ADR/packet consistency and reject missing,
  accepted-without-disposition, or weakened preservation requirements.
- The full repository-control suite remains green.
- Living documentation and both checkpoint ledgers agree on the next authority
  gate.

## Required tests

- `node --test tests/reengineering/phase3-decision-packet.test.mjs`
- `node --test --test-reporter=tap tests/reengineering/*.test.mjs`
- `node tools/reengineering/validate-phase3-decision-packet.mjs`
- JSON parse checks for all changed JSON files.
- `git diff --check`

## Required documentation updates

- `PROJECT_STATE.md`
- `ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/COMPATIBILITY.md`
- `docs/TESTING_AND_VERIFICATION.md`
- `reengineering/BLOCKERBOARD.md`
- `reengineering/DATA_INVENTORY.md`
- `reengineering/SECURITY_BOUNDARY_MAP.md`
- `reengineering/MIGRATION_LEDGER.md`
- `docs/agents/handoffs/LW-P3-DEC-001.md`

## Risks

- A proposed contract may accidentally be described as implemented or accepted.
- A broad storage abstraction may hide unresolved record schemas.
- A provider interface may normalize away security-relevant failure behavior.
- A cutover proposal may imply authority to retire a capability.

## Escalation trigger

Stop and request decision when:

- An ADR is ready for maintainer disposition.
- Evidence would require reading or mutating real user data or credentials.
- A proposal would remove a legacy identifier, unknown field, provider,
  platform, route, or capability.
- Implementation would alter storage, privacy, security, identity,
  cryptography, network exposure, or default routing.
