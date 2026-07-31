<!-- Status: LOCKED / ACCEPTED | Owner: Maintainers | Work: LW-P5-MEM-PREFLIGHT-001 -->

# Phase 5 LatticeMemory characterization preflight

## Control

- **Status:** LOCKED / ACCEPTED
- **Version:** `1.0`
- **Date:** `2026-07-31`
- **Base commit:** `1108fe5d4a73315cbb71574361c4928b84e394da`
- **Immutable baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`
- **Decision receipt:** maintainer directed Codex to follow the canonical spec
  and treat written bounded packets as accepted.
- **Implementation authority:** none in this packet.

## Goal

Characterize one finite deployed legacy module before rewriting it:
`docs/modules/lattice-memory.js`, the privacy-intended pulse medium exposed as
`window.LatticeMemory`. Source claims are not treated as proof; known gaps are
locked as divergence candidates below.

This packet does not characterize Memory Core, Memory Vault, Memory Garden,
conversation summaries, Knowledge Core, Question Corner, Core, export, or
sync. Similar names do not imply common ownership or schema.

## Intended invariant

Valid synthetic pulses are accepted, synchronously fanned out, and best-effort
persisted without exposing the internal key. Invalid or Quiet Room pulses are
rejected without fan-out or durable write. No operation touches any other
browser store or emits external traffic.

## Machine lock

```json
{
  "schema": "latticework.phase5-lattice-memory-preflight.v1",
  "accepted": true,
  "work_id": "LW-P5-MEM-PREFLIGHT-001",
  "characterization_work_id": "LW-P5-MEM-CHAR-001",
  "implementation_work_id": "LW-P5-MEM-001",
  "base_commit": "1108fe5d4a73315cbb71574361c4928b84e394da",
  "phase4_terminal_commit": "1b7e1d10456e0a1e9aaa91df25db17e236bbea3e",
  "baseline_sha": "e7585999fc1af2707f410ae87356cf2b52e08d9c",
  "legacy_module": {
    "path": "docs/modules/lattice-memory.js",
    "git_blob": "c926100255048c39a7f0cd30f2a6945a7f53e8f6",
    "sha256": "6c9a9f0ef9d422698ffaa5d695257c1ead003be6226b32e1cf79e59030006917",
    "hash_basis": "utf8-lf-normalized-git-blob"
  },
  "feature_id": "lattice-memory-pulse-medium",
  "storage": {
    "database": "LatticeMemory",
    "version": 1,
    "store": "pulses",
    "key_path": "_id",
    "auto_increment": true,
    "max_records": 10000,
    "max_pending": 100
  },
  "pulse_contract": {
    "allowed_keys": ["ts", "source", "kind", "summary", "refs"],
    "reserved_sources": ["quiet-room"],
    "max_summary": 80,
    "max_refs": 16,
    "internal_keys_never_exposed": ["_id"]
  },
  "public_api": [
    "commit",
    "subscribe",
    "recent",
    "_internal.isReady",
    "_internal.subscriberCount",
    "_internal.pendingCount",
    "_internal.clear"
  ],
  "required_observation_groups": [
    "schema-and-heartbeat",
    "commit-copy-timestamp-fanout-persistence",
    "filter-and-unsubscribe-matrix",
    "shape-and-content-leak-rejection",
    "quiet-room-fail-closed-matrix",
    "same-millisecond-burst",
    "pre-ready-queue-bound-and-drain",
    "ten-thousand-record-retention",
    "reload-order-filter-and-heartbeat",
    "indexeddb-fail-quiet",
    "public-internal-api-and-loader",
    "storage-and-network-isolation",
    "cleanup-and-content-free-evidence"
  ],
  "required_atomic_observations": [
    "P5-MEM-SCHEMA-001",
    "P5-MEM-HEARTBEAT-001",
    "P5-MEM-COMMIT-001",
    "P5-MEM-COMMIT-002",
    "P5-MEM-COMMIT-003",
    "P5-MEM-COMMIT-004",
    "P5-MEM-COMMIT-005",
    "P5-MEM-COMMIT-006",
    "P5-MEM-COMMIT-007",
    "P5-MEM-COMMIT-008",
    "P5-MEM-FILTER-001",
    "P5-MEM-FILTER-002",
    "P5-MEM-FILTER-003",
    "P5-MEM-FILTER-004",
    "P5-MEM-FILTER-005",
    "P5-MEM-FILTER-006",
    "P5-MEM-FILTER-007",
    "P5-MEM-FILTER-008",
    "P5-MEM-FILTER-009",
    "P5-MEM-VALID-001",
    "P5-MEM-VALID-002",
    "P5-MEM-VALID-003",
    "P5-MEM-VALID-004",
    "P5-MEM-VALID-005",
    "P5-MEM-VALID-006",
    "P5-MEM-VALID-007",
    "P5-MEM-VALID-008",
    "P5-MEM-VALID-009",
    "P5-MEM-VALID-010",
    "P5-MEM-VALID-011",
    "P5-MEM-VALID-012",
    "P5-MEM-VALID-013",
    "P5-MEM-VALID-014",
    "P5-MEM-VALID-015",
    "P5-MEM-VALID-016",
    "P5-MEM-QUIET-001",
    "P5-MEM-QUIET-002",
    "P5-MEM-QUIET-003",
    "P5-MEM-QUIET-004",
    "P5-MEM-QUIET-005",
    "P5-MEM-QUIET-006",
    "P5-MEM-QUIET-007",
    "P5-MEM-BURST-001",
    "P5-MEM-QUEUE-001",
    "P5-MEM-QUEUE-002",
    "P5-MEM-BOUND-001",
    "P5-MEM-RELOAD-001",
    "P5-MEM-RELOAD-002",
    "P5-MEM-FAIL-001",
    "P5-MEM-FAIL-002",
    "P5-MEM-FAIL-003",
    "P5-MEM-FAIL-004",
    "P5-MEM-FAIL-005",
    "P5-MEM-FAIL-006",
    "P5-MEM-API-001",
    "P5-MEM-API-002",
    "P5-MEM-API-003",
    "P5-MEM-API-004",
    "P5-MEM-API-005",
    "P5-MEM-API-006",
    "P5-MEM-API-007",
    "P5-MEM-API-008",
    "P5-MEM-API-009",
    "P5-MEM-API-010",
    "P5-MEM-API-011",
    "P5-MEM-API-012",
    "P5-MEM-API-013",
    "P5-MEM-ISO-001",
    "P5-MEM-CLEAN-001"
  ],
  "atomic_contracts": {
    "P5-MEM-SCHEMA-001": "open LatticeMemory version 1 with pulses keyPath _id and autoIncrement true",
    "P5-MEM-HEARTBEAT-001": "after readiness persist exactly one lattice-memory medium-online heartbeat for the session",
    "P5-MEM-COMMIT-001": "valid commit does not mutate caller and auto-stamps a missing ts",
    "P5-MEM-COMMIT-002": "valid commit fans out synchronously exactly once",
    "P5-MEM-COMMIT-003": "valid commit persists once and recent returns it without _id",
    "P5-MEM-COMMIT-004": "empty string summary is accepted as observed legacy behavior",
    "P5-MEM-COMMIT-005": "falsy timestamp specimens zero false empty string and NaN are replaced with a current numeric timestamp as observed legacy behavior",
    "P5-MEM-COMMIT-006": "truthy nonnumeric timestamp specimens including a string and object are accepted unchanged as observed legacy behavior and recorded as a validation divergence candidate",
    "P5-MEM-COMMIT-007": "commit shallow-copies the top level but retains caller refs aliases while the returned pulse and every subscriber receive the same pulse object as observed legacy behavior and recorded as an integrity divergence candidate",
    "P5-MEM-COMMIT-008": "a subscriber mutation of the shared pulse object is visible to later subscribers in the same synchronous fanout as observed legacy behavior and recorded as an integrity divergence candidate",
    "P5-MEM-FILTER-001": "source filter matches only exact source",
    "P5-MEM-FILTER-002": "kind filter matches only exact kind",
    "P5-MEM-FILTER-003": "sources filter matches only included sources",
    "P5-MEM-FILTER-004": "kinds filter matches only included kinds",
    "P5-MEM-FILTER-005": "unsubscribe prevents later delivery and subscriber count decreases",
    "P5-MEM-FILTER-006": "one throwing subscriber does not block another subscriber or publisher",
    "P5-MEM-FILTER-007": "calling an unsubscribe function more than once is idempotent and leaves subscriber count at zero",
    "P5-MEM-FILTER-008": "a truthy malformed subscriber sources or kinds collection without indexOf makes commit throw during fanout after the pulse was accepted for queue or persistence as observed legacy behavior",
    "P5-MEM-FILTER-009": "a throwing subscriber is passed whole to console.warn including its synthetic private error message as observed legacy behavior and recorded as a privacy divergence candidate while promoted evidence remains redacted",
    "P5-MEM-VALID-001": "non-object pulse is rejected without fanout or persistence",
    "P5-MEM-VALID-002": "every top-level extra-key specimen content text message token and secret is rejected without fanout or persistence",
    "P5-MEM-VALID-003": "missing or empty source is rejected without fanout or persistence",
    "P5-MEM-VALID-004": "reserved quiet-room source is rejected without fanout or persistence",
    "P5-MEM-VALID-005": "missing or empty kind is rejected without fanout or persistence",
    "P5-MEM-VALID-006": "non-string summary is rejected without fanout or persistence",
    "P5-MEM-VALID-007": "summary longer than 80 characters is rejected without fanout or persistence",
    "P5-MEM-VALID-008": "long-quoted two-newline and URL summary specimens are rejected without fanout or persistence",
    "P5-MEM-VALID-009": "non-array refs and more than 16 refs are rejected without fanout or persistence",
    "P5-MEM-VALID-010": "refs missing string store or string id are rejected without fanout or persistence",
    "P5-MEM-VALID-011": "a 5000-character source string is accepted as observed legacy behavior and recorded as a privacy divergence candidate",
    "P5-MEM-VALID-012": "a 5000-character kind string is accepted as observed legacy behavior and recorded as a privacy divergence candidate",
    "P5-MEM-VALID-013": "a 5000-character ref store string is accepted as observed legacy behavior and recorded as a privacy divergence candidate",
    "P5-MEM-VALID-014": "a 5000-character ref id string is accepted as observed legacy behavior and recorded as a privacy divergence candidate",
    "P5-MEM-VALID-015": "a ref object with valid store and id plus a nested content extra key is accepted and persisted unchanged as observed legacy behavior and recorded as a privacy divergence candidate",
    "P5-MEM-VALID-016": "a rejected top-level forbidden-key pulse is passed whole to console.warn including its synthetic private sentinel as observed legacy behavior and recorded as a privacy divergence candidate while promoted evidence remains content-free",
    "P5-MEM-QUIET-001": "missing QuietRoom module permits an otherwise valid pulse",
    "P5-MEM-QUIET-002": "active QuietRoom suppresses commit before validation fanout and persistence",
    "P5-MEM-QUIET-003": "loaded QuietRoom without isActive suppresses fail-closed",
    "P5-MEM-QUIET-004": "throwing QuietRoom isActive suppresses fail-closed",
    "P5-MEM-QUIET-005": "loaded inactive QuietRoom permits an otherwise valid pulse",
    "P5-MEM-QUIET-006": "active QuietRoom still permits subscribe and increments subscriber count as an observed privacy divergence candidate",
    "P5-MEM-QUIET-007": "active QuietRoom still permits recent to return previously persisted pulses as an observed privacy divergence candidate",
    "P5-MEM-BURST-001": "same-millisecond burst preserves every pulse with distinct internal keys",
    "P5-MEM-QUEUE-001": "pre-ready accepted commits fan out immediately and drain to disk once after open",
    "P5-MEM-QUEUE-002": "more than 100 pre-ready commits retain only the newest 100 pending entries",
    "P5-MEM-BOUND-001": "after bound enforcement settles more than 10000 writes retain exactly the newest 10000",
    "P5-MEM-RELOAD-001": "reload preserves prior pulses ordered by descending ts without exposing _id",
    "P5-MEM-RELOAD-002": "reload adds exactly one new session heartbeat",
    "P5-MEM-FAIL-001": "IndexedDB open failure settles without uncaught error and leaves no durable write",
    "P5-MEM-FAIL-002": "IndexedDB add failure is fail-quiet while commit still returns in-session success and fanout",
    "P5-MEM-FAIL-003": "IndexedDB recent read failure resolves to an empty array without uncaught error",
    "P5-MEM-FAIL-004": "an IndexedDB open request that only becomes blocked remains not-ready and unresolved within the bounded observation window",
    "P5-MEM-FAIL-005": "a pre-existing version-1 LatticeMemory database without the pulses store is not repaired and writes fail quiet",
    "P5-MEM-FAIL-006": "after IndexedDB open resolves false the public LatticeMemoryReady marker becomes true while _internal.isReady remains false and the medium-online heartbeat remains pending as observed legacy behavior",
    "P5-MEM-API-001": "subscribe with a non-function handler returns null and leaves subscriber count unchanged",
    "P5-MEM-API-002": "_internal.isReady and window.LatticeMemoryReady transition to true after successful open",
    "P5-MEM-API-003": "_internal.pendingCount reports bounded pre-ready queue length and returns to zero after drain",
    "P5-MEM-API-004": "_internal.clear succeeds and removes only pulse records",
    "P5-MEM-API-005": "_internal.clear returns no-db when no database connection exists",
    "P5-MEM-API-006": "_internal.clear returns tx-error or threw on transaction failure without uncaught error",
    "P5-MEM-API-007": "FreeLatticeLoader registration receives LatticeMemory and the exact public API once when present and absence is fail-quiet",
    "P5-MEM-API-008": "recent defaults n to 100 when omitted nonnumeric or nonpositive and a positive n truncates the descending result",
    "P5-MEM-API-009": "recent applies source kind sources and kinds filters with AND semantics",
    "P5-MEM-API-010": "recent with a truthy malformed sources or kinds collection without indexOf produces an uncaught callback error and remains unresolved within the bounded observation window as observed legacy behavior",
    "P5-MEM-API-011": "_internal.clear removes persisted pulse rows without resetting readiness pending subscriber or subscription-id state",
    "P5-MEM-API-012": "FreeLatticeLoader with a missing non-callable or throwing register member is fail-quiet and still exposes the exact public API",
    "P5-MEM-API-013": "a throwing FreeLatticeLoader register getter escapes synchronously after the exact public API is exposed because property access occurs outside the registration try block as observed legacy behavior",
    "P5-MEM-ISO-001": "no other database Web Storage Cache Storage route or external transmission changes",
    "P5-MEM-CLEAN-001": "profile and run roots are deleted and promoted evidence contains no pulse content or credential sentinel"
  },
  "browser_contract": {
    "channel": "chrome",
    "workers": 1,
    "retries": 0,
    "fresh_profile_per_scenario": true,
    "profile_root": "runtime/tmp/phase5-lattice-memory/profiles",
    "run_root": "runtime/tmp/phase5-lattice-memory",
    "external_http_denied": true,
    "websocket_denied": true,
    "realtime_denied": true,
    "beacon_denied": true
  },
  "fixture_listener": {
    "kind": "static-baseline-only",
    "bind": "127.0.0.1",
    "requested_port": 0,
    "os_selected_port": true,
    "run_owned": true,
    "synthetic_only": true,
    "close_required": true,
    "external_egress": false
  },
  "required_gates": [
    "phase5-active-scope",
    "immutable-source",
    "browser-characterization",
    "storage-isolation",
    "network-denial",
    "content-free-scan",
    "artifact-manifest",
    "independent-clean-worktree",
    "repository-controls",
    "hygiene"
  ],
  "characterization_owned_exact_paths": [
    "docs/agents/claims/LW-P5-MEM-CHAR-001.md",
    "docs/agents/handoffs/LW-P5-MEM-CHAR-001.md",
    "reengineering/BLOCKERBOARD.md",
    "reengineering/EXECUTION_CHECKLIST.md",
    "reengineering/checkpoints/LATEST.json",
    "reengineering/checkpoints/LATEST.md",
    "runtime/checkpoints/LATEST.json",
    "runtime/checkpoints/LATEST.md",
    "tests/characterization/fixtures/phase5-lattice-memory-contract.json",
    "tests/characterization/phase5-lattice-memory.playwright.config.mjs",
    "tests/characterization/specs/phase5-lattice-memory.spec.mjs",
    "tests/characterization/support/phase5-lattice-memory.mjs",
    "tests/reengineering/phase5-active-scope.test.mjs",
    "tests/reengineering/phase5-lattice-memory-characterization-validation.test.mjs",
    "tools/reengineering/run-phase5-lattice-memory-characterization.ps1",
    "tools/reengineering/validate-phase5-active-scope.mjs",
    "tools/reengineering/validate-phase5-lattice-memory-characterization.mjs"
  ],
  "characterization_owned_prefixes": [
    "reengineering/evidence/phase-5/LW-P5-MEM-CHAR-001/"
  ],
  "protected_exact_paths": [
    "docs/modules/lattice-memory.js",
    "docs/app.html",
    "index.html",
    "app.html",
    "tests/smoke.js",
    "package.json",
    "package-lock.json"
  ],
  "protected_prefixes": [
    "apps/",
    "packages/",
    "modules/",
    "docs/modules/",
    "server/",
    "desktop/",
    "worker/",
    "deployment/",
    "service-worker/",
    "reengineering/evidence/phase-0/",
    "reengineering/evidence/phase-1/",
    "reengineering/evidence/phase-2/",
    "reengineering/evidence/phase-3/",
    "reengineering/evidence/phase-4/"
  ],
  "implementation_authorized": false,
  "real_data_authorized": false,
  "real_credentials_authorized": false,
  "real_provider_traffic_authorized": false,
  "legacy_mutation_authorized": false,
  "candidate_storage_authorized": false,
  "activation_authorized": false,
  "deployment_authorized": false,
  "cutover_authorized": false
}
```

## Required observations

The characterization must execute all 69 atomic IDs. Grouping assertions in
one browser scenario is allowed only when each atomic result retains its own
status and receipt.

Key failure semantics are part of the contract:

- a missing Quiet Room module permits an otherwise valid pulse;
- a loaded module with no accessor, a throwing accessor, or an active room
  suppresses;
- an inactive loaded room permits;
- source, kind, ref store, and ref id are type-checked but unbounded; long
  accepted strings are treated as privacy divergence candidates, not safe
  content channels;
- nested reference objects are not shape-locked, rejected pulses are logged
  whole, and accepted pulse objects retain shallow aliases; all three are
  divergence candidates whose synthetic content must not enter evidence;
- active Quiet Room does not guard `subscribe` or `recent`; those observed
  reads/subscriptions are divergence candidates against the source doctrine;
- rejected pulses do not notify subscribers and do not persist;
- subscriber exceptions do not block other subscribers, but their complete
  error values are passed to `console.warn`; promoted evidence records only a
  redacted error class;
- open/read/write failures settle without uncaught errors;
- a request that only fires `onblocked` does not settle in the observed
  window because the legacy module has no blocked handler;
- a pre-existing version-1 database missing the store is not repaired;
- malformed filter collections can throw during synchronous fan-out or strand
  a `recent` request; this is observed legacy behavior, not desired behavior;
- the queue retains only its newest 100 entries before readiness;
- retention eventually preserves exactly the newest 10,000 records.

## Evidence safety

All pulse summaries and reference IDs are synthetic sentinels. Promoted
evidence stores only case IDs, counts, boolean results, schema metadata, and
redacted error classes. It does not store raw summaries, refs, credentials,
screenshots containing content, browser profiles, or IndexedDB values.

## Stop conditions

Stop without implementation when:

- the immutable module hash drifts;
- any required atomic observation is `FAIL`, `UNKNOWN`, or `SKIP`;
- the legacy module touches a store outside the locked surface;
- external transmission occurs;
- a profile/run root survives cleanup;
- evidence contains a content or credential sentinel;
- independent clean-worktree reproduction is not GREEN.

## Rollback

Delete only additive characterization harness and run-owned synthetic
profiles. Preserve promoted observations. The immutable legacy source and all
user state remain untouched.
