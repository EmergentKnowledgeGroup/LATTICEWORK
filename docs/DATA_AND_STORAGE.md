<!-- Status: LIVING | Owner: Data and migration leads -->

# Data and Storage

## Storage inventory

| Store | Technology | Schema version | Data | Sensitivity | Owner | Export | Delete | Migration |
|---|---|---:|---|---|---|---|---|---|
| 194 literal key names | localStorage | UNKNOWN | feature flags, provider/model configuration, identity/memory/feature state | Mixed; includes high-sensitivity credential/identity hints | Legacy runtime; per-key owners unresolved | Source contains backup/export paths; format unverified | Per-key semantics unverified | Preserve every key and unknown value |
| Two literal/prefix keys | sessionStorage | UNKNOWN | city/open and inbox-style ephemeral state | Medium/UNKNOWN | Legacy runtime | UNKNOWN | Browser/session lifecycle | Preserve semantics until characterized |
| 17 runtime-created DB names | IndexedDB | versions 1 or 3 observed | chat, Garden, evolution, identity, letters, memory, presence, science, skills, wallet, chain, handshakes, Sophia, wall | High | Multiple features; unresolved | Some feature export paths exist | UNKNOWN | Preserve databases, stores, records, and unknown fields |
| 24 runtime-created object stores | IndexedDB object stores | inherited from DB | conversations/messages/meta/memory, Garden, identity, ledger, chain, presence, skills, etc. | High | Multiple features; unresolved | UNKNOWN | UNKNOWN | Preserve; record/index/schema discovery required |
| App shell/version caches | Cache Storage | version strings including `freelattice-v5.79.22` | HTML, modules, assets | High availability/integrity | Service worker | Reinstall/cache lifecycle | activation cleanup | Prior-shell rollback required |
| Electron settings/files | `electron-store` and platform filesystem | UNKNOWN | desktop settings and bundled assets | High/UNKNOWN | Electron shell | UNKNOWN | UNKNOWN | Freeze until ADR-007 |
| Tauri files/settings | platform filesystem | UNKNOWN | desktop settings/files | High/UNKNOWN | Tauri shell | UNKNOWN | UNKNOWN | Freeze until ADR-007 |

Machine-readable static identifiers:
[`reengineering/evidence/phase-0/LW-M0-INV-001/storage-identifiers.csv`](../reengineering/evidence/phase-0/LW-M0-INV-001/storage-identifiers.csv).
Runtime database/store names:
[`reengineering/evidence/phase-0/LW-P0-003-browser/runtime-probe/stdout.log`](../reengineering/evidence/phase-0/LW-P0-003-browser/runtime-probe/stdout.log).
The static extraction undercounted dynamic names; neither receipt establishes
record schemas, indexes, retention, or migration semantics.

**OBSERVED:** one fresh first load created 19 localStorage keys before onboarding
was completed and 22 after “Skip — just explore.” It also initialized 17
IndexedDB databases. First-run storage mutation is therefore an explicit
compatibility surface.

## Required documentation

For each store, document:

- Creation.
- Reads and writes.
- Keys and indexes.
- Retention.
- Deletion.
- Export.
- Backup.
- Corruption detection.
- Recovery.
- Migration.
- Cross-tab behavior.
- Service-worker interaction.
- Cloud or peer transmission.

## API keys

Record:

- Where keys are entered.
- Where keys are stored.
- Whether keys are encrypted at rest.
- Which origin can read them.
- When keys are transmitted.
- How keys are removed.
- How logs avoid exposing them.

**OBSERVED:** source contains encrypted API-key and GitHub-token storage plus
legacy plaintext migration/removal paths. **UNKNOWN:** encryption parameters,
origin/keyring threat model, migration completeness, and deletion behavior have
not been exercised. No credential was captured in Phase 0 evidence.

## Schema policy

- Every durable schema has a version.
- Migrations are explicit and tested.
- Destructive changes require backup.
- Rollback limitations are documented.
- Unknown legacy data must not be silently discarded.
- Import validation treats all files as untrusted.

## Data compatibility

Link every preserved or changed upstream data format to `COMPATIBILITY.md` and `DIVERGENCES.md`.

No LATTICEWORK real-data migration or activation is implemented or authorized.
ADR-004 is accepted only for the exact synthetic `LW-P3-001` fixture surface.

## Phase 3 accepted synthetic slice

**OBSERVED:** the 252-row preservation registry is a name-level safety floor,
not a complete schema catalog:

- computed database/key names can escape literal extraction;
- a fresh run observed 17 databases and 24 object stores while static
  extraction found additional names;
- every row still has unknown owner, schema, retention, and removal
  disposition;
- the legacy generic backup covers fewer databases than the runtime probe,
  exports all localStorage including credential/crypto-adjacent values, and
  has no atomic restore or rollback proof.

**OBSERVED:** accepted ADR-004 uses per-dataset descriptors and a separate namespaced
candidate repository. Migration is adjacent-version, copy-on-write, journaled,
idempotent, resumable, and interruption-safe. The first bounded fixture is
synthetic `FreeLatticeDB` v3 conversation data. Unknown stores, fields, nested
values, falsey values, and native structured-clone values must round-trip
without coercion.

This accepted bounded slice does not authorize reading or modifying real user data, changing
a legacy version/store/key, importing an untrusted file into live state, or
activating the candidate copy. See
[`PHASE3_DECISION_PACKET.md`](../reengineering/PHASE3_DECISION_PACKET.md).
