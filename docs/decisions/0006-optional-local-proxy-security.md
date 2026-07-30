# ADR 0006 — Optional local proxy security

**Status:** Proposed
**Date:** 2026-07-30
**Owners:** Maintainers
**Related work:** `LW-P3-DEC-001`, `LW-BLK-006`, `LW-P7-001`,
`reengineering/SECURITY_BOUNDARY_MAP.md`

**Decision receipt:** **PENDING** — this proposal does not authorize a gateway
listener, LAN exposure, worker deployment, or credential migration.

## Context

**OBSERVED:** the legacy Node and Python helpers bind broadly, return wildcard
CORS, proxy Ollama-style routes, and have no characterized authentication
boundary. The browser also probes localhost services directly and may use a
same-origin Ollama proxy. Arbitrary custom URLs can be persisted and marked
local without proving they are loopback.

**OBSERVED:** browser credential storage is inconsistent. Some values use an
AES-GCM path while other paths persist plaintext keys or embed keys in custom
endpoint configuration. Key material and encrypted values are readable by the
same origin, so browser encryption does not protect against compromised
same-origin code.

**OBSERVED:** Phase 2 opens no network boundary. Gateway, LAN, worker, mesh,
Telegram, and peer behavior remains unverified and blocked. The proposal below
freezes a fail-closed contract; it does not convert a source observation into a
published vulnerability claim.

Security references:

- <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
- <https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html>

## Decision

### 1. The proxy is optional and disabled by default

The browser/local mock path cannot require a proxy to boot. No listener starts
unless the user explicitly enables the local-gateway capability. Absence,
failure, or rejection yields a visible unavailable/degraded state, never an
automatic cloud fallback.

### 2. Default binding is loopback only

The gateway binds explicitly to `127.0.0.1` and, when supported and tested,
`::1`. Wildcard, public, and private-LAN binds fail closed. LAN exposure
requires a separate explicit mode, threat model, ADR-012 disposition, strong
authentication, and security test matrix. “Local” is derived from the parsed
address/origin, never a mutable boolean label.

### 3. Pairing and authentication are required

Only two narrowly scoped unauthenticated routes exist: a content-free health
read and pairing bootstrap. Pairing bootstrap uses an exact configured Origin,
a non-GET method, a single-use short-lived code displayed by the gateway and
entered by the user, strict rate limits, no upstream action, and sanitized
responses. It cannot be completed by ambient cross-origin requests.

Every other request requires an opaque, randomly generated, scoped, expiring
bearer session obtained through that explicit pairing flow.

The gateway uses no ambient authentication cookie. A logical operation may
retain its stable `operation_id`, but every upstream attempt includes a unique
`attempt_id`; reused attempt IDs are rejected for the token lifetime. Tokens
are never accepted in URLs, query strings, logs, diagnostics, or error text.

This boundary does not claim protection from local malware or compromised
same-origin script. Those limitations are documented in the UI and threat
model.

### 4. Origins, methods, paths, and upstreams are exact allowlists

- CORS reflects only an exact configured origin; wildcard CORS is forbidden.
- Missing, `null`, malformed, unexpected, or changed origins are rejected
  except for separately authenticated non-browser clients.
- State-changing operations use non-GET methods and authentication headers.
- Redirects that change origin are rejected.
- Method and route allowlists are closed by default.
- The gateway cannot proxy an arbitrary caller-supplied URL.
- Upstream model endpoints are parsed, trust-classified, and explicitly
  configured.

### 5. Resource use is bounded

Each route declares body, attachment, header, output, concurrency, queue,
connect, first-byte, idle, and total-duration limits. Defaults are conservative;
larger multimodal requests require a separately visible capability and limit.
Malformed, oversized, slow, queued, or cancelled requests fail with sanitized
errors and release resources.

### 6. Diagnostics are content-free by default

Logs may contain operation ID, attempt ID, route ID, status class, bounded
timing, byte counts, provider trust class, and redacted error category. They
cannot contain credentials, tokens, authorization headers, prompts, responses,
attachments, retrieved memory, identity context, raw provider bodies, or
arbitrary upstream URLs.

### 7. Phase separation is enforced

ADR-006 acceptance may authorize security contracts and deterministic tests.
It does not authorize:

- changing `server.js` or `server.py`;
- starting a gateway in Phase 3;
- LAN/peer/worker/Telegram behavior;
- a production listener or installer;
- a default route, provider, or credential migration.

Runtime gateway implementation belongs to `LW-P7-001` after ADR-012 and its
threat-model/test gate.

## Invariants

- The no-gateway and denied-network product path remains operable.
- Loopback is the only default bind.
- LAN exposure is explicit, separate, and never inferred.
- Pairing bootstrap is the only unauthenticated state-changing route and
  requires exact Origin, non-GET, single-use code, rate limits, no upstream
  action, and sanitized responses.
- Authentication and exact origin checks are both required after pairing.
- The gateway is not an open proxy.
- A failed security check performs no upstream request.
- Secrets and private content never enter logs or evidence.
- Cross-trust fallback remains visible and consented under ADR-005.

## Alternatives considered

### Preserve broad bind and wildcard CORS

**Benefits**

- Works easily across LAN devices.
- Matches the observed helper defaults.

**Costs and risks**

- Makes every reachable origin a potential caller.
- Provides no user-visible trust or pairing boundary.
- Cannot support a credible local-only security claim.

### Loopback with origin checks but no authentication

**Benefits**

- Simple static-browser integration.
- Blocks many ordinary cross-origin calls.

**Costs and risks**

- Origin checks alone do not authenticate the user or client.
- Browser extensions, same-origin compromise, DNS/origin mistakes, and local
  processes remain relevant.

### Disabled-by-default, loopback, paired, scoped proxy

**Benefits**

- Makes trust explicit and testable.
- Preserves a proxy option without making it a boot dependency.
- Separates LAN/worker/peer exposure from local inference.

**Costs and risks**

- Pairing adds setup friction.
- Browser-only token storage has documented limitations.
- More security tests and lifecycle handling are required.

## Consequences

### Positive

- The optional proxy has a narrow, auditable attack surface.
- Local-only operation does not depend on a broadly exposed service.
- Security failures are deterministic and observable.

### Negative

- Legacy broad-bind convenience cannot be copied as the candidate default.
- Pairing, token expiry, and exact-origin configuration add operational work.
- LAN use remains blocked pending a later decision.

### Unknown

- Final browser-only pairing UX.
- Whether desktop keychain/IPC becomes the preferred secret bootstrap.
- Exact request limits for image/audio model workloads.
- Production deployment and update mechanism.

## Compatibility impact

No compatibility level changes. The legacy helpers remain untouched. Any future
candidate gateway must characterize direct localhost, same-origin proxy, no
gateway, authentication failure, origin failure, cancellation, timeout, and
offline behavior.

## Data and migration impact

No legacy token, endpoint, or credential is migrated. Candidate pairing/session
records use ADR-004 and are separate from provider credentials. Normal
backup/export excludes authentication tokens.

## Security and privacy impact

The decision narrows the candidate boundary and explicitly rejects claims that
browser encryption defeats same-origin compromise. LAN, workers, peers,
Telegram, and desktop privilege remain separate high-risk boundaries.

## Verification plan

- Prove explicit IPv4/IPv6 loopback bind and rejection of wildcard/LAN binds.
- Test missing/wrong/expired/revoked tokens, pairing bootstrap Origin/method,
  one-time-code expiry/reuse/rate limits, attempt-ID replay, stable operation
  identity across authorized retries, and concurrent session limits.
- Test expected/unexpected/missing/`null` origins, preflight, redirect-origin
  change, invalid schemes, credentials in URLs, and arbitrary upstream targets.
- Test every allowed/denied method and path, malformed JSON, oversized headers
  and bodies, slow streams, queue overflow, timeout, cancellation, and cleanup.
- Use sentinels to prove logs/errors/evidence contain no token, credential,
  prompt, response, attachment, or memory text.
- Deny all external egress in the local-only suite.
- Independently reproduce from a clean worktree before any gateway capability
  is called supported.

## Rollback

The proxy is disabled by default. Stop and remove the candidate listener,
revoke tokens, and return to the no-gateway path. No legacy helper, provider
selection, credential, route, or user data is changed by this ADR.

## Review date

Before implementing any listener and again before LAN, worker, peer, Telegram,
or packaged-gateway support.
