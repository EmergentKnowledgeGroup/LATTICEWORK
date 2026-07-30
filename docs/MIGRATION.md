<!-- Status: LIVING | Owner: Migration lead -->

# Migration Plan

## Goal

Move from upstream implementation to LATTICEWORK architecture without losing user data, behavior, provenance, or rollback ability.

## Migration principles

- Characterize before moving.
- Introduce seams before replacement.
- Migrate one bounded surface at a time.
- Keep rollback until verification is complete.
- Version stored data.
- Record every intentional divergence.
- Never use user data as an undocumented test fixture.

## Workstream table

| ID | Surface | Current owner | Target owner | Compatibility risk | Data risk | Rollback | Status |
|---|---|---|---|---|---|---|---|
| `MIG-001` | Canonical web source/build | legacy root/`docs` mirrors | candidate `apps/web/src` | Critical | Low in feature-free Phase 2 | remove candidate commit/output; legacy remains default | Foundation verified; no cutover |
| `MIG-002` | Provider calls | legacy browser globals | future provider contracts/adapters | High | High | legacy route remains default | Blocked |
| `MIG-003` | Browser storage | direct legacy UI/feature calls | future versioned repositories | Critical | Critical | backup-first/copy-on-write design required | Blocked |
| `MIG-004` | First feature vertical slice | legacy monolith/global state | future bounded feature package | Critical | High | legacy route remains default | Blocked |

The detailed machine-operational status is maintained in
[`reengineering/MIGRATION_LEDGER.md`](../reengineering/MIGRATION_LEDGER.md).

## Required sequence per surface

1. Identify current behavior and dependencies.
2. Add or verify characterization tests.
3. Define target interface.
4. Introduce adapter or seam.
5. Run old and new paths against shared fixtures.
6. Migrate data or state ownership.
7. Verify failure and recovery behavior.
8. Record divergences.
9. Remove old path only after approval.
10. Update architecture, compatibility, and project state.

## Data migration record

| Schema | From | To | Backup | Forward migration | Rollback | Verified |
|---|---|---|---|---|---|---|
| None | — | — | — | — | — | No LATTICEWORK data migration is implemented or authorized |

## Rollback rule

Every structural migration must define the last known safe commit, data restore procedure, and conditions that trigger rollback.
