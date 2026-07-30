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
| `MIG-001` | `[SURFACE]` | `[CURRENT]` | `[TARGET]` | `[LEVEL]` | `[LEVEL]` | `[PLAN]` | `[STATUS]` |

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
| `[SCHEMA]` | `[VERSION]` | `[VERSION]` | `[METHOD]` | `[LINK]` | `[LINK]` | `[RESULT]` |

## Rollback rule

Every structural migration must define the last known safe commit, data restore procedure, and conditions that trigger rollback.
