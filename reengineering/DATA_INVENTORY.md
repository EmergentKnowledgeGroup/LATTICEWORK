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

## Phase 3 decision findings

**OBSERVED:**

- The registry is a pinned 252-row minimum, not a completeness claim. Computed
  prefixes such as repository-derived keys and dynamically assembled database
  names can escape literal extraction.
- The fresh runtime created 17 databases and 24 stores, while the legacy
  generic backup names only nine databases.
- Generic backup exports all localStorage, which can include credential,
  device-key, identity, and crypto-adjacent values.
- Generic restore writes localStorage before database restore, guesses unknown
  key paths, swallows some failures, and has no atomic commit or rollback
  receipt.

The immutable baseline ID set is
[`PHASE3_BASELINE_PRESERVATION_IDS.json`](PHASE3_BASELINE_PRESERVATION_IDS.json).
The live registry may only grow from that set; a correct discovery expansion
must not fail merely because the total exceeds 252.

**PROPOSED:** ADR-004 begins with stable dataset ID `conversation`, schema
version 1, and only the `conversations` and `messages` stores from synthetic
`FreeLatticeDB` v3 fixtures. `meta` and `memoryIndex` require separate
descriptors. Hostile imports stage under
`latticework::staging::<operation-id>::<dataset-id>`. Credential, device-key,
identity/crypto, wallet/chain, session-token, cache, desktop, and remote
datasets remain untouched and cannot be emitted by Phase 3 copy/export
writers. Rollback retains a terminal journal receipt.

ADR-004 remains Proposed. No real record has been read, copied, exported,
restored, activated, or deleted by `LW-P3-DEC-001`.
