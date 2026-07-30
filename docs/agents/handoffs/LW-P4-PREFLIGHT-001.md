# Handoff — `LW-P4-PREFLIGHT-001`

**From:** Codex root controller
**To:** `LW-P4-CHAR-001` controller
**Date:** `2026-07-30T21:15:43Z`
**Verified candidate commit:** `03dfdfc381365201fd53a32c9c5c057f0cdbf953`
**Branch:** `reengineering/p4-chat-vertical-slice-preflight`

## State in one paragraph

Phase 4 preflight version 1.0 is locked and independently green. It authorizes
only additive characterization of the immutable primary Chat baseline using
fresh synthetic profiles, mocked Ollama/OpenAI protocol fixtures, denied
external egress, and the existing loopback static harness. It does not
authorize candidate implementation or runtime integration.

## Completed

- Froze two provider fixtures and one primary-Chat caller boundary.
- Froze 16 reporting groups containing exactly 39 mandatory atomic subcases.
- Froze fresh-profile, evidence, cleanup, redaction, rollback, stop, and
  independent-reproduction rules.
- Froze exact characterization-owned paths and 14 mandatory gates.

## Verified

- Three independent first-pass reviews and final consolidation defects were
  dispositioned.
- Post-repair guardrail review: GREEN.
- Focused scope suite: 48 of 48 PASS.
- Full repository controls: 116 of 116 PASS, zero fail/skip/todo.
- Machine-readable lock: 16 groups, 39 subcases,
  `implementation_authorized: false`.

## Not verified

- Any of the 39 baseline behavior subcases.
- Real-provider compatibility, real credentials, or real user data.
- Candidate behavior, feature parity, integration, activation, or cutover.

## Changed files

- `reengineering/PHASE4_PREFLIGHT.md`
- `reengineering/EXECUTION_CHECKLIST.md`
- `reengineering/BLOCKERBOARD.md`
- `PROJECT_STATE.md`
- `ROADMAP.md`
- Claim, handoff, and checkpoint ledgers.

## Important relationships

- A reporting group passes only when every atomic child passes from a fresh
  profile.
- Any UNKNOWN, conditional, skipped, or failed mandatory result prevents GREEN.
- Missing baseline cancellation behavior must be recorded as UNKNOWN; it may
  not be simulated to manufacture a passing contract.

## Known risks

- The baseline may not expose a visible cancellation control. If so,
  characterization will honestly stop short of GREEN and implementation stays
  blocked pending a separately accepted disposition.

## Do not do next

- Do not modify shared Playwright config, manifests, app/runtime code, Phase 3
  packages, or the immutable baseline.
- Do not contact a real provider or use a real browser profile.

## Read first

1. `reengineering/PHASE4_PREFLIGHT.md`
2. `docs/agents/handoffs/LW-P4-CTRL-001.md`
3. `reengineering/BLOCKERBOARD.md`

## Next exact action

Create the `LW-P4-CHAR-001` claim and implement only the exact additive
characterization paths frozen in the lock.

## Success condition

All 39 mandatory atomic subcases pass with complete promoted evidence and
independent clean-worktree reproduction, or the workstream stops with an
explicit evidence-backed blocker.

## Resume command

```powershell
Get-Content -Raw reengineering/PHASE4_PREFLIGHT.md
```
