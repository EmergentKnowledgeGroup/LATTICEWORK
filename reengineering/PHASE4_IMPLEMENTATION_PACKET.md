<!-- Status: ACCEPTED | Owner: Maintainers | Work: LW-P4-IMPL-PREFLIGHT-001 -->

# Accepted Phase 4 implementation packet

## Control

- **Status:** ACCEPTED FOR BOUNDED EXECUTION AFTER INDEPENDENT GREEN
- **Packet:** `LW-P4-IMPL-PREFLIGHT-001`
- **Date:** `2026-07-31`
- **Pinned implementation base:** `faf32dbaf8159e8499421fa68d9fba4bede0fdc9`
- **Required prior gate:** `LW-P4-RETEST-001` canonical and independent GREEN
- **Accepted architecture:** ADR-004, ADR-005, ADR-006
- **Maintainer receipt:** `Continue and consider anything you write as accepted.`

The standing maintainer receipt accepts this exact packet only after its
machine validator and independent review are GREEN. It does not authorize any
path, capability, data source, network behavior, activation, or deployment not
named here.

## Intended invariant

Build one removable, non-default, synthetic/mock Chat vertical slice that
corrects the accepted cancellation and provider-selection divergences while
leaving the legacy application, real stores, credentials, endpoints, default
route, deployment, and activation untouched.

## Exact ownership

The machine lock below is authoritative. New implementation source is limited
to `packages/chat/`, the exact P4 web entry files, `tests/phase4/`, and the
exact controls, evidence, claim, handoff, living-document, and checkpoint paths.

The only permitted narrow edits to existing implementation files are:

- `package.json` and `package-lock.json`: workspace bookkeeping and P4 commands.
- `packages/contracts/src/index.ts`: export Chat contracts only.
- `apps/web/package.json`: add only `@latticework/chat`,
  `@latticework/providers`, and `@latticework/storage`.
- `tests/reengineering/phase2-boundary.test.mjs`: preserve the Phase 2
  dependency assertion against the verified Phase 2 terminal commit rather
  than incorrectly treating later additive dependencies as Phase 2 drift.
- `tools/reengineering/validate-phase4-active-scope.mjs`: compose the exact
  accepted implementation ownership lock into the earlier Phase 4 active
  scope. No broad application/package prefix is added.
- `tools/reengineering/verify-phase3-boundary.mjs`: preserve Phase 3 scope
  verification against its accepted closed base-to-terminal range while
  continuing to run its semantic provider and storage checks on current code.

Everything in the protected exact/prefix arrays must remain byte-identical to
the pinned implementation base. Protected paths are rejected independently
even if an ownership array is later edited to include one.

## Dependency and authority map

```text
p4.html -> p4-main -> p4-chat-app -> @latticework/chat -> @latticework/contracts
                    |                ^
                    +-- inject @latticework/providers mock router
                    +-- inject @latticework/storage candidate repository

@latticework/providers -> @latticework/contracts
@latticework/storage   -> @latticework/contracts
```

`@latticework/chat` depends only on `@latticework/contracts` and imports
interfaces only. The view cannot access storage, network APIs, credentials, or
provider implementations. Only `p4-main.ts` may compose the already-verified
Phase 3 package roots.

## Product policy

- Entry is `/p4.html`, dev/test-only, non-default, and visibly marked
  synthetic. `/` and the production build remain unchanged.
- Provider choices are visibly `Mock local` and `Mock cloud`; there is no skip,
  fallback, retry, endpoint, model discovery, credential UI, or real transport.
- Only generated fixture-tagged records may be written to
  `latticework::conversation` inside a disposable profile.
- No `FreeLatticeConversationSourceReader`, `ConversationMigrationService`,
  `FreeLatticeDB`, migration journal, staging namespace, activation, or
  read-owner switch may be constructed, imported, or invoked.
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
- The candidate database may survive reload only inside its disposable test
  profile. Cleanup deletes that exact run-owned candidate DB and never touches
  legacy or migration namespaces.

## Listener boundary

Application and package source may not listen, fetch, open sockets, read ambient
credentials, or contact a provider. The implementation-owned synthetic stream
listener is `tests/phase4/support/synthetic-stream-fixture.mjs`; it must:

- bind literal `127.0.0.1`;
- request port `0` and record the OS-selected port;
- be owned and stopped by one test run;
- return generated synthetic fragments only;
- perform no DNS, forwarding, proxying, or external egress; and
- prove teardown and port release.

The browser verifier may also start Vite as a run-owned exact-loopback test
harness from `tests/phase4/playwright.config.ts`. Its port comes only from the
validated `LATTICEWORK_P4_PORT` test-run setting (4194 canonical, 4294
independent), it serves only the synthetic candidate web root, it performs no
provider traffic, and Playwright owns its teardown. This is verification
infrastructure, not an application listener or candidate activation.

## Verification gates

1. `node tools/reengineering/validate-phase4-amendment.mjs`
2. `node --test tests/reengineering/phase4-implementation-scope.test.mjs`
3. `node tools/reengineering/validate-phase4-implementation-scope.mjs`
4. `npm run p4:typecheck`
5. `npm run p4:test`
6. `npm run p4:browser`
7. `npm run p3:boundary`
8. `node --test tests/reengineering/*.test.mjs`
9. protected Phase 3 and default-web byte comparisons to the pinned base
10. deterministic double build, isolated lock replay, audit, SBOM, evidence
    hashing/content scan, and independent clean-worktree reproduction
11. desktop, 390 x 844 mobile, keyboard, forced-colors, reduced-motion,
    explicit warm-offline disposition, cancellation, reload, diagnostics, and
    unchanged `/` browser evidence. Warm offline may be claimed only if the
    candidate explicitly declares and passes that contract; this packet does
    not authorize adding a service worker to manufacture the claim.

The implementation-range validator hard-codes the pinned base and rejects CLI
base/scope overrides. It inspects committed history including add-then-delete
paths plus staged, unstaged, untracked, and force-added ignored files.

## Rollback

Before any future activation, rollback removes only the P4 entry, Chat package,
tests, and narrow dependency/export bookkeeping. It closes candidate
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

## Machine lock

```json
{
  "schema": "latticework.phase4-implementation-packet.v2",
  "packet_id": "LW-P4-IMPL-PREFLIGHT-001",
  "accepted": true,
  "acceptance_receipt": "Continue and consider anything you write as accepted.",
  "implementation_base_sha": "faf32dbaf8159e8499421fa68d9fba4bede0fdc9",
  "implementation_authorized": true,
  "entrypoint": "apps/web/p4.html",
  "entrypoint_default": false,
  "production_build_authorized": false,
  "legacy_default_unchanged": true,
  "synthetic_mock_only": true,
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
  "retry_count": 0,
  "fallback_authorized": false,
  "application_listener": false,
  "test_listener": true,
  "test_listener_contract": {
    "only_path": "tests/phase4/support/synthetic-stream-fixture.mjs",
    "bind": "127.0.0.1",
    "port": "os-selected",
    "requested_port": 0,
    "run_owned": true,
    "fixture_only": true,
    "synthetic_only": true,
    "external_egress": false
  },
  "browser_harness_listener": {
    "only_path": "tests/phase4/playwright.config.ts",
    "bind": "127.0.0.1",
    "port_source": "LATTICEWORK_P4_PORT",
    "canonical_port": 4194,
    "independent_port": 4294,
    "browser_channel": "chrome",
    "run_owned": true,
    "synthetic_ui_only": true,
    "external_egress": false
  },
  "owned_exact_paths": [
    "package.json",
    "package-lock.json",
    "packages/contracts/src/index.ts",
    "packages/contracts/src/chat.ts",
    "apps/web/package.json",
    "apps/web/p4.html",
    "apps/web/src/p4-main.ts",
    "apps/web/src/p4-chat-app.ts",
    "apps/web/src/p4-chat-app.css",
    "tests/reengineering/phase4-implementation-scope.test.mjs",
    "tests/reengineering/phase4-active-scope.test.mjs",
    "tests/reengineering/phase2-boundary.test.mjs",
    "tests/reengineering/phase4-amendment.test.mjs",
    "tools/reengineering/verify-phase3-boundary.mjs",
    "tools/reengineering/validate-phase4-implementation-scope.mjs",
    "tools/reengineering/validate-phase4-active-scope.mjs",
    "tools/reengineering/validate-phase4-amendment.mjs",
    "tools/reengineering/run-phase4-verification.ps1",
    "docs/agents/claims/LW-P4-IMPL-PREFLIGHT-001.md",
    "docs/agents/handoffs/LW-P4-IMPL-PREFLIGHT-001.md",
    "docs/agents/claims/LW-P4-001.md",
    "docs/agents/handoffs/LW-P4-001.md",
    "PROJECT_STATE.md",
    "docs/ARCHITECTURE.md",
    "docs/COMPATIBILITY.md",
    "docs/TESTING_AND_VERIFICATION.md",
    "reengineering/BLOCKERBOARD.md",
    "reengineering/EXECUTION_CHECKLIST.md",
    "reengineering/PHASE4_IMPLEMENTATION_PACKET.md",
    "runtime/checkpoints/LATEST.md",
    "runtime/checkpoints/LATEST.json",
    "reengineering/checkpoints/LATEST.md",
    "reengineering/checkpoints/LATEST.json"
  ],
  "owned_path_prefixes": [
    "packages/chat/",
    "tests/phase4/",
    "reengineering/evidence/phase-4/LW-P4-001/"
  ],
  "protected_phase3_exact_paths": [
    "packages/contracts/src/provider.ts",
    "packages/contracts/src/storage.ts"
  ],
  "protected_phase3_path_prefixes": [
    "packages/providers/",
    "packages/storage/"
  ],
  "protected_exact_paths": [
    "app.html",
    "index.html",
    "docs/app.html",
    "sw.js",
    "docs/sw.js",
    "server.js",
    "server.py",
    "telegram-worker.js",
    "apps/web/index.html",
    "apps/web/src/main.ts",
    "apps/web/src/empty-status-shell.ts",
    "apps/web/src/styles.css",
    "apps/web/vite.config.ts",
    "apps/web/tsconfig.json"
  ],
  "protected_path_prefixes": [
    "modules/",
    "docs/modules/",
    "desktop/",
    "worker/",
    "deployment/",
    "service-worker/",
    "server/",
    "tests/smoke",
    "tests/characterization/"
  ],
  "required_prior_gate": "LW-P4-RETEST-001-GREEN",
  "required_next_authority": "none-within-this-packet"
}
```

## Acceptance effect

Once this exact packet, validator, and negative-test suite receive independent
GREEN review, `LW-BLK-010` closes and `LW-P4-001` may begin under this packet
only. Real-data, credential, real-provider, application-listener, activation,
deployment, and cutover authority remain false.
