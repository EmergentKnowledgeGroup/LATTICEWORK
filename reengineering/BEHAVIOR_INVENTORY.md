# Baseline Behavior Inventory

**Status:** BOUNDED PHASE 0/1 EVIDENCE FROZEN; CHARACTERIZATION CONTINUES
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`

| ID | Surface | Current evidence | State | Next receipt |
|---|---|---|---|---|
| `BEH-LAUNCH-001` | Direct `file://` launch | One isolated first-render trace in `evidence/phase-0/LW-P0-003-browser/` | C1 | complete direct-file workflow fixture |
| `BEH-LAUNCH-002` | Static HTTP hosting | First run/skip characterized in `evidence/phase-1/LW-P1-001/` | C2 | provider-connected launch fixture |
| `BEH-LAUNCH-003` | PWA install/offline restart | Active worker/cache and warm-reload failure characterized in `evidence/phase-1/LW-P1-001/` | C2 | update/partial-install/multi-tab/rollback trace |
| `BEH-LAUNCH-004` | Local HTTP gateway and LAN access | Node/Python servers observed | OBSERVED | bind/auth/network trace |
| `BEH-LAUNCH-005` | Electron desktop | package and executable surface observed | OBSERVED | build/launch/security trace |
| `BEH-LAUNCH-006` | Tauri desktop | Rust manifest and source observed | OBSERVED | build/launch/security trace |
| `BEH-PROVIDER-001` | Ollama/local inference | browser and proxy paths observed | OBSERVED | model-discovery/chat fixture |
| `BEH-PROVIDER-002` | Cloud providers | multiple provider URLs/credential paths require mapping | OBSERVED | adapter/network fixtures |
| `BEH-CHAT-001` | Chat streaming/cancel/retry | Chat shell/Signal Report are C2; send/stream/cancel/retry remain uncharacterized | UNKNOWN | browser/network/storage fixture |
| `BEH-DATA-001` | Conversation persistence | IndexedDB/localStorage calls observed | OBSERVED | schema/export/restore fixture |
| `BEH-CONT-001` | Identity, memory, continuity, Garden, Core | advertised and source-visible | OBSERVED | per-feature fixtures |
| `BEH-CREATIVE-001` | Chalkboard/canvas/vision | source-visible | OBSERVED | desktop/mobile/GPU trace |
| `BEH-SHARE-001` | Peer/sync/workers/Telegram | optional network surfaces observed | OBSERVED | consent/auth/failure tests |
| `BEH-RECOVERY-001` | import/export/failure/recovery | Signal Report open/copy is C2; import/export and general recovery remain uncharacterized | OBSERVED | corrupt/partial/offline fixtures |

Levels and evidence scope are reconciled in `PARITY_MATRIX.md` and
`../docs/COMPATIBILITY.md`. Mixed rows retain the weaker state for their
uncharacterized subflows.
