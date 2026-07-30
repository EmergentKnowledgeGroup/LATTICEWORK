# Baseline Behavior Inventory

**Status:** DISCOVERY
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`

| ID | Surface | Current evidence | State | Next receipt |
|---|---|---|---|---|
| `BEH-LAUNCH-001` | Direct `file://` launch | Advertised/implemented paths require characterization | UNKNOWN | browser trace |
| `BEH-LAUNCH-002` | Static HTTP hosting | `docs/` deployment and static servers observed | OBSERVED | clean launch trace |
| `BEH-LAUNCH-003` | PWA install/offline restart | service workers observed | OBSERVED | install/update/offline trace |
| `BEH-LAUNCH-004` | Local HTTP gateway and LAN access | Node/Python servers observed | OBSERVED | bind/auth/network trace |
| `BEH-LAUNCH-005` | Electron desktop | package and executable surface observed | OBSERVED | build/launch/security trace |
| `BEH-LAUNCH-006` | Tauri desktop | Rust manifest and source observed | OBSERVED | build/launch/security trace |
| `BEH-PROVIDER-001` | Ollama/local inference | browser and proxy paths observed | OBSERVED | model-discovery/chat fixture |
| `BEH-PROVIDER-002` | Cloud providers | multiple provider URLs/credential paths require mapping | OBSERVED | adapter/network fixtures |
| `BEH-CHAT-001` | Chat streaming/cancel/retry | smoke assertions exist; runtime semantics uncharacterized | UNKNOWN | browser/network/storage fixture |
| `BEH-DATA-001` | Conversation persistence | IndexedDB/localStorage calls observed | OBSERVED | schema/export/restore fixture |
| `BEH-CONT-001` | Identity, memory, continuity, Garden, Core | advertised and source-visible | OBSERVED | per-feature fixtures |
| `BEH-CREATIVE-001` | Chalkboard/canvas/vision | source-visible | OBSERVED | desktop/mobile/GPU trace |
| `BEH-SHARE-001` | Peer/sync/workers/Telegram | optional network surfaces observed | OBSERVED | consent/auth/failure tests |
| `BEH-RECOVERY-001` | import/export/failure/recovery | source-visible but not characterized | UNKNOWN | corrupt/partial/offline fixtures |

Evidence links are added only after Phase 0 artifacts are generated.
