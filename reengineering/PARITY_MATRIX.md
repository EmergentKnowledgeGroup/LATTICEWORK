# Baseline-to-LATTICEWORK Parity Matrix

**Status:** PHASE 1 BOUNDED C0/C1/C2 BASELINE FROZEN / PHASE 2 FOUNDATION DOES NOT UPGRADE PARITY

| Surface | Baseline receipt | Target receipt | Level | Divergence | Blocker |
|---|---|---|---|---|---|
| HTTP launch, first run, and skip | `evidence/phase-1/LW-P1-001/` | none | C2 | none | Phase 3/4 data-provider and vertical-slice gates |
| Edge and direct-file first render | `evidence/phase-0/LW-P0-003-browser/` | none | C1 | none | platform/cutover decision |
| Local model connection | `evidence/phase-4/LW-P4-CHAR-001/` | none | C0 | none | exact intercepted Ollama request observed; timed fragmentation remains UNKNOWN and no real provider was contacted |
| Cloud provider connection | `evidence/phase-4/LW-P4-CHAR-001/` | none | C0 | none | visible OpenAI choice dispatched Groq and was blocked before transmission; real-provider compatibility remains untested |
| Chat shell | `evidence/phase-1/LW-P1-001/` | none | C2 | none | Phase 4 feature migration |
| Chat send/stream/cancel/retry and persistence | `evidence/phase-4/LW-P4-CHAR-001/` | none | C0 | none | mixed 20 PASS / 16 UNKNOWN / 3 FAIL packet; no visible cancel control and no aggregate GREEN |
| Identity, memory, continuity | pending | none | C0 | none | data/security decisions and Phase 5 |
| Fresh storage initialization shape | `evidence/phase-1/LW-P1-001/artifacts/shell-and-storage/runtime-snapshot.json` | none | C2 | none | LW-BLK-005 |
| Garden boot/render and no-WebGPU fallback | `evidence/phase-1/LW-P1-001/` | none | C2 | none | Phase 5/6 feature migration |
| Canvas/Core/remaining creative features | pending | none | C0 | none | Phase 5/6 feature migration |
| Import/export and data recovery | pending | none | C0 | none | LW-BLK-005 |
| PWA registration/cache/warm offline reload failure | `evidence/phase-1/LW-P1-001/` | none | C2 | none | offline/update and cutover decision |
| PWA update/partial install/multi-tab/rollback | pending | none | C0 | none | offline/update and cutover decision |
| Peer/worker/Telegram | pending | none | C0 | none | LW-BLK-006 |
| Electron/Tauri desktop | pending | none | C0 | none | desktop-strategy decision and Phase 8 |
| Mobile Garden viewport | `evidence/phase-1/LW-P1-001/artifacts/mobile/mobile-overlap.json` | none | C2 | none | relevant feature migration |
| Accessibility | `evidence/phase-4/LW-P4-CHAR-001/` | none | C0 | none | keyboard/forced-colors/reduced-motion runtime semantics captured, but primary Chat live-region contract remains UNKNOWN |
| Signal Report open/copy and unsent-input exclusion | `evidence/phase-1/LW-P1-001/` | none | C2 | none | Phase 4 diagnostics migration |
| General failure and recovery | pending | none | C0 | none | feature migration and release gates |

Levels follow `docs/COMPATIBILITY.md`. A candidate build does not advance a row without shared-fixture behavior evidence.
