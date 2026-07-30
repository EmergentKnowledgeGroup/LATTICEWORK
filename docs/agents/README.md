# Agent Workflow

This directory externalizes multi-agent work so that coordination survives model changes, context resets, and interrupted sessions.

## Required files

- `SWARM_PROTOCOL.md` — authority, ownership, and merge rules
- `WORK_CLAIM_TEMPLATE.md` — claim a bounded unit before editing
- `SESSION_TEMPLATE.md` — record one work session
- `HANDOFF_TEMPLATE.md` — transfer work without private briefing

## Recommended runtime directories

Create these as work begins:

```text
docs/agents/claims/
docs/agents/sessions/
docs/agents/handoffs/
```

Use stable IDs such as `LW-ARCH-001`, `LW-TEST-014`, or `LW-MIG-003`.

## Rule

No agent should need to infer whether another agent owns the same work.
