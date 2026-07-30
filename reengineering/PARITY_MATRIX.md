# Baseline-to-LATTICEWORK Parity Matrix

**Status:** PHASE 1 BOUNDED C0/C1/C2 BASELINE FROZEN

| Surface | Baseline receipt | Target receipt | Level | Divergence | Blocker |
|---|---|---|---|---|---|
| HTTP launch, first run, and skip | `evidence/phase-1/LW-P1-001/` | none | C2 | none | LW-BLK-002..004 |
| Edge and direct-file first render | `evidence/phase-0/LW-P0-003-browser/` | none | C1 | none | LW-BLK-002..004 |
| Local model connection | pending | none | C0 | none | LW-BLK-001 |
| Cloud provider connection | pending | none | C0 | none | LW-BLK-001 |
| Chat shell | `evidence/phase-1/LW-P1-001/` | none | C2 | none | LW-BLK-002..004 |
| Chat send/stream/cancel/retry and persistence | pending | none | C0 | none | LW-BLK-001 |
| Identity, memory, continuity | pending | none | C0 | none | LW-BLK-001 |
| Fresh storage initialization shape | `evidence/phase-1/LW-P1-001/artifacts/shell-and-storage/runtime-snapshot.json` | none | C2 | none | LW-BLK-002..004 |
| Garden boot/render and no-WebGPU fallback | `evidence/phase-1/LW-P1-001/` | none | C2 | none | LW-BLK-002..004 |
| Canvas/Core/remaining creative features | pending | none | C0 | none | LW-BLK-001 |
| Import/export and data recovery | pending | none | C0 | none | LW-BLK-005 |
| PWA registration/cache/warm offline reload failure | `evidence/phase-1/LW-P1-001/` | none | C2 | none | LW-BLK-002..004 |
| PWA update/partial install/multi-tab/rollback | pending | none | C0 | none | LW-BLK-001 |
| Peer/worker/Telegram | pending | none | C0 | none | LW-BLK-006 |
| Electron/Tauri desktop | pending | none | C0 | none | LW-BLK-004 |
| Mobile Garden viewport | `evidence/phase-1/LW-P1-001/artifacts/mobile/mobile-overlap.json` | none | C2 | none | LW-BLK-002..004 |
| Accessibility | forced-colors/reduced-motion screenshot only | none | C0 | none | LW-BLK-001 |
| Signal Report open/copy and unsent-input exclusion | `evidence/phase-1/LW-P1-001/` | none | C2 | none | LW-BLK-002..004 |
| General failure and recovery | pending | none | C0 | none | LW-BLK-001 |

Levels follow `docs/COMPATIBILITY.md`. A candidate build does not advance a row without shared-fixture behavior evidence.
