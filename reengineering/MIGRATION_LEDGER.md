# Migration Ledger

**Status:** NOT STARTED

| ID | Surface | Baseline owner | Target owner | Data risk | Compatibility risk | Rollback | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `MIG-001` | Canonical web source/build | root/docs mirrors | `apps/web/src` per accepted ADR-001 | Low | Critical | legacy remains runnable | IN_PROGRESS — candidate only | `PHASE2_PREFLIGHT.md` |
| `MIG-002` | Provider calls | global browser functions | provider contracts/adapters | High | High | route flag to legacy | BLOCKED | pending |
| `MIG-003` | Browser storage | direct feature/UI calls | versioned repositories | Critical | Critical | backup-first/copy-on-write | BLOCKED | pending |
| `MIG-004` | Chat vertical slice | monolith/global state | bounded chat feature | High | Critical | legacy route default | BLOCKED | pending |
| `MIG-005` | Service worker | mirrored scripts/caches | generated manifest/runtime | Critical | Critical | previous known-good cache | BLOCKED | pending |
| `MIG-006` | Desktop | Electron and Tauri | one accepted strategy or deferral | High | High | no desktop cutover | BLOCKED | pending |

No migration starts before its baseline behavior, data ownership, interface, failure behavior, and rollback are characterized.
