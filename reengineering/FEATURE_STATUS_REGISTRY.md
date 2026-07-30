# Feature Status Registry

**Status:** PHASE 0 FROZEN — CHARACTERIZATION CONTINUES
**Allowed states:** `baseline-uncharacterized`, `observed`, `characterized`, `implemented`, `verified`, `diverged`, `unsupported`

| ID | Capability | Baseline state | LATTICEWORK state | Evidence |
|---|---|---|---|---|
| `FEAT-001` | Onboarding and provider setup | observed | not implemented | `evidence/phase-1/LW-P1-001/` (onboarding/skip subflow characterized; provider setup remains uncharacterized) |
| `FEAT-002` | Chat, streaming, cancel, retry | observed | not implemented | `evidence/phase-1/LW-P1-001/` (Chat shell and unsent-input Signal Report boundary characterized; send/stream/cancel/retry uncharacterized) |
| `FEAT-003` | Conversation persistence | observed | not implemented | `evidence/phase-1/LW-P1-001/artifacts/shell-and-storage/runtime-snapshot.json` (fresh database/store names and versions only; values, retention, migration, and recovery uncharacterized) |
| `FEAT-004` | Local and cloud providers | baseline-uncharacterized | not implemented | Phase 1 denied all out-of-origin network access by design; no provider semantics were characterized |
| `FEAT-005` | Core and integrity chain | baseline-uncharacterized | not implemented | pending |
| `FEAT-006` | Memory and continuity | baseline-uncharacterized | not implemented | pending |
| `FEAT-007` | Question Corner and Workshop | baseline-uncharacterized | not implemented | pending |
| `FEAT-008` | Garden and creative identity experiences | observed | not implemented | `evidence/phase-1/LW-P1-001/` (skip-to-Garden boot/render and no-WebGPU fallback characterized; interaction/lifecycle uncharacterized) |
| `FEAT-009` | Chalkboard, canvas, and vision | baseline-uncharacterized | not implemented | pending |
| `FEAT-010` | Radio, Dojo, games, education, and creative rooms | baseline-uncharacterized | not implemented | pending |
| `FEAT-011` | Import, export, backup, restore, and purge | baseline-uncharacterized | not implemented | pending |
| `FEAT-012` | Sync, peers, mesh, workers, and Telegram | baseline-uncharacterized | not implemented | pending |
| `FEAT-013` | PWA/offline/update/recovery | observed | not implemented | `evidence/phase-1/LW-P1-001/` (active worker/cache and warm offline reload failure characterized; update/rollback remain uncharacterized) |
| `FEAT-014` | Electron and Tauri desktop surfaces | baseline-uncharacterized | not implemented | pending |
| `FEAT-015` | Diagnostics, safe mode, and support receipts | observed | not implemented | `evidence/phase-1/LW-P1-001/` (Signal Report open/copy and unsent-input exclusion characterized; safe mode and broader error capture remain uncharacterized) |

This registry cannot downgrade a baseline obligation. It only records evidence-backed state.

`observed` means one bounded runtime path has a receipt; it does not mean the
capability is fully characterized. The exhaustive source-level preservation rows
are in `CAPABILITY_PRESERVATION_REGISTRY.json`.
