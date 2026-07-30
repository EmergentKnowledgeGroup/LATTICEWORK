# ADR 0004 — Versioned storage and non-destructive migration

**Status:** Proposed
**Date:** 2026-07-30
**Owners:** Maintainers
**Related work:** `LW-P3-DEC-001`, `LW-P3-001`, `LW-BLK-005`,
`reengineering/DATA_PRESERVATION_REGISTRY.json`,
`reengineering/MIGRATION_LEDGER.md`

**Decision receipt:** **PENDING** — this proposal does not authorize storage
implementation or mutation of any legacy/user store.

## Context

**OBSERVED:** the pinned baseline has 252 preservation-registry rows: 21
IndexedDB database names, five statically observed object-store names, 24
runtime database/store paths, 200 localStorage names, and two sessionStorage
names. One fresh Chrome run created 17 databases and 24 object stores. Every
registry row still has unknown owner, retention, and record schema, is treated
as high sensitivity, and requires preservation of unknown stores, records, and
fields.

**OBSERVED:** the current storage surfaces do not form one schema:

- `FreeLatticeDB` v3 has four stores with different key/index behavior;
- other databases cover identity, memory, Garden, presence, skills, wallet,
  chain, handshakes, and additional feature state;
- Web Storage includes configuration, onboarding, model/provider, credential,
  identity, memory, feature, and session-lifetime values;
- general backup, memory export, encrypted soul, and Memory Vault are distinct
  file formats with different validation and security behavior;
- generic restore infers unknown key paths, merges non-atomically, and has no
  verified rollback;
- the static registry does not yet enumerate every computed prefix or dynamic
  database name.

**OBSERVED:** Phase 2 created no durable browser state and migrated no legacy
record. `MIG-003` remains Critical/Critical. The IndexedDB standard makes
version upgrades exclusive and transaction aborts roll back that database's
upgrade transaction, but a multi-database legacy-to-candidate copy is not one
atomic IndexedDB transaction. LATTICEWORK therefore needs an application-level
journal and reconciliation before it can safely migrate multiple stores.

Primary platform reference:
<https://www.w3.org/TR/IndexedDB/>.

## Decision

Adopt the following storage contract.

### 1. Dataset descriptors are the unit of ownership

No generic migration may infer a schema from arbitrary records. Every candidate
dataset has a checked-in `DatasetDescriptor` defining:

- stable dataset ID and owning package;
- sensitivity and retention class;
- source origin, technology, database/store/key, version, key path,
  auto-increment, and indexes;
- supported source versions and exact adjacent migration steps;
- target database/store/schema and record codec;
- unknown-value preservation policy;
- backup, export, restore, purge, and rollback policy;
- corruption, quota, blocked-upgrade, and future-version behavior.

An unknown or future source version abstains without writing.

### 2. Candidate storage is namespaced and separate

Candidate browser databases use the exact policy
`latticework::<dataset-id>`, where `<dataset-id>` is stable lowercase
kebab-case. A separate `latticework::migration` database owns only migration
journal and catalog records. Candidate code never bumps, renames, clears, or
deletes a legacy database or store.

The first proposed implementation dataset has stable ID `conversation`,
`schemaVersion: 1`, and target database `latticework::conversation`. Its owned
legacy source stores are only `conversations` and `messages`. The synthetic
`FreeLatticeDB` v3 source fixture also characterizes adjacent `meta` and
`memoryIndex` stores, but those stores require separate dataset descriptors and
are not copied by the `conversation` migration. This selection does not
authorize reading real user records.

### 3. Migration is copy-on-write and journaled

Each migration:

1. inventories and validates the source without writes;
2. creates a preflight receipt containing source namespace, versions, schema
   metadata, counts, and privacy-safe integrity metadata without private
   content;
3. writes to the candidate namespace only;
4. records an idempotent journal entry and checkpoint after every bounded
   batch;
5. validates target schema, record counts, referential rules, integrity, and
   candidate boot;
6. marks the candidate copy ready without changing the legacy read owner;
7. permits activation only through a later, separately accepted work claim.

Journal state is one of `planned`, `copying`, `validating`, `ready`, `failed`,
or `rolled-back`. Retrying the same migration ID and privacy-safe source
verification identity cannot duplicate a target record.

### 4. Unknown data survives losslessly

For every record in an explicitly authorized in-scope dataset, the typed
projection and an opaque native structured-clone of the original value are
retained until the dataset has independent round-trip and retirement approval.
Unknown keys, records, fields, nested values, falsey values, array ordering,
binary values, dates, and unrecognized variants within that dataset are not
dropped or normalized away.

Unknown stores and datasets remain legacy-only and untouched. Credentials,
device-derived key material, identity/crypto values, wallet/chain state,
session-only tokens, Cache Storage, desktop state, and remote state cannot be
copied or exported until a separate accepted decision names that dataset and
its privacy contract. A legacy backup codec may parse such a format for
characterization, but Phase 3 cannot emit a credential-bearing legacy backup.
A migration may not relabel “unrecognized” as “unused.”

### 5. Versions are independent

- database structural version controls IndexedDB store/index layout;
- dataset schema version controls the owned record contract;
- export format version controls a portable file envelope;
- application release version is provenance only and cannot substitute for
  any of the above.

Migrations are explicit adjacent steps (`N -> N+1`), idempotent, and tested.
Skipping unimplemented steps or rewriting the meaning of an existing version
is forbidden.

### 6. Import/export is staged and format-specific

Existing formats receive separate legacy codecs. A new LATTICEWORK export
declares format ID, format version, created time, source/candidate versions,
dataset descriptors, counts, integrity records, and redacted provenance.

Import treats files as hostile. It parses and validates into the exact unique
staging policy
`latticework::staging::<operation-id>::<dataset-id>`, rejects unsupported
versions and ambiguous key behavior, and performs no verified promotion or
target activation until the complete file validates. Staging cleanup or
quarantine is journaled. Import never creates arbitrary database/store names
from untrusted input and never guesses a primary key.

Credentials, device-derived key material, identity/crypto values, wallet/chain
state, session-only tokens, Cache Storage, desktop state, and remote state stay
legacy-only until their separate decisions authorize handling. They are
unconditionally excluded from Phase 3 copy/export writers.

### 7. Features use repositories

Migrated features depend on typed repositories injected through contracts.
UI components and feature view code cannot call localStorage, sessionStorage,
IndexedDB, Cache Storage, desktop files, or migration tools directly.

## Invariants

- Legacy storage remains authoritative and byte/structured-clone untouched
  during Phase 3.
- All 252 baseline registry rows and every newly discovered row remain
  preservation obligations.
- Migration is backup-first or copy-on-write, idempotent, resumable, and
  interruption-safe.
- Unknown records and fields in an authorized in-scope dataset survive every
  copy, export, restore, and rollback; excluded datasets remain untouched and
  unexported.
- Real user data and secrets never enter committed fixtures or evidence.
- Failed validation leaves legacy behavior runnable and candidate data inactive.
- Destructive cleanup requires a separate owner authorization naming the
  affected dataset IDs.
- Cache/service-worker, desktop, remote, provider, identity, cryptographic, and
  wallet semantics remain separately gated.

## Alternatives considered

### Upgrade each legacy database in place

**Benefits**

- Avoids duplicate storage.
- Uses native IndexedDB versionchange transactions.

**Costs and risks**

- Unknown schemas and cross-database behavior make rollback unsafe.
- An upgrade can block on other tabs and cannot atomically cover all databases.
- A candidate defect could make the legacy runtime unable to reopen its store.

### One generic target store with inferred schemas

**Benefits**

- Fast to implement.
- Fewer target databases and adapters.

**Costs and risks**

- Repeats the current restore path's unsafe key/schema guessing.
- Hides ownership and query/index semantics.
- Encourages unknown-field loss under a generic JSON projection.

### Per-dataset, namespaced copy-on-write repositories

**Benefits**

- Makes owner, schema, migration, and rollback explicit.
- Leaves legacy data runnable.
- Allows one independently verified dataset at a time.

**Costs and risks**

- Temporarily duplicates data.
- Requires a journal and cross-database reconciliation.
- Does not offer atomic transactions across datasets.

## Consequences

### Positive

- Data loss cannot be hidden behind structural cleanup.
- Feature packages gain stable repository seams.
- Migration, export, restore, and rollback become independently testable.
- Unknown legacy data remains available for later characterization.

### Negative

- Storage usage increases during coexistence.
- Dataset descriptors and fixtures require deliberate maintenance.
- Cutover remains slower than an in-place rewrite.

### Unknown

- Complete record schemas, values, key paths, indexes, and origin partitioning.
- Quota impact for real datasets.
- Which legacy import/export quirks are relied-upon behavior.
- Exact handling of binary values and very large attachments.

## Compatibility impact

Acceptance alone changes no compatibility level. Phase 3 mocks and synthetic
fixtures cannot prove user-data compatibility. Each dataset requires the same
legacy/candidate fixture, storage effects, failure behavior, and independent
reproduction before C4 can be proposed.

## Data and migration impact

No data changes at acceptance. After a separate accepted implementation claim,
Phase 3 may create candidate namespaces against synthetic fixtures only.
Reading or migrating real browser data remains blocked until that dataset's
descriptor and fixture evidence are accepted.

## Security and privacy impact

All unknown data is treated as sensitive. Ordinary content-derived hashes are
permitted only for synthetic fixtures. Future real-data verification must use
non-exported keyed verification or opaque local migration IDs; committed or
portable receipts cannot contain a content-derived digest without a separate
privacy decision. Credentials and cryptographic material remain out of scope.
At-rest browser encryption cannot be described as protection from same-origin
script compromise.

## Verification plan

- Expand the registry for computed prefixes, dynamic databases, import/export
  allowlists, key paths, auto-increment, and indexes.
- Use synthetic fixtures with unknown nested fields, Unicode, null/false/zero,
  arrays, dates, blobs, and array buffers where supported.
- Prove fresh, every supported version, future-version abstention, malformed
  data, partial data, blocked upgrade, quota failure, and simultaneous-tab
  behavior.
- Interrupt every migration checkpoint; prove retry, idempotence, and rollback.
- Compare source names, versions, schemas, counts, and integrity before/after;
  source must remain identical.
- Round-trip every in-scope export codec and reject hostile keys, ambiguous key
  paths, unsupported versions, oversized input, and partial writes.
- Run browser verification with external network denied.
- Capture commands, environment, base/candidate SHA, raw output, hashes, and an
  independent clean-worktree reproduction.

## Rollback

Before activation, close every candidate connection and delete or quarantine
only the exact candidate dataset namespace created by the failed operation. The
shared migration database is never deleted. An immutable terminal
`rolled-back` or `discarded` journal receipt retains the operation ID, source
identity, disposition, and timestamps without private content. The untouched
legacy source remains authoritative. After candidate-only writes are possible,
export and reconcile those writes before switching the read owner back. Legacy
deletion is not part of this ADR.

## Review date

Before `LW-P3-001` implementation starts and again before the first real-data
migration or dataset activation.
