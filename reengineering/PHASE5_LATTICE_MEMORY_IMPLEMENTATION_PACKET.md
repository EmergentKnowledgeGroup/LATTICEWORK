<!-- Status: ACCEPTED AFTER INDEPENDENT GREEN | Owner: Maintainers | Work: LW-P5-MEM-IMPL-PREFLIGHT-001 -->

# Phase 5 LatticeMemory corrected implementation packet

## Control

- **Packet:** `LW-P5-MEM-IMPL-PREFLIGHT-001`
- **Pinned implementation base:** `ac45408307e91ee8d850c24753ce6b4d6e903f12`
- **Required prior evidence:** `LW-P5-MEM-CHAR-001` is GREEN with 69/69 atoms,
  53 `MATCH`, and 16 `ACCEPTED_DIVERGENCE_CANDIDATE` dispositions.
- **Authority timing:** the future implementation is authorized only after this
  exact packet has an independent GREEN review. This work unit creates no
  candidate source, storage, runtime registration, or data.

## Intended invariant

The future candidate is a package-only, synthetic/disposable pulse medium. It
owns exactly dataset descriptor `pulse-medium`, schema `1`, candidate database
`latticework::pulse-medium`, and store `pulses`. It exposes no browser global,
route, UI, default entry, listener, or activation surface.

Every accepted match remains a compatibility obligation. Every legacy
divergence below is corrected deliberately, with no hidden compatibility claim
about real records or the legacy `LatticeMemory` database.

## Corrected behavior contract

- `commit` accepts only the characterized safe pulse shape; a missing timestamp
  receives `Date.now()` and an explicit timestamp must be finite numeric.
  `NaN`, infinity, strings, objects, `false`, and empty strings are rejected.
- Inputs, returns, subscriber deliveries, pending entries, persistence values,
  and `recent` results are deep-cloned immutable snapshots: no caller alias,
  cross-subscriber mutation, nested-ref alias, or internal `_id` leaks.
- `subscribe` throws a typed `TypeError` synchronously for an invalid handler or
  filter. `recent` rejects with a typed `TypeError` for an invalid filter.
  Filters use exact AND semantics when valid.
- An active, unavailable, malformed, or throwing QuietRoom is fail-closed.
  While it is active, `subscribe` returns a noop unsubscribe without retaining a
  subscriber and `recent` resolves to `[]`; `commit` performs no fan-out/write.
- Diagnostics contain only a stable error code/class and operation metadata.
  No error message, pulse, reference, summary, credential, or sentinel is
  logged, returned, or persisted as diagnostics.

## Machine lock

```json
{
  "schema": "latticework.phase5-lattice-memory-implementation-packet.v1",
  "packet_id": "LW-P5-MEM-IMPL-PREFLIGHT-001",
  "accepted": true,
  "implementation_base_sha": "ac45408307e91ee8d850c24753ce6b4d6e903f12",
  "characterization_work_id": "LW-P5-MEM-CHAR-001",
  "characterization_status": "GREEN",
  "characterization_result_count": 69,
  "preserved_match_count": 53,
  "corrected_divergence_count": 16,
  "implementation_authorized": true,
  "implementation_authorization_gate": "independent-green",
  "candidate_runtime_source_present": false,
  "package_only_api": true,
  "dataset_descriptor": {
    "id": "pulse-medium",
    "schema_version": 1,
    "candidate_database": "latticework::pulse-medium",
    "store": "pulses",
    "synthetic_only": true,
    "disposable_storage": true,
    "sensitivity": "synthetic-fixture-only",
    "retention": "bounded-newest-10000-disposable",
    "source": { "origin": "generated-synthetic-only", "legacy_read_authorized": false },
    "target": { "key_path": "_id", "auto_increment": true, "indexes": [], "codec": "PulseMediumV1SyntheticCodec" },
    "backup_export_restore_purge_rollback": "not-authorized",
    "corruption_quota_blocked": "fail-quiet-no-write",
    "future_schema": "abstain-no-write"
  },
  "candidate_storage_authorized": true,
  "candidate_storage_synthetic_only": true,
  "real_data_authorized": false,
  "real_credentials_authorized": false,
  "real_provider_traffic_authorized": false,
  "migration_authorized": false,
  "import_export_authorized": false,
  "legacy_mutation_authorized": false,
  "activation_authorized": false,
  "deployment_authorized": false,
  "cutover_authorized": false,
  "default_entry_authorized": false,
  "shared_ui_authorized": false,
  "service_worker_authorized": false,
  "listener_authorized": false,
  "worker_authorized": false,
  "peer_lan_proxy_telegram_authorized": false,
  "browser_global_authorized": false,
  "routes_authorized": false,
  "ui_authorized": false,
  "browser_harness_listener": {
    "bind": "127.0.0.1",
    "port_source": "LATTICEWORK_P5_PORT",
    "canonical_port": 5195,
    "independent_port": 5295,
    "run_owned": true,
    "synthetic_only": true,
    "external_egress": false
  },
  "timestamp_contract": {
    "omitted": "now-finite-number",
    "explicit": "finite-number-only",
    "invalid_explicit": "reject"
  },
  "snapshot_contract": "deep-isolated-immutable",
  "invalid_filter_contract": {
    "subscribe": "throw-TypeError-synchronously",
    "recent": "reject-TypeError"
  },
  "active_quiet_room": {
    "commit": "reject-no-fanout-no-write",
    "subscribe": "noop-unsubscribe",
    "recent": "empty-array"
  },
  "diagnostics": "redacted-code-only",
  "preserved_match_atom_ids": [
    "P5-MEM-API-001", "P5-MEM-API-002", "P5-MEM-API-003", "P5-MEM-API-004", "P5-MEM-API-005", "P5-MEM-API-006", "P5-MEM-API-007", "P5-MEM-API-008", "P5-MEM-API-009", "P5-MEM-API-011", "P5-MEM-API-012", "P5-MEM-BOUND-001", "P5-MEM-BURST-001", "P5-MEM-CLEAN-001", "P5-MEM-COMMIT-001", "P5-MEM-COMMIT-002", "P5-MEM-COMMIT-003", "P5-MEM-COMMIT-004", "P5-MEM-COMMIT-005", "P5-MEM-FAIL-001", "P5-MEM-FAIL-002", "P5-MEM-FAIL-003", "P5-MEM-FAIL-004", "P5-MEM-FAIL-005", "P5-MEM-FILTER-001", "P5-MEM-FILTER-002", "P5-MEM-FILTER-003", "P5-MEM-FILTER-004", "P5-MEM-FILTER-005", "P5-MEM-FILTER-006", "P5-MEM-FILTER-007", "P5-MEM-HEARTBEAT-001", "P5-MEM-ISO-001", "P5-MEM-QUEUE-001", "P5-MEM-QUEUE-002", "P5-MEM-QUIET-001", "P5-MEM-QUIET-002", "P5-MEM-QUIET-003", "P5-MEM-QUIET-004", "P5-MEM-QUIET-005", "P5-MEM-RELOAD-001", "P5-MEM-RELOAD-002", "P5-MEM-SCHEMA-001", "P5-MEM-VALID-001", "P5-MEM-VALID-002", "P5-MEM-VALID-003", "P5-MEM-VALID-004", "P5-MEM-VALID-005", "P5-MEM-VALID-006", "P5-MEM-VALID-007", "P5-MEM-VALID-008", "P5-MEM-VALID-009", "P5-MEM-VALID-010"
  ],
  "corrected_divergences": {
    "P5-MEM-API-010": "recent-invalid-filter-rejects-TypeError",
    "P5-MEM-API-013": "loader-absent-no-global-loader-coupling",
    "P5-MEM-COMMIT-006": "explicit-timestamp-finite-number-only",
    "P5-MEM-COMMIT-007": "deep-isolated-immutable-snapshots",
    "P5-MEM-COMMIT-008": "subscriber-mutation-isolated",
    "P5-MEM-FAIL-006": "readiness-state-is-coherent-no-window-marker",
    "P5-MEM-FILTER-008": "commit-invalid-filter-rejected-before-fanout",
    "P5-MEM-FILTER-009": "subscriber-diagnostic-code-only",
    "P5-MEM-QUIET-006": "active-quiet-room-subscribe-noop-unsubscribe",
    "P5-MEM-QUIET-007": "active-quiet-room-recent-empty-array",
    "P5-MEM-VALID-011": "bounded-source-length",
    "P5-MEM-VALID-012": "bounded-kind-length",
    "P5-MEM-VALID-013": "bounded-ref-store-length",
    "P5-MEM-VALID-014": "bounded-ref-id-length",
    "P5-MEM-VALID-015": "refs-deep-shape-validated-no-content-keys",
    "P5-MEM-VALID-016": "rejection-diagnostic-code-only"
  },
  "owned_future_exact_paths": [
    "package.json",
    "package-lock.json",
    "packages/contracts/src/index.ts",
    "packages/contracts/src/lattice-memory.ts",
    "tests/reengineering/phase5-active-scope.test.mjs",
    "tests/reengineering/phase5-lattice-memory-implementation-packet.test.mjs",
    "tests/reengineering/phase5-lattice-memory-implementation-scope.test.mjs",
    "tests/reengineering/phase5-lattice-memory-implementation-evidence.test.mjs",
    "tools/reengineering/validate-phase5-active-scope.mjs",
    "tools/reengineering/validate-phase5-lattice-memory-implementation-scope.mjs",
    "tools/reengineering/validate-phase5-lattice-memory-implementation-evidence.mjs",
    "tools/reengineering/run-phase5-lattice-memory-verification.ps1",
    "reengineering/PHASE5_LATTICE_MEMORY_IMPLEMENTATION_PACKET.md",
    "docs/agents/claims/LW-P5-MEM-IMPL-PREFLIGHT-001.md",
    "docs/agents/handoffs/LW-P5-MEM-IMPL-PREFLIGHT-001.md",
    "docs/agents/claims/LW-P5-MEM-001.md",
    "docs/agents/handoffs/LW-P5-MEM-001.md",
    "PROJECT_STATE.md",
    "docs/ARCHITECTURE.md",
    "docs/COMPATIBILITY.md",
    "docs/TESTING_AND_VERIFICATION.md",
    "reengineering/BLOCKERBOARD.md",
    "reengineering/EXECUTION_CHECKLIST.md",
    "runtime/checkpoints/LATEST.md",
    "runtime/checkpoints/LATEST.json",
    "reengineering/checkpoints/LATEST.md",
    "reengineering/checkpoints/LATEST.json"
  ],
  "owned_future_prefixes": [
    "packages/lattice-memory/",
    "tests/phase5/",
    "reengineering/evidence/phase-5/LW-P5-MEM-IMPL-PREFLIGHT-001/",
    "reengineering/evidence/phase-5/LW-P5-MEM-001/"
  ],
  "protected_exact_paths": [
    "docs/modules/lattice-memory.js",
    "docs/app.html",
    "app.html",
    "index.html",
    "LICENSE",
    "tests/smoke.js"
  ],
  "protected_prefixes": [
    "apps/",
    "packages/chat/",
    "packages/kernel/",
    "packages/providers/",
    "packages/storage/",
    "modules/",
    "docs/modules/",
    "server/",
    "desktop/",
    "worker/",
    "deployment/",
    "service-worker/",
    "tests/characterization/",
    "reengineering/evidence/phase-0/",
    "reengineering/evidence/phase-1/",
    "reengineering/evidence/phase-2/",
    "reengineering/evidence/phase-3/",
    "reengineering/evidence/phase-4/"
  ]
}
```

## Future implementation boundary

Future source is restricted to the two package surfaces, `tests/phase5/`, and
the exact root workspace bookkeeping in the lock. `packages/contracts/src/`
may change only through its index and LatticeMemory contract file. No `apps/`
path is owned. The candidate receives all platform storage and QuietRoom state
through explicit package contracts; it must not read `window`, `globalThis`,
`document`, browser storage globals, environment credentials, or loader state.

No candidate source exists during this preflight. The validator rejects any
future source use of browser/global/UI/routing, network, listener, worker,
service-worker, peer/LAN/proxy/Telegram, legacy-storage, migration,
import/export, activation, or credential primitives.

## Required future tests

The implementation must add isolated negative tests for every authority flag,
packet drift, CLI override rejection, protected-path independence, and every
forbidden source primitive. Behavior tests must prove the timestamp, snapshot,
filter, QuietRoom, redacted-diagnostic, descriptor, synthetic-disposable
storage, queue, retention, reload, and fail-quiet contracts without real data.

## Stop conditions

Stop before implementation for any real data/credential/provider use; legacy
database access or mutation; migration/import/export; package-to-app wiring;
route/UI/default-entry change; listener/worker/service-worker/peer/LAN/proxy/
Telegram primitive; absent independent GREEN; or a mismatch in the 53/16
characterization disposition set.
