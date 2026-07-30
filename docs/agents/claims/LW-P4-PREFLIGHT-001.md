# Work Claim — `LW-P4-PREFLIGHT-001`

**Status:** Completed — LOCKED / GREEN
**Owner:** Codex root controller
**Coordinator:** Codex root controller
**Base commit:** `e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd`
**Branch:** `reengineering/p4-chat-vertical-slice-preflight`
**Claim time:** `2026-07-30T20:23:58Z`

## Objective

Produce and independently review a decision-complete Phase 4
characterization/preflight packet for one bounded onboarding/provider/Chat/
conversation/diagnostics vertical slice without implementing or activating the
candidate feature.

## In scope

- Lock the synthetic-profile baseline characterization contract for onboarding,
  provider setup, Chat send/stream/cancel/retry, conversation persistence and
  recovery, Signal Report privacy, degraded states, and accessibility.
- Require deterministic provider-protocol fixtures with external egress denied.
- Define exact evidence, rollback, stop conditions, compatibility claims, and
  the later maintainer decision required before `LW-P4-001` implementation.
- Update only planning artifacts, claim/handoff state, and checkpoint ledgers.

## Out of scope

- Application, legacy runtime, provider, storage, route, service-worker,
  desktop, worker, gateway, or deployment implementation.
- Real browser profiles, real user data, real credentials, real provider
  endpoints or traffic, provider/runtime listeners, proxies,
  LAN/worker/peer/Telegram behavior.
- The only listener exception is the existing harness-owned Python static
  server bound to `127.0.0.1`, serving the pinned immutable baseline on one
  recorded port with startup identity and teardown receipts.
- Candidate registration, activation, default-route change, migration,
  cleanup, cutover, compatibility upgrade, or release claim.

## Locked constraints

- Legacy runtime and data remain authoritative.
- Every browser run uses a disposable synthetic profile and denied external
  egress.
- Deterministic mock success cannot satisfy a real-provider compatibility gate.
- No Phase 3 package may be imported into `apps/web` under this claim.
- `LW-BLK-005`, `LW-BLK-006`, and `LW-BLK-007` remain open.

## Compatibility surfaces

- `docs/COMPATIBILITY.md` — onboarding, provider connection, Chat,
  conversation persistence, diagnostics, recovery, offline, accessibility.
- `reengineering/PARITY_MATRIX.md` — current C0/C2 evidence and later shared
  fixture comparison.
- `reengineering/MIGRATION_LEDGER.md` — `MIG-004` remains blocked.

## Files expected to change

- `docs/agents/claims/LW-P4-PREFLIGHT-001.md`
- `reengineering/PHASE4_PREFLIGHT.md`
- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `PROJECT_STATE.md`
- `ROADMAP.md`
- `docs/agents/handoffs/LW-P4-PREFLIGHT-001.md`
- `runtime/checkpoints/LATEST.md`
- `runtime/checkpoints/LATEST.json`
- `reengineering/checkpoints/LATEST.md`
- `reengineering/checkpoints/LATEST.json`

## Files not to change

- `apps/web/**`, `packages/**`, legacy HTML/module/service-worker paths,
  `server.js`, `server.py`, `desktop/**`, `worker/**`, and
  `telegram-worker.js`.
- `Z:\LATTICEWORK_BASELINE_e7585999` and `Z:\FreeLattice`.
- Any Phase 0 through Phase 3 frozen evidence artifact.

## Acceptance criteria

- The locked preflight, execution checklist, and blockerboard are internally
  consistent and contain no unresolved product choice.
- Three independent first-pass reviews, final consolidation review, and a
  post-repair guardrail review identify no unresolved blocking specification
  or control defect.
- Every gate distinguishes baseline characterization, mock proof, candidate
  comparison, and real-world compatibility.
- Implementation remains `BLOCKED` pending characterization evidence and an
  explicit maintainer acceptance of the later candidate-owned paths.

## Required tests

- Repository Markdown/link/control checks applicable to planning artifacts.
- Full repository-control suite with the immutable baseline root supplied.
- JSON parse checks for checkpoint ledgers.
- `git diff --check`.
- Independent read-only specification QA.

## Required documentation updates

- `PROJECT_STATE.md`
- `ROADMAP.md`
- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `docs/agents/handoffs/LW-P4-PREFLIGHT-001.md`

## Risks

- A shell-only test could be misrepresented as Chat behavior.
- Route interception could be misrepresented as real-provider compatibility.
- Synthetic storage could be misrepresented as real-data migration evidence.
- A broad “vertical slice” could conceal premature application integration.

## Escalation trigger

Stop and request decision when:

- an implementation path, real-data read, real credential, provider endpoint,
  listener, legacy mutation, candidate registration, activation, or cutover is
  required;
- the characterization contract cannot reproduce a required behavior without
  weakening fixture isolation or evidence integrity;
- the locked preflight would require choosing a product policy not already
  established by the charter, principles, accepted ADRs, or maintainer.
