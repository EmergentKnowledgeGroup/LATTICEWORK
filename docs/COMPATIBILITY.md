<!-- Status: LIVING | Owner: Compatibility lead -->

# Compatibility Contract

## Status

`DISCOVERY — NO DROP-IN CLAIM`

LATTICEWORK must not be described as a drop-in replacement until the required levels below are satisfied.

## Compatibility levels

| Level | Meaning |
|---|---|
| `C0 — Uncharacterized` | Behavior has not been reliably observed |
| `C1 — Observed` | Upstream behavior has been reproduced and recorded |
| `C2 — Characterized` | Fixtures or tests capture the behavior |
| `C3 — Implemented` | LATTICEWORK implements the target behavior |
| `C4 — Verified` | Behavior passes clean-room comparison |
| `D — Diverged` | Difference is intentional and documented |
| `N — Not supported` | Explicitly outside current scope |

## Compatibility surfaces

| Surface | Upstream reference | Level | LATTICEWORK evidence | Notes |
|---|---|---:|---|---|
| HTTP launch, first run, and skip | `docs/app.html` | `C2` | [Phase 1 summary](../reengineering/evidence/phase-1/LW-P1-001/summary.json) | Pinned Chromium fixture against the immutable baseline; provider setup is not exercised |
| Edge and direct-file launch | `index.html`, `app.html`, `docs/app.html`, start scripts | `C1` | [Phase 0 browser receipt](../reengineering/evidence/phase-0/LW-P0-003-browser/README.md) | Bounded first-render observations only |
| Local model connection | Ollama, LM Studio, custom OpenAI-compatible source paths | `C2` | [Phase 4 amended summary](../reengineering/evidence/phase-4/LW-P4-RETEST-001/summary.json) | Synthetic exact-Ollama caller behavior and timed fragmentation are characterized; no real provider was contacted |
| Cloud provider connection | provider definitions in primary runtime | `D / C0` | [Phase 4 amended summary](../reengineering/evidence/phase-4/LW-P4-RETEST-001/summary.json) | OpenAI-to-Groq dispatch is an accepted baseline divergence; real-provider compatibility remains untested |
| Chat shell | primary runtime Chat panel | `C2` | [Phase 1 summary](../reengineering/evidence/phase-1/LW-P1-001/summary.json) | Shell and unsent-input privacy boundary only |
| Chat send, stream, cancel, and retry | primary runtime chat/send globals | `D / C2` | [Phase 4 amended summary](../reengineering/evidence/phase-4/LW-P4-RETEST-001/summary.json) | Stream/order/navigation behavior is characterized; missing visible cancellation is an accepted divergence; candidate proof remains |
| Conversation persistence | IndexedDB/localStorage call sites | `C0` | [storage inventory](../reengineering/evidence/phase-0/LW-M0-INV-001/storage-identifiers.csv) | Schema, retention, and recovery unverified |
| Fresh storage initialization shape | localStorage, service worker/cache, IndexedDB databases and stores | `C2` | [runtime snapshot](../reengineering/evidence/phase-1/LW-P1-001/artifacts/shell-and-storage/runtime-snapshot.json) | Names/versions/stores only; values, retention, migration, and recovery remain unverified |
| Identity or continuity behavior | identity, key, Merkle, Garden/Core source paths | `C0` | [security map](../reengineering/SECURITY_BOUNDARY_MAP.md) | Cryptographic semantics unverified |
| Canvas and vision workflows | Chalkboard/canvas/vision routes and panels | `C0` | [behavior JSON](../reengineering/evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.json) | Reachability and GPU cleanup unverified |
| Garden boot/render | Garden modules/panels | `C2` | [Phase 1 summary](../reengineering/evidence/phase-1/LW-P1-001/summary.json) | Skip-to-Garden boot/render fixture; interaction/lifecycle incomplete |
| Garden no-WebGPU fallback | Garden modules/panels | `C2` | [degraded-GPU artifact](../reengineering/evidence/phase-1/LW-P1-001/artifacts/degraded-gpu/garden-no-webgpu.png) | Garden/canvases render without `navigator.gpu`; no explicit user notice was observed |
| Core and Merkle behavior | Core/integrity source paths | `C0` | [security map](../reengineering/SECURITY_BOUNDARY_MAP.md) | Terminology and integrity contract unresolved |
| Skill or workflow sharing | skills, Workshop, GitHub source paths | `C0` | [boundary map](../reengineering/evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.md) | External mutations not exercised |
| Peer-to-peer networking | PeerJS/WebRTC/mesh/LAN source paths | `C0` | [boundary map](../reengineering/evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.md) | Consent/auth/failure behavior unknown |
| Service-worker registration/cache and warm offline reload | `sw.js`, `docs/sw.js`, manifests | `C2` | [Phase 1 summary](../reengineering/evidence/phase-1/LW-P1-001/summary.json) | Active worker/cache plus the reproducible `ERR_INTERNET_DISCONNECTED` reload failure; update/rollback incomplete |
| Import and export | file, backup, restore source paths | `C0` | [behavior JSON](../reengineering/evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.json) | Formats and malformed-input behavior unverified |
| Stored-data migration | legacy plaintext/encrypted credential and store paths | `C0` | [data inventory](../reengineering/DATA_INVENTORY.md) | No candidate migration exists |
| Mobile Garden behavior | Garden at 390 × 844 | `C2` | [geometry receipt](../reengineering/evidence/phase-1/LW-P1-001/artifacts/mobile/mobile-overlap.json) | One Chromium viewport; the `✦ Presence` role button overlaps the Garden title |
| Accessibility | semantic/control source hints | `C2` | [Phase 4 amended summary](../reengineering/evidence/phase-4/LW-P4-RETEST-001/summary.json) | Keyboard order, accessible names, forced-colors, and reduced-motion behavior are characterized; absent input label/live region are observed upstream behavior |
| Signal Report open/copy | Chat diagnostics modal and clipboard action | `C2` | [Phase 1 summary](../reengineering/evidence/phase-1/LW-P1-001/summary.json) | Synthetic unsent text is excluded from the report; broader failure/recovery remains uncharacterized |

C1 and C2 rows are narrowly bounded browser paths. They are not full capability
characterization and do not support a replacement or drop-in claim.
The Phase 1 network-denial gate proves fixture isolation, not provider
compatibility; real provider connection semantics remain C0.

## Phase 4 primary-Chat characterization result

**MEASURED:** `LW-P4-CHAR-001` executed all 39 locked atomic subcases against
the immutable baseline with one run-owned synthetic Chromium profile per case,
one worker, zero retries, exact in-browser provider interception, and denied
external egress. The result is `20 PASS`, `16 UNKNOWN`, `3 FAIL`, and
`0 CONDITIONAL`.

The immutable original bundle remains the blocked historical receipt. The
accepted amendment documents eight confirmed baseline defects as divergences
and retests the remaining eleven observations without rewriting any original
status or hash.

**VERIFIED:** `LW-P4-RETEST-001` completes at `31 PASS`,
`8 ACCEPTED_DIVERGENCE`, and `0 BLOCKED`. The run-owned synthetic stream
fixture was exact-loopback, OS-port-selected, no-egress, and fully torn down.
Independent clean-worktree QA reproduced the same result. This advances only
the narrowly named C2 rows above; it does not establish real-provider
compatibility or authorize candidate implementation, activation, deployment,
or cutover.

## Candidate-only foundation evidence

**VERIFIED:** `LW-P2-001` provides a feature-free status shell, lifecycle
kernel, and typed contracts at candidate commit
`7e928bba605e0309273989bf8fd1303d2a822923`. Canonical and independent browser
gates cover its desktop, 390 x 844 mobile, keyboard, reduced-motion,
forced-colors, no-egress, no-storage, and no-service-worker profiles.

This is architecture-foundation evidence, not an upstream compatibility
surface. It changes none of the C0-C2 levels above and does not establish a
legacy feature, route, provider, storage, accessibility, or release-parity
claim. Evidence:
[`LW-P2-001`](../reengineering/evidence/phase-2/LW-P2-001/README.md) and
[`independent review`](../reengineering/evidence/phase-2/LW-P2-001/independent-review/REVIEW.md).

## Phase 3 bounded implementation evidence

**OBSERVED:** ADR-004 through ADR-006 are accepted with the maintainer receipt
`approved choices - continue`. `LW-P3-DEC-001` defines candidate storage,
provider, provenance, and optional-proxy contracts. Its validator proves that
all 252 preservation rows remain
the pinned minimum of unknown-preserve obligations while allowing additive
inventory expansion, the affected blockers remain open, and no
real-data, credential, listener, legacy-integration, activation, or cutover
authority is recorded. Only the exact synthetic/mock `LW-P3-001` preflight
surface is implementation-authorized.

**VERIFIED:** the bounded candidate
`d746b96225a3eaf59a5b5937e3f531e2cad280ef` passes strict
typecheck; 26 storage tests; 19 provider tests; six storage/provider boundary
tests; ten evidence-validator tests; and five native Chromium IndexedDB
scenarios. The tests use generated synthetic records and deterministic
in-process mocks only. They cover copy-on-write checkpoint/resume/rollback,
native unknown-value preservation, hostile import staging, blocked/quota
failure, exact egress/credential binding, normalized terminal streams,
retry/deadline/cancellation, content-free provenance, and zero external
provider capability. All 12 frozen gates are represented in the
[canonical summary](../reengineering/evidence/phase-3/LW-P3-001/summary.json)
and [manifest](../reengineering/evidence/phase-3/LW-P3-001/manifest.json);
the [independent review](../reengineering/evidence/phase-3/LW-P3-001/independent-review/REVIEW.md)
is GREEN.

This is architecture-contract evidence, not legacy compatibility evidence. It
changes no compatibility level in the table above. Real conversation values,
provider protocols, persisted Chat effects, legacy import/export formats, and
local proxy behavior remain `C0`. No candidate package is registered into the
application, and no route, read owner, provider selection, or feature behavior
has changed.

## Phase 4 non-default primary-Chat candidate

**VERIFIED:** `/p4.html` exercises a synthetic-only Chat controller through the
accepted candidate repository and two deterministic in-process provider
shapes. Canonical and clean detached-worktree evidence at
`cb94b608a7b0c552154ec01a44bda9fa1ea28ec1` proves:

- sequential user/assistant turns append and survive a warm online reload;
- user content persists before provider dispatch;
- assistant fragments persist only after `completed`;
- overlapping send/send and send/hydrate operations cannot replace newer
  candidate state with a stale read;
- repository read/write failures settle with sanitized `not-saved` metadata;
- pre-dispatch and post-delta cancellation never retain partial assistant
  content;
- failure/cancellation receipts contain safe metadata, not prompt/response
  text;
- retry and fallback counts remain zero;
- mock-local and mock-cloud selection, mobile layout, keyboard order,
  forced-colors, reduced-motion, redacted diagnostics, and unchanged `/`
  behavior pass the active browser harness.

This is not a compatibility upgrade for the legacy Chat surface. It uses no
real conversation records, provider protocols, credentials, migration,
service worker, listener, activation, deployment, or cutover. Warm offline
reload remains unclaimed because the accepted packet authorizes no service
worker. The eight accepted upstream defects remain documented divergences, not
silently redefined behavior.

## Compatibility rules

- Preserve user-visible semantics, not implementation accidents, unless an accident became relied-upon behavior.
- Document bug fixes as divergences when they change observable behavior.
- Never silently reinterpret stored data.
- Compare failure behavior, not only success paths.
- Record unsupported surfaces honestly.
- Compatibility scope may be narrower than upstream scope during pre-release stages.

## Evidence required for C4

- Pinned upstream and LATTICEWORK commits.
- Same fixture or test inputs.
- Same environment where practical.
- Captured outputs.
- Storage and network effects.
- Independent reproduction.
- Accepted result in the claims ledger.
