# Baseline Data Inventory

**Status:** PHASE 0 NAMES FROZEN — SCHEMA CHARACTERIZATION CONTINUES

| ID | Store or surface | Technology | Known contents | Sensitivity | Migration rule | Evidence |
|---|---|---|---|---|---|---|
| `DATA-001` | Browser durable stores | IndexedDB | 17 databases and 24 object stores created in one fresh browser run; schemas/indexes/retention remain UNKNOWN | High | Preserve unknown stores/records/fields | `evidence/phase-0/LW-P0-003-browser/runtime-probe/stdout.log` |
| `DATA-002` | Browser key/value state | localStorage | 194 literal names; configuration, feature, provider, identity, memory, and credential hints | High | Preserve every unknown key/value and semantics | `evidence/phase-0/LW-M0-INV-001/storage-identifiers.csv` |
| `DATA-003` | Ephemeral browser state | sessionStorage | Two literal/prefix keys statically extracted | Medium | No silent persistence change | `evidence/phase-0/LW-M0-INV-001/storage-identifiers.csv` |
| `DATA-004` | Imports/exports | browser files/JSON/text | Source paths observed; schemas and hostile-input behavior UNKNOWN | High | Version, validate, round-trip, rollback | `evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.json` |
| `DATA-005` | Desktop files/settings | Electron/Tauri platform stores | `electron-store`, platform-directory and filesystem paths; runtime behavior UNKNOWN | High | Canonicalize paths; backup-first | `evidence/phase-0/LW-M0-INV-001/entrypoint-evidence.json` |
| `DATA-006` | Service-worker caches | Cache Storage | App shell and versioned assets; cache `freelattice-v5.79.22` observed | High | Interruption-safe upgrade and prior-shell rollback | `evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.md` |
| `DATA-007` | Peer/worker/Telegram data | network payloads and remote stores | Source boundaries observed; message schemas/deployment UNKNOWN | High | Authenticated, consented, versioned | `evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.json` |

The static and runtime name inventories are reproducible. The runtime receipt
also proves first-load mutation before onboarding completion. Owner, sensitivity,
retention, indexes, record schema, export/delete, interruption, and migration
evidence remain the Phase 3 decision and verification gate before storage
implementation. Phase 2 intentionally created no durable browser state.

The machine-readable
[`DATA_PRESERVATION_REGISTRY.json`](DATA_PRESERVATION_REGISTRY.json) groups every
unique statically extracted identifier and every database/store name observed in
the bounded Chrome runtime probe. Each unresolved row is explicitly
unknown-preserve, treats sensitivity as high until characterized, and requires
owner approval before removal. That registry freezes names; it does not claim
that schemas, values, owners, retention, or full reachability are known.
