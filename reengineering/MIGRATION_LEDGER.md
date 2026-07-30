# Migration Ledger

**Status:** NO LEGACY MIGRATION STARTED; CANDIDATE FOUNDATION VERIFIED

| ID | Surface | Baseline owner | Target owner | Data risk | Compatibility risk | Rollback | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `MIG-001` | Canonical web source/build | root/docs mirrors | `apps/web/src` per accepted ADR-001 | Low | Critical | legacy remains runnable | FOUNDATION VERIFIED — no route or deployment cutover | `evidence/phase-2/LW-P2-001/` |
| `MIG-002` | Provider calls | global browser functions | provider contracts/adapters | High | High | route flag to legacy | ACCEPTED BOUNDED MOCK IMPLEMENTATION — no route activation | ADR-005 and `PHASE3_PREFLIGHT.md` |
| `MIG-003` | Browser storage | direct feature/UI calls | versioned repositories | Critical | Critical | backup-first/copy-on-write | ACCEPTED SYNTHETIC IMPLEMENTATION — no real-data read or activation | ADR-004 and `PHASE3_PREFLIGHT.md` |
| `MIG-004` | Chat vertical slice | monolith/global state | bounded chat feature | High | Critical | legacy route default | BLOCKED | pending |
| `MIG-005` | Service worker | mirrored scripts/caches | generated manifest/runtime | Critical | Critical | previous known-good cache | BLOCKED | pending |
| `MIG-006` | Desktop | Electron and Tauri | one accepted strategy or deferral | High | High | no desktop cutover | BLOCKED | pending |

No migration starts before its baseline behavior, data ownership, interface, failure behavior, and rollback are characterized.

**VERIFIED:** Phase 2 proves that the isolated candidate source can produce a
byte-reproducible relative build while legacy protected paths remain unchanged.
It does not migrate a feature, generate the deployment mirror, switch a route,
or resolve the legacy root/`docs` precedence problem.

The accepted Phase 3 work starts only synthetic/mock implementation of
`MIG-002` and `MIG-003`. It does not read real user data or activate a
migration, provider route, feature, or cutover.
