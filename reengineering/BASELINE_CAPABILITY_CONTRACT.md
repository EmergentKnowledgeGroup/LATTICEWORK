# Baseline Capability Contract

**Status:** PHASE 0 FROZEN — UNKNOWN-PRESERVE
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`

Every user-reachable route, action, record, network behavior, launch mode, import/export format, deep link, public browser/global surface, and advertised capability at the pinned baseline creates a preservation obligation.

The machine-checkable source inventory is
`CAPABILITY_PRESERVATION_REGISTRY.json`. It contains one preservation row for
every bounded launch mode, in-app panel, root/docs static route, deployed module,
major user-action family, major global, network boundary, and sensitive surface
currently present in `LW-M0-BEH-001`. A row remains C0/UNKNOWN until runtime
evidence updates it; source presence alone does not prove reachability.

Browser, operating-system, viewport, launch-mode, and degraded-capability
evidence/dispositions are centralized in
[`PLATFORM_SUPPORT_MATRIX.md`](PLATFORM_SUPPORT_MATRIX.md).

## Launch-mode obligations

| Mode | Baseline obligation | Disposition | Evidence |
|---|---|---|---|
| `file://` | Must be characterized before narrowing | REQUIRED UNTIL OWNER DECISION | `LW-P0-003-browser` C1 direct-file first-render receipt; interaction remains pending |
| Static hosting | Preserve local/static usability | REQUIRED | `LW-P0-003-browser` C1 Chrome receipt |
| Local HTTP gateway | Preserve behavior; harden only through accepted security divergence | REQUIRED | pending |
| Installed PWA/offline restart | Preserve install, offline boot, update, and rollback semantics | REQUIRED | `LW-P0-003-browser` observed registration/cache and failed offline reload; update/rollback pending |
| LAN access | Characterize and require explicit trust decision before change | REQUIRED UNTIL OWNER DECISION | pending |
| Electron | Characterize before selecting one desktop strategy | REQUIRED UNTIL OWNER DECISION | pending |
| Tauri | Characterize before selecting one desktop strategy | REQUIRED UNTIL OWNER DECISION | pending |

## Capability families

All provider, chat, persistence, identity/continuity, memory, Core, Garden, Chalkboard, Question Corner, Workshop, creative room, game, education, radio, wallet/economy, sync, peer, worker, Telegram, import/export, offline, diagnostics, and recovery surfaces discovered in tracked source remain obligations until a versioned entry in `FEATURE_STATUS_REGISTRY.md` and `PARITY_MATRIX.md` disposes them.

## Freeze rules

- Renaming a capability does not remove its obligation.
- A stale or failing test remains part of the test-requirement manifest until explicitly dispositioned.
- A source mirror remains evidence of a shipped surface until reachability and deployment are proven otherwise.
- Unknown persisted fields and stores are preserved by default.
- Capability reduction requires owner approval and an ADR with migration, rollback, and user notice.
