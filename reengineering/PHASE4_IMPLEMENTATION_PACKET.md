<!-- Status: PROPOSED | Owner: Maintainers | Work: LW-P4-IMPL-PREFLIGHT-001 -->

# Corrected Phase 4 implementation packet

## Control

- **Status:** PROPOSED — NOT AUTHORIZED
- **Packet:** `LW-P4-IMPL-PREFLIGHT-001`
- **Date:** `2026-07-30`
- **Depends on:** amended Phase 4 characterization GREEN
- **Accepted architecture:** ADR-004, ADR-005, ADR-006
- **Implementation authority:** none until a later explicit maintainer receipt

## Intended invariant

Build one removable, non-default, synthetic/mock Chat vertical slice that
corrects the accepted cancellation and provider-selection divergences while
leaving the legacy application, real stores, credentials, endpoints, default
route, deployment, and activation untouched.

## Exact proposed ownership

New candidate paths:

- `packages/contracts/src/chat.ts`
- `packages/chat/package.json`
- `packages/chat/tsconfig.json`
- `packages/chat/src/index.ts`
- `packages/chat/src/chat-controller.ts`
- `packages/chat/src/synthetic-conversation-store.ts`
- `packages/chat/src/chat-controller.test.mjs`
- `apps/web/p4.html`
- `apps/web/src/p4-main.ts`
- `apps/web/src/p4-chat-app.ts`
- `apps/web/src/p4-chat-app.css`
- `tests/phase4/**`
- exact Phase 4 boundary, verification, evidence, claim, handoff, living-doc,
  and checkpoint paths

Narrow existing-file edits:

- `packages/contracts/src/index.ts`: export Chat contracts only.
- `apps/web/package.json`: add `@latticework/chat`,
  `@latticework/providers`, and `@latticework/storage`.
- root `package-lock.json` and `package.json`: workspace bookkeeping and
  `p4:typecheck`, `p4:test`, and `p4:browser` commands only.

Protected paths include `apps/web/index.html`, `apps/web/src/main.ts`, the
legacy tree, deployment/service-worker/server/desktop/worker files, Phase 3
migration/source-reader implementations, and every real provider transport.

## Dependency and authority map

```text
p4.html -> p4-main -> p4-chat-app -> @latticework/chat -> @latticework/contracts
                    |                ^
                    +-- inject @latticework/providers mock router
                    +-- inject @latticework/storage candidate repository

@latticework/providers -> @latticework/contracts
@latticework/storage   -> @latticework/contracts
```

`@latticework/chat` imports interfaces only. The view cannot access storage,
`fetch`, WebSocket, EventSource, credentials, or provider implementations.

## Product policy frozen by this proposal

- Entry is `/p4.html`, dev/test-only, non-default, and visibly marked
  synthetic. `/` remains the feature-free shell.
- Provider choices are visibly `Mock local` and `Mock cloud`; there is no skip,
  fallback, retry, endpoint, model discovery, or credential UI.
- Only generated fixture-tagged records may be written to
  `latticework::conversation` inside a disposable profile.
- No `FreeLatticeConversationSourceReader`, `ConversationMigrationService`,
  `FreeLatticeDB`, migration journal, staging namespace, activation, or
  read-owner switch may be constructed or imported.
- A synthetic user message is persisted before mock dispatch. Assistant content
  is persisted only after `completed`. A cancelled or failed turn retains the
  user message and content-free terminal metadata; no partial assistant content
  is persisted.
- One `AbortController` exists per operation. Cancel-before-dispatch invokes no
  adapter. Cancel-after-delta aborts locally, emits one terminal, rejects late
  deltas/terminals, and reports only the achieved cancellation scope.
- Retry count is zero and cross-provider fallback is absent.
- Diagnostics/copy contain structured redacted provenance only: operation,
  attempt, adapter, model, trust class, result source, timing, terminal reason,
  and cancellation scope.
- The candidate database may survive reload only inside its disposable test or
  demonstration profile. Cleanup deletes that exact run-owned candidate DB;
  it never touches legacy or migration namespaces.
- The loopback stream listener is test-only. Application code uses the existing
  deterministic in-process mock adapters and never connects to it.

## Verification gates

1. strict TypeScript across all workspaces;
2. controller tests for persistence order, exactly-one terminal, cancellation,
   late/duplicate events, reload states, malformed events, sanitized errors,
   provenance, zero retry, and zero fallback;
3. native Chromium disposable-profile E2E for both mock providers, fragmented
   stream, cancellation, reload, diagnostics, keyboard, mobile, forced-colors,
   reduced-motion, warm-offline, and unchanged `/`;
4. test fixture rejects every wrong method/path/fixture/body, proves
   `127.0.0.1` plus run-selected port, performs zero forwarding/DNS/external
   egress, and proves teardown;
5. boundary controls reject legacy imports, protected app edits, ambient
   credentials, provider transports, network APIs in app/package code, runtime
   listeners, and candidate activation;
6. deterministic double build, isolated lock replay, audit, SBOM, full
   repository controls, hashed evidence, secret/content scan, and independent
   clean-worktree reproduction;
7. old/new comparison reports accepted divergences as intentional candidate
   differences, never baseline compatibility.

## Rollback

Before any future activation, rollback removes only the P4 entry, feature
package, tests, and narrow dependency/export bookkeeping. It closes candidate
connections and deletes only the exact run-owned
`latticework::conversation`. Accepted evidence and every legacy/migration
namespace remain untouched. Because `/` never changes, rollback requires no
cutover.

## Stop conditions

Stop immediately for real data/profile/store access; credentials; endpoint or
provider traffic; an application listener; LAN/wildcard/proxy/worker/peer/
Telegram work; default entry, shared/global UI, service-worker, server,
deployment, or installer changes; migration/activation; a new provider
protocol/dependency; content-bearing diagnostics; uncertain cleanup; or any
attempt to relabel a baseline divergence as `PASS`.

## Locked proposal

```json
{
  "schema": "latticework.phase4-implementation-packet.v1",
  "packet_id": "LW-P4-IMPL-PREFLIGHT-001",
  "implementation_authorized": false,
  "entrypoint": "apps/web/p4.html",
  "entrypoint_default": false,
  "production_build_authorized": false,
  "legacy_default_unchanged": true,
  "real_data_authorized": false,
  "real_credentials_authorized": false,
  "real_provider_traffic_authorized": false,
  "activation_authorized": false,
  "deployment_authorized": false,
  "cutover_authorized": false,
  "candidate_storage": "latticework::conversation",
  "candidate_storage_synthetic_only": true,
  "provider_adapters": [
    "mock-local",
    "mock-cloud"
  ],
  "owned_implementation_paths": [
    "packages/contracts/src/chat.ts",
    "packages/chat/package.json",
    "packages/chat/tsconfig.json",
    "packages/chat/src/index.ts",
    "packages/chat/src/chat-controller.ts",
    "packages/chat/src/synthetic-conversation-store.ts",
    "packages/chat/src/chat-controller.test.mjs",
    "apps/web/p4.html",
    "apps/web/src/p4-main.ts",
    "apps/web/src/p4-chat-app.ts",
    "apps/web/src/p4-chat-app.css",
    "tests/phase4/"
  ],
  "protected_paths": [
    "apps/web/index.html",
    "apps/web/src/main.ts",
    "legacy/",
    "deployment/",
    "service-worker/",
    "server/",
    "desktop/",
    "worker/"
  ],
  "retry_count": 0,
  "fallback_authorized": false,
  "application_listener_authorized": false,
  "test_listener": {
    "bind": "127.0.0.1",
    "port": "os-selected",
    "run_owned": true,
    "synthetic_only": true,
    "external_egress": false
  },
  "required_prior_gate": "LW-P4-AMEND-001-GREEN",
  "required_next_authority": "explicit-maintainer-acceptance"
}
```

## Decision requested later

Do not start `LW-P4-001` from this document alone. After amended
characterization and independent spec QA are green, the maintainer must
explicitly accept this exact packet.
