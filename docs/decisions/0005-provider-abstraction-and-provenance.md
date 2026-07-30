# ADR 0005 — Provider abstraction, routing, and provenance

**Status:** Accepted
**Date:** 2026-07-30
**Owners:** Maintainers
**Related work:** `LW-P3-DEC-001`, `LW-P3-001`, `LW-P4-001`,
`docs/ARCHITECTURE.md`, `reengineering/SECURITY_BOUNDARY_MAP.md`

**Decision receipt:** **ACCEPTED** — maintainer replied `approved choices - continue`
in the active Codex task on 2026-07-30. This authorizes only the exact
deterministic in-process mock `LW-P3-001` scope frozen by the accepted Phase 3
preflight; it does not authorize real provider traffic, credential use, legacy
routing changes, activation, or cutover.

## Context

**OBSERVED:** the baseline has two materially different inference paths.
Primary Chat performs its own provider-specific request construction, streaming
parsing, persistence order, and fallback. Module callers use callback-style
`FreeLattice.callAI`, with an `InferenceRouter` that can visibly fall back from
a configured provider to Browser AI, a plaintext cached answer, and finally an
honest error. Chat observes router health but does not use the same dispatch
contract.

**OBSERVED:** the catalog includes OpenAI-compatible cloud/local endpoints,
Anthropic, Google, Hugging Face, Ollama, LM Studio, Browser AI, mesh, Kindroid,
and arbitrary custom endpoints. Protocol families differ in authentication,
payload, streaming, completion, and error shapes. The primary Chat path
persists the user message before sending the provider request and has no
characterized cancellation contract.

**OBSERVED:** Phase 2 performs no network or provider calls. Provider
send/stream/cancel/retry, real model discovery, fallback, and storage effects
remain C0.

## Decision

Adopt four explicit seams.

### 1. Provider adapter

A `ProviderAdapter` maps one normalized request to exactly one provider
protocol. It declares:

- stable adapter/provider ID and version;
- endpoint trust class: `browser`, `loopback`, `lan`, `cloud`, `custom`, or
  `mock`;
- model discovery behavior;
- text, vision, tool, streaming, usage, and cancellation capabilities;
- request limits and supported options;
- credential requirement by reference;
- normalized stream and error mapping.

One adapter invocation performs exactly one wire attempt. An adapter never
selects a fallback, owns retry policy, or silently retries through another
provider.

### 2. Provider router

A `ProviderRouter` selects an adapter from the user's explicit configuration
and a caller-supplied policy. It:

- preserves the selected provider/model;
- rejects capability mismatch before sending content;
- exposes fallback options to the caller;
- records every attempted adapter in provenance;
- never crosses endpoint trust classes without explicit, visible consent;
- never silently sends one prompt to a second provider;
- never replays a request after any response delta was emitted.

The router owns retry decisions. The default retry count is zero. A retry after
dispatch is permitted only when the provider's idempotency contract is
characterized and satisfied or the caller gives explicit authorization after a
visible failure. One stable `operation_id` identifies the logical request;
every wire attempt has a unique `attempt_id`. Provenance records every attempt
and its reason.

Legacy Browser-AI/cache/content-policy fallback remains a compatibility
obligation for later vertical-slice characterization. Phase 3 does not delete,
enable, or copy it.

### 3. Credential source and egress policy

Feature code passes a `CredentialRef`, never a credential value. The reference
is immutably bound to a provider ID, adapter ID/version, exact parsed origin,
trust class, and authentication scheme. An `EgressPolicy` first authorizes
those same fields plus redirect target, payload class, and provider capability
and returns an immutable `EgressGrant`. Only then may the injected
`CredentialSource.resolve(ref, grant)` resolve the secret inside the adapter
boundary for one attempt; any binding mismatch is rejected before resolution.

Credentials, authorization headers, prompts, responses, attachments, retrieved
memory, and identity context are forbidden in diagnostics and evidence.
Provider configuration persistence is governed by ADR-004; Phase 3 uses
synthetic references only.

### 4. Normalized request, events, and errors

The operation request contract includes:

- stable operation ID, provider ID, requested model, and optional
  resolved-model policy;
- ordered typed messages with text and explicit multimodal parts;
- bounded generation options;
- required capabilities;
- caller-owned `AbortSignal`;
- absolute deadline and retry policy;
- credential reference and redacted context/provenance tags.

The router assigns a unique attempt ID to each adapter invocation. The
operation stream emits an ordered terminally complete sequence:

`started`, zero or more `delta`, optional `usage`, then exactly one of
`completed`, `failed`, or `cancelled`.

Normalized errors are:

`unconfigured`, `capability-mismatch`, `authentication`, `authorization`,
`policy-refusal`, `rate-limit`, `context-limit`, `model-not-found`, `timeout`,
`cancelled`, `network`, `cors`, `malformed-response`, `provider`, and
`internal`.

Retry is bounded, defaults to zero, and is permitted only under the explicit
router rule above and before the first emitted delta. Cancellation aborts the
local transport and emits one terminal event, but an `AbortSignal` alone does
not prove remote provider computation stopped. Adapters declare whether
provider-side cancellation acknowledgement exists. Terminal provenance records
the achieved scope as `transport-aborted` or
`provider-cancel-acknowledged`.

### 5. Provenance on every terminal result

Provenance contains no private content and records:

- operation ID and every unique attempt ID;
- provider/adapter ID and version;
- requested and resolved model;
- trust class and locality;
- start/end time and terminal reason;
- capabilities used;
- retry count and fallback chain;
- retry authorization and per-attempt reason;
- achieved cancellation scope when cancellation occurs;
- whether the result was live, in-browser, cached historical, mock, or
  unavailable.

Cached content can never be presented as a live provider response.

### 6. Phase 3 implementation scope is deterministic

After explicit acceptance, Phase 3 may implement:

- provider contracts;
- a deterministic local mock and cloud mock;
- fragmented/malformed stream fixtures;
- a compatibility wrapper proving exactly-once callback behavior;
- diagnostics/provenance and policy tests.

It may not call a real local or cloud endpoint, read a real credential, replace
Chat, change local auto-probing, or enable fallback in the candidate.

## Invariants

- One request binds to one adapter at send time.
- Provider switching and fallback are visible and consented.
- Each adapter invocation performs one wire attempt; the router owns retry and
  fallback policy.
- Retry defaults to zero, never occurs after the first response delta, and
  requires proven provider idempotency or explicit caller authorization after
  dispatch.
- Cancellation has one terminal outcome, aborts local transport, and never
  claims remote cancellation without provider acknowledgement.
- Every terminal result has redacted provenance.
- Credentials are referenced, least-scoped, and absent from feature state,
  logs, errors, build output, screenshots, and evidence.
- Mock success is not a provider compatibility claim.
- Existing Chat and module-call behavior stays authoritative until separately
  characterized and migrated.

## Alternatives considered

### Keep separate Chat and module implementations

**Benefits**

- Lowest migration effort.
- Preserves known legacy paths.

**Costs and risks**

- Duplicates protocol, fallback, error, and credential behavior.
- Makes cancellation and provenance inconsistent.
- Keeps provider access mixed with UI and persistence.

### One adapter that also chooses fallbacks

**Benefits**

- Simple call site.
- Easy to reproduce broad legacy fallback.

**Costs and risks**

- Hides cross-provider data transmission.
- Makes tests and provenance ambiguous.
- Encourages silent provider switching and duplicate billable requests.

### Separate adapter, router, credential, and egress seams

**Benefits**

- Protocol mapping, policy, secrets, and trust are independently testable.
- Explicit fallback protects user intent and privacy.
- Mock adapters make Phase 3 deterministic.

**Costs and risks**

- More contracts and fixtures.
- Legacy compatibility wrappers remain temporarily necessary.
- The caller must handle visible degraded states.

## Consequences

### Positive

- Local and cloud protocols share one behavioral contract without pretending
  their wire formats are identical.
- Streaming, cancellation, retry, errors, and provenance become testable.
- Provider selection and fallback remain under user control.

### Negative

- Real adapters require protocol-specific characterization.
- Some legacy convenience fallbacks may become explicit prompts.
- Main Chat cannot be migrated as a mechanical wrapper.

### Unknown

- Which legacy fallback behavior users rely on.
- Exact provider payload/response quirks across live services.
- Browser-AI offline availability and model-acquisition behavior.
- Whether provider-side idempotency can support any post-send retry.

## Compatibility impact

Acceptance changes no runtime behavior or compatibility level. Primary Chat and
module-call paths need separate fixtures for payload, persistence order,
stream/non-stream parsing, fallback, error, and callback-once behavior.

## Data and migration impact

Provider selection and credential references are versioned datasets under
ADR-004. Prompt/response persistence belongs to the later Chat vertical slice.
No credential or message format is rewritten in Phase 3.

## Security and privacy impact

The adapter boundary sees private request content and therefore enforces
redaction, endpoint policy, redirect policy, and least-scoped credential
resolution. Browser-stored credentials are not claimed safe from compromised
same-origin code. Cross-provider fallback cannot silently resend private
content.

## Verification plan

- Contract-test fragmented/malformed SSE, explicit completion sentinels, empty
  bodies, finish reasons, usage, and non-streaming responses.
- Map 401/403/422/429/5xx, policy refusal, context limits, CORS/network,
  timeout, malformed response, cancellation, transport abort, provider
  cancellation acknowledgement, and cleanup.
- Prove one wire attempt per adapter invocation, zero default retries, unique
  attempt IDs, stable operation ID, and no retry after first delta or without
  idempotency/explicit authorization.
- Test text/vision capability mismatch before egress.
- Prove egress grant creation precedes credential resolution and reject every
  provider/adapter/origin/trust-class/auth-scheme mismatch.
- Test exactly-once callback compatibility for module callers.
- Run all provider tests against deterministic loopback mocks with external
  HTTP, WebSocket, worker, realtime, and beacon egress denied.
- Scan logs, errors, diagnostics, fixtures, screenshots, manifests, and build
  output with credential/content sentinels.
- Capture raw receipts and obtain independent clean-worktree reproduction.

## Rollback

Phase 3 provider code remains unused by the default runtime. Remove the
candidate contracts/mocks or disable their registration. No live request,
credential, message, provider selection, or legacy route changes.

## Review date

Before `LW-P3-001` implementation starts and again before the first real
provider adapter or Chat vertical slice.
