# Baseline Security Boundary Map

**Status:** DISCOVERY

| Boundary | Baseline surface | Preliminary risk | Required proof |
|---|---|---|---|
| Browser to local model | direct local endpoints and `/ollama/*` proxies | origin/auth/CORS exposure | bind, origin, auth, replay, size, timeout tests |
| Browser to cloud provider | provider APIs and browser-stored credentials | same-origin script access and secret leakage | credential lifecycle and redaction tests |
| Local gateway to LAN | Node/Python bind behavior | unintended network exposure | loopback default and explicit opt-in tests |
| Electron renderer to host | IPC/preload and `webSecurity` settings | desktop privilege escalation | least-privilege IPC/CSP tests |
| Tauri command to filesystem | path authorization | traversal/symlink ambiguity | canonicalization tests |
| Service worker to application | cache/install/activate/update | stale shell and rollback failure | interruption/multi-tab/offline matrix |
| Browser to peer/mesh | WebRTC or coordination surfaces | consent/auth/replay | signed contract and consent tests |
| Worker/Telegram endpoints | public webhook and sync operations | unauthenticated mutation/abuse | authentication, signature, rate-limit tests |
| Imported data to runtime | file parsing/rendering | schema confusion/XSS/data loss | validation, sanitization, rollback tests |

## Runtime observations

- **OBSERVED:** a fresh Chrome load, before provider configuration, probed nine
  localhost model-service ports plus the same-origin Ollama proxy.
- **OBSERVED:** the same load contacted upstream GitHub for `version.json`; the
  initial trace also captured Cloudflare's trace endpoint.
- **OBSERVED:** first load created browser state before onboarding completion.
- **OBSERVED:** the Signal Report excluded message text but reported zero browser
  errors while the harness had observed failed resource requests.

Receipt: `evidence/phase-0/LW-P0-003-browser/`.

These observations sharpen investigation targets; they are not published
vulnerability findings.

## Phase 3 proposed contracts

**PROPOSED — no runtime boundary changed:**

- ADR-005 separates provider wire adapters, routing/retry/fallback policy,
  credential resolution, and egress policy. One adapter invocation is one wire
  attempt; the router owns zero-default retry. A stable operation ID and unique
  attempt IDs make provenance and replay behavior explicit.
- Credential resolution requires a prior immutable egress grant and an exact
  match across provider, adapter/version, parsed origin, trust class, and
  authentication scheme. Phase 3 permits synthetic references and deterministic
  mocks only.
- Cancellation distinguishes local `transport-aborted` from
  `provider-cancel-acknowledged`; a browser `AbortSignal` is not proof that
  remote computation stopped.
- ADR-006 keeps a future proxy optional, disabled, loopback-only,
  authenticated, exactly allowlisted, bounded, and content-free in diagnostics.
  The only unauthenticated routes are a content-free health read and a narrowly
  constrained pairing bootstrap with exact Origin, non-GET, single-use
  short-lived code, rate limits, no upstream action, and sanitized output.
- LAN, worker, peer, Telegram, production listener, installer, and broader
  trust behavior remain blocked by ADR-012 and Phase 7 verification.

The exact machine-checkable boundary is
[`PHASE3_DECISION_PACKET.json`](PHASE3_DECISION_PACKET.json). ADR-005 and
ADR-006 remain Proposed; this map does not authorize real credentials,
provider traffic, a listener, or a legacy gateway change.
