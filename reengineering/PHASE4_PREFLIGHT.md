<!-- Status: LOCKED | Owner: Maintainers | Work: LW-P4-PREFLIGHT-001 -->

# Phase 4 vertical-slice characterization preflight

## Control

- **Status:** LOCKED — SPEC SWARM AND CONTROL QA GREEN
- **Version:** `1.0`
- **Locked at:** `2026-07-30T21:15:43Z`
- **Date:** `2026-07-30`
- **Source:** `docs/agents/handoffs/LW-P3-001.md`
- **Base commit:** `e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd`
- **Work claim:** `docs/agents/claims/LW-P4-PREFLIGHT-001.md`
- **Implementation authority:** none
- **Change control:** after lock, semantic changes require a new claim,
  updated evidence gates, and maintainer disposition before implementation.

## SpecSwarm routing

Complexity score: **5/5 — Hard**.

- multiple product surfaces: yes;
- provider, data, security, and privacy boundaries: yes;
- compatibility, migration, rollback, and destructive-state risk: yes;
- real-world evidence required for later claims: yes;
- material ambiguity and unresolved baseline behavior: yes.

Required review efforts:

- gap and edge-case review: Sol xhigh;
- implementation touchpoint mapping: Sol high;
- over-engineering/reward-hacking review: Sol xhigh;
- final QA consolidation: Sol xhigh.

## Goal

Freeze the smallest honest characterization contract needed to decide whether a
later `LW-P4-001` candidate may implement one non-default
onboarding/provider/Chat/conversation/diagnostics vertical slice.

This preflight does not implement that candidate. It first closes missing
baseline observations with disposable synthetic browser profiles and
deterministic provider-protocol fixtures while external egress is denied.

## Exact bounded slice

This packet characterizes only the immutable baseline's **primary Chat path**
served from `Z:\LATTICEWORK_BASELINE_e7585999` at commit
`e7585999fc1af2707f410ae87356cf2b52e08d9c`.

The bounded provider fixtures are:

| Fixture ID | Baseline UI provider | Protocol | Trust class | Intercept target | Purpose |
|---|---|---|---|---|---|
| `P4-PRV-OLLAMA` | `ollama` | OpenAI-compatible streaming Chat Completions | `loopback` | `http://localhost:11434/v1/chat/completions` | local-path request, stream, failure, cancel, and persistence observations |
| `P4-PRV-OPENAI` | `openai` | OpenAI-compatible streaming Chat Completions | `cloud` | `https://api.openai.com/v1/chat/completions` | cloud-path credential-reference UI, request shape, stream, and failure observations |

Both targets are fulfilled or aborted inside Playwright routing before
transmission. The synthetic OpenAI credential is a run-scoped sentinel used
only inside the disposable profile; its exact value must never enter promoted
evidence.

Explicitly deferred and still C0:

- Anthropic, Google, Hugging Face, Browser AI, LM Studio, custom, mesh,
  Kindroid, and every other provider;
- callback-style `FreeLattice.callAI` and all module callers;
- real provider connectivity, model discovery, credential validity, billing,
  provider-side cancellation, and real-provider compatibility;
- import/export, long-term retention duration, multi-tab concurrency, real
  assistive-technology testing, and candidate application behavior.

Adding a provider, protocol, caller path, launch mode, or runtime integration
requires a new claim and packet amendment before execution.

## Audience and ownership

- Maintainers own product and compatibility decisions.
- The characterization harness owns synthetic fixtures and receipts only.
- The immutable FreeLattice baseline remains the observed source of legacy
  behavior.
- The LATTICEWORK application remains the later comparison target only after a
  separately accepted implementation packet.
- Review agents are read-only; the root controller owns integration and
  checkpoint truth.

## Current evidence state

### Already observed

- HTTP first-run onboarding and skip behavior have bounded C2 evidence.
- The Chat shell and Signal Report open/copy behavior have bounded C2 evidence.
- Synthetic unsent input is excluded from the observed Signal Report.
- Fresh storage initialization shape is bounded C2.
- Warm offline reload currently preserves an observed navigation failure.
- Phase 3 verifies inactive synthetic conversation storage and deterministic
  no-egress provider mocks, but no application imports or activates them.

### Still unknown

- Real local and cloud provider connection semantics.
- Chat send, stream, cancellation, retry, terminal error, and callback order.
- Conversation record values, write order, retention, reload, partial failure,
  and recovery behavior.
- Provider fallback behavior and whether content can cross trust classes.
- Import/export and user-facing recovery behavior.
- Mobile Chat layout, keyboard operation, focus order, screen-reader semantics,
  and failure announcements.
- Candidate old/new parity because no candidate feature exists.

No unknown above may be silently upgraded by source inspection alone. This
packet observes the two exact primary-Chat fixture paths above; it does not
resolve the deferred provider catalog or callback-style caller path.

## Authority

### Authorized by this preflight after lock

- Additive characterization tooling and tests against the immutable baseline.
- Disposable synthetic browser profiles and synthetic identifiers/content.
- In-process or browser-intercepted deterministic protocol fixtures.
- Denied-egress browser runs and content-free network/console receipts.
- Read-only inspection of synthetic profile storage created by the test.
- Planning, evidence, claim, handoff, and checkpoint updates.

### Prohibited

- Reading a real browser profile or real user store.
- Migrating, activating, deleting, cleaning, or rewriting user data.
- Using a real credential, provider endpoint, billable request, or external
  network response.
- Starting a listener, gateway, proxy, LAN service, worker, peer, or Telegram
  integration.
- Editing or registering candidate application feature code.
- Importing Phase 3 packages into `apps/web`.
- Changing the legacy default route, deployment mirror, service worker, or
  runtime behavior.
- Claiming C3/C4 parity, recovery readiness, real-provider compatibility,
  production readiness, or blocker closure.

The sole listener exception is the existing harness-owned static HTTP server:
Python `http.server`, bound to `127.0.0.1`, serving only the pinned immutable
baseline root on one explicit recorded port. It is not a provider endpoint.
The harness must prove startup identity and teardown; reusing an existing
listener is forbidden.

## Characterization boundary

### Surface A — first run and provider setup

The harness must capture, from a fresh isolated context:

1. first visible onboarding state;
2. navigation or skip paths that reach provider setup or the Chat shell;
3. provider-choice controls and visible trust/locality language;
4. validation/error state for absent or synthetically invalid configuration;
5. durable writes caused by each visible action;
6. the UI state after reload.

No secret value may appear in screenshots, logs, traces, receipts, or persisted
fixture exports. Synthetic credential sentinels must be rejected from the
evidence bundle if they leak.

### Surface B — deterministic provider protocol

The harness may intercept only the exact `P4-PRV-OLLAMA` and
`P4-PRV-OPENAI` targets before transmission and answer with deterministic
OpenAI-compatible fixtures derived from pinned baseline source.
It must characterize at least:

- request method, path class, headers by name only, and redacted payload shape;
- non-streaming success;
- fragmented streaming success and explicit terminal behavior;
- malformed fragment/body;
- authentication, rate-limit/context-limit retry behavior, timeout/network,
  policy-refusal, malformed response, and generic provider failures when the
  baseline distinguishes them;
- cancellation before dispatch and after at least one delta;
- retry/fallback prompts or automatic behavior;
- exactly-once user-visible completion/error behavior.

Network outcomes are exactly:

1. the baseline static-server origin may continue;
2. an exact fixture target may be fulfilled or aborted by the harness without
   transmission;
3. every other HTTP(S), redirect, WebSocket, EventSource, worker, realtime,
   beacon, and navigation attempt is aborted before transmission and fails the
   scenario.

The harness must assert that each expected fixture request actually occurred;
zero egress with no exercised request is a failure. A route-intercepted mock is
evidence of observed browser behavior under a fixture, not provider
compatibility.

### Surface C — Chat interaction

Using synthetic messages only, characterize:

1. empty-send refusal;
2. one successful send through visible UI controls;
3. incremental delta rendering;
4. completion and input reset;
5. cancellation before and during streaming;
6. retry behavior before and after a visible delta;
7. failure presentation and recovery action;
8. duplicate-send prevention;
9. abrupt reload/navigation before first delta and after one delta;
10. reload behavior after completed, cancelled, and failed attempts;
11. late delta after cancellation, duplicate/missing terminal behavior, empty
    success, out-of-order fragments, and retry racing with reload;
12. ordering of visible messages and durable records.

The harness must use user-visible input/actions for the primary flow. Direct DOM
or storage mutation may be used only for a named negative recovery fixture and
must be separately receipted.

### Surface D — conversation persistence and recovery

For every Chat state above, capture:

- database/store/version and key/index metadata;
- record count and structural projection;
- write ordering relative to visible deltas and terminal states;
- reload/reopen result;
- orphan, partial, duplicate, or interrupted record behavior;
- source state before and after the scenario;
- exact cleanup of the disposable test profile.

Private message text must not be stored in evidence. Fixtures use stable
sentinel IDs and hashed/redacted structural projections. Native values are
compared inside the disposable profile and summarized without exporting
content.

Every scenario must assert the exact synthetic request, stream sequence, and
stored synthetic values inside the disposable profile. Promoted evidence may
contain only fixture IDs, sequence numbers, byte/record counts, booleans,
structural projections, and synthetic-only digests.

### Surface E — Signal Report and diagnostics

Characterize Signal Report:

- closed/open state and trigger;
- included content classes and excluded classes;
- exclusion of the current unsent draft;
- copy action and exactly what content class reaches the clipboard;
- behavior after provider failure, cancellation, and reload;
- focus entry/return, keyboard dismissal, accessible name, and announcement.

No prompt, response, draft, credential, authorization header, or raw provider
body may enter evidence.

The test must snapshot and restore the browser-context clipboard. It may not
read or mutate a host clipboard outside the disposable browser context.

### Surface F — responsive, accessibility, and degraded operation

Run the bounded flow at:

- desktop viewport;
- `390 × 844` mobile viewport;
- keyboard-only input;
- forced-colors;
- reduced motion;
- offline/denied-network local fixture.

Capture focus order, visible focus, modal focus containment/return, status/error
announcement, target size failures, overlap, overflow, and layout-blocking
defects. Existing divergence is recorded, not silently repaired.

Warm-offline reload, denied-egress policy, and simulated provider-network
failure are separate scenarios and may not share one receipt.

## Fixture contract

- Fixture ID: `latticework.phase4.chat-characterization.v1`.
- Profile and raw-staging root: a newly created, empty, ignored run directory
  under `runtime/tmp/phase4-characterization/<run-id>/`.
- Every run directory contains a fresh ownership marker binding the canonical
  repository root, run ID, PID, creation timestamp, and random nonce.
- Identity values: synthetic and stable.
- Message/draft values: synthetic sentinels generated for the run.
- Provider values: deterministic, content-free where possible, and never real
  credentials.
- Time: controlled or recorded; no assertion may depend on wall-clock races.
- Randomness: fixed seed or captured seed.
- Isolation: one newly created run-owned browser profile per atomic subcase;
  no profile reuse between subcases.
- Concurrency: one worker and no shared mutable profile across concurrent
  processes.
- External egress: zero allowed.
- Promotion: raw traces, screenshots, attachments, request records, and storage
  projections remain in ignored staging until the complete evidence closure
  passes allowlist and secret/private-sentinel scans.
- Cleanup: browser and static-server process closure must be proven first; then
  canonical containment and reparse-point checks are repeated immediately
  before deleting only the marked run directory.
- Failure cleanup: if ownership, process closure, containment, or reparse-point
  proof is uncertain, do not delete; leave a content-free recovery handoff and
  mark the run failed.
- Promoted receipts are immutable; rollback never deletes already accepted
  evidence and instead records a superseding invalidation receipt.

The harness must fail closed when a profile path escapes the repository,
traverses a reparse point, predates the current run, is nonempty before its
ownership marker is written, lacks or mismatches that marker, or cannot prove
cleanup scope.

## State model to observe

The harness records—not invents—the legacy transitions:

```text
fresh
  -> onboarding-visible
  -> provider-state-visible | skipped
  -> chat-ready
  -> submitting
  -> streaming
  -> completed | cancelled | failed
  -> reload-observed
```

If the baseline has different states or merges states, receipts preserve the
observation and the locked packet is amended before implementation. Tests must
not force the baseline to conform to this provisional model.

## Error and abstention behavior

- Missing selector/state: fail with screenshot, ARIA snapshot, console receipt,
  and content-free diagnostic.
- Unexpected egress: abort before transmission and fail.
- Secret/private sentinel leak: fail and quarantine the unsafe evidence outside
  tracked artifacts until sanitized/regenerated.
- Unsupported baseline protocol: record `UNKNOWN`; do not fabricate a fixture.
- Mandatory deterministic scenarios run once with Playwright retries set to
  zero. A retry request or flaky result is `FAIL`.
- A scenario explicitly designated observational/nondeterministic in the
  locked matrix runs exactly three attempts, preserves all three receipts, and
  may yield only `CONDITIONAL` or `FAIL`; no selected attempt becomes `PASS`.
- Cleanup uncertainty: stop without recursive deletion.

## Evidence levels and PASS semantics

### Characterization gate

`PASS` means every required baseline scenario executed against the pinned
baseline with synthetic profiles, denied egress, raw receipts, hashes, and zero
secret/private leakage.

`CONDITIONAL` means the behavior is reproducible but depends on an explicit
environment or unresolved product decision named in the receipt.

`FAIL` means a required scenario is absent, skipped, flaky beyond the declared
budget, leaks content, permits egress, or cannot prove cleanup.

`UNKNOWN` means the required observation could not be established without
crossing an authority or safety boundary.

Aggregate `GREEN` requires every mandatory scenario to be `PASS`, zero
`CONDITIONAL`, zero `UNKNOWN`, zero `FAIL`, and independent clean-worktree
reproduction of the complete manifest. Any required `CONDITIONAL`, `UNKNOWN`,
or `FAIL` keeps `LW-P4-001` blocked.

Characterization `PASS` does not authorize application implementation.

### Later implementation decision gate

Only after characterization is independently GREEN may a new packet propose:

- exact candidate-owned files;
- a non-default candidate entrypoint;
- the Phase 3 contracts/packages it may import;
- old/new shared fixtures;
- storage authority and migration behavior;
- provider activation policy;
- rollback and stop conditions.

That packet requires explicit maintainer acceptance before `LW-P4-001` changes
application code.

## Mandatory characterization gates

Historical Phase 3 scope is closed at
`e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd`. Phase 3 validators must inspect
only their pinned base through that terminal commit and must prove both
base-to-terminal and terminal-to-current-HEAD ancestry. A separate Phase 4
active-scope validator inspects that same commit through current `HEAD` plus
current tracked/index/untracked changes.

1. phase-closed historical validators pass and a dedicated active Phase 4
   scope validator protects `e8b6a1b...` through current tracked/untracked
   state;
2. immutable baseline identity and clean-worktree check;
3. strict synthetic fixture/schema validation;
4. onboarding/provider-setup browser scenarios;
5. Chat send/stream/cancel/retry/error scenarios;
6. conversation persistence/reload/recovery scenarios;
7. Signal Report privacy/clipboard scenarios;
8. desktop/mobile/keyboard/forced-colors/reduced-motion scenarios;
9. offline and denied-egress scenarios;
10. secret/private sentinel scan over staging and promoted evidence closure;
11. full repository-control suite;
12. deterministic evidence manifest with exact commands and hashes;
13. independent clean-worktree reproduction;
14. diff, JSON, syntax, link, and whitespace hygiene.

No skipped, todo, or expected-failure scenario satisfies a mandatory gate.

## Frozen scenario matrix

All scenarios are deterministic, run once, and use Chromium unless marked as
the three-attempt observational class. Every row requires a machine-readable
network receipt, console receipt, in-profile assertion receipt, and scenario
result. `desktop` is `1440 × 900`; `mobile` is `390 × 844`.

| Scenario ID | Fixture/profile | Visible flow and oracle | Modes | Required extra evidence |
|---|---|---|---|---|
| `P4-ONB-001` | fresh/no provider | onboarding visible; skip/provider controls; absent and invalid configuration; reload writes exactly observed | desktop, keyboard | onboarding screenshot, storage projection |
| `P4-CHAT-001` | `P4-PRV-OLLAMA` fragmented success | visible send; exact request occurs; ordered deltas; one terminal completion; input reset; exact in-profile persistence and reload | desktop | request-shape receipt, stream sequence, storage projection, Signal Report projection |
| `P4-CHAT-002` | `P4-PRV-OPENAI` fragmented success | visible provider selection and synthetic credential entry; exact cloud-target request intercepted; ordered completion and reload | desktop | header-name-only receipt, request-shape receipt, credential-leak negative receipt |
| `P4-CHAT-003` | local empty/duplicate | empty send creates no request/write; double activation creates at most one operation | desktop, keyboard | request/write counts |
| `P4-CHAT-004` | local cancel before dispatch | cancellation/abandon action before dispatch yields no request and one visible terminal state if the baseline exposes one | desktop | terminal and zero-request receipt |
| `P4-CHAT-005` | local cancel after first delta | one request; first delta visible; cancel; no accepted late delta; no duplicate terminal; reload outcome observed | desktop | abort, late-delta, terminal, storage receipts |
| `P4-CHAT-006` | local 429/context limit | exact baseline retry/trim behavior; no post-delta retry; request and write counts observed | desktop | attempt sequence and visible prompt receipt |
| `P4-CHAT-007` | cloud 401 and policy refusal | authentication and policy-refusal paths remain distinct; no secret/body in diagnostics | desktop | status/error-class and leak-scan receipts |
| `P4-CHAT-008` | local timeout/network abort | visible timeout/network behavior; no silent fallback or second trust-class request | desktop | attempted-target and fallback-chain receipts |
| `P4-CHAT-009` | local malformed/empty/out-of-order stream | malformed fragment, empty success, missing/duplicate terminal, and out-of-order fragment behavior recorded without invented completion | desktop | raw-sequence-class and terminal-count receipts |
| `P4-CHAT-010` | local interrupted navigation | reload/navigation before first delta and after one delta; orphan/partial/duplicate state and recovery action observed | desktop | before/after storage projections |
| `P4-SIG-001` | completed/cancelled/failed states | open/copy/dismiss; unsent draft, content, credential, and raw body excluded; focus returns | desktop, keyboard | clipboard-class and ARIA/focus receipts |
| `P4-RESP-001` | local fragmented success | no blocking overlap/overflow; usable send/cancel/Signal Report controls | mobile | mobile screenshot and geometry receipt |
| `P4-A11Y-001` | local success and failure | focus order/visibility, modal containment/return, names, and status/error live-region semantics | keyboard, forced-colors, reduced-motion | ARIA snapshot and focus sequence |
| `P4-DEG-001` | warm stored synthetic conversation | warm-offline reload observed separately from provider network failure | offline | reload/storage/network receipts |
| `P4-EGR-001` | all fixtures | one unexpected origin, redirect, WebSocket, EventSource, worker/realtime, beacon, or navigation is injected and must fail before transmission | desktop | negative-control receipt |

The 16 rows above are reporting groups, not atomic tests. They contain exactly
these 39 mandatory subcases:

| Group | Mandatory atomic subcase IDs |
|---|---|
| `P4-ONB-001` | `P4-ONB-001A` fresh onboarding; `P4-ONB-001B` absent configuration; `P4-ONB-001C` invalid configuration plus reload |
| `P4-CHAT-001` | `P4-CHAT-001A` local fragmented success |
| `P4-CHAT-002` | `P4-CHAT-002A` cloud fragmented success |
| `P4-CHAT-003` | `P4-CHAT-003A` empty send; `P4-CHAT-003B` duplicate activation |
| `P4-CHAT-004` | `P4-CHAT-004A` cancel before dispatch |
| `P4-CHAT-005` | `P4-CHAT-005A` cancel after first delta; `P4-CHAT-005B` late delta after cancel; `P4-CHAT-005C` duplicate terminal after cancel |
| `P4-CHAT-006` | `P4-CHAT-006A` HTTP 429; `P4-CHAT-006B` context-limit response |
| `P4-CHAT-007` | `P4-CHAT-007A` HTTP 401; `P4-CHAT-007B` policy refusal |
| `P4-CHAT-008` | `P4-CHAT-008A` timeout; `P4-CHAT-008B` network abort |
| `P4-CHAT-009` | `P4-CHAT-009A` malformed fragment; `P4-CHAT-009B` empty success; `P4-CHAT-009C` missing terminal; `P4-CHAT-009D` duplicate terminal; `P4-CHAT-009E` out-of-order fragments |
| `P4-CHAT-010` | `P4-CHAT-010A` navigation before first delta; `P4-CHAT-010B` navigation after first delta |
| `P4-SIG-001` | `P4-SIG-001A` completed state; `P4-SIG-001B` cancelled state; `P4-SIG-001C` failed state |
| `P4-RESP-001` | `P4-RESP-001A` mobile bounded flow |
| `P4-A11Y-001` | `P4-A11Y-001A` keyboard/focus/name/live region; `P4-A11Y-001B` forced colors; `P4-A11Y-001C` reduced motion |
| `P4-DEG-001` | `P4-DEG-001A` warm-offline reload |
| `P4-EGR-001` | `P4-EGR-001A` unexpected HTTP origin; `P4-EGR-001B` redirect; `P4-EGR-001C` WebSocket; `P4-EGR-001D` EventSource; `P4-EGR-001E` worker/realtime channel; `P4-EGR-001F` beacon; `P4-EGR-001G` navigation |

Every atomic subcase gets a fresh profile and its own PASS receipt. A reporting
group is PASS only when every listed subcase is PASS. In `P4-EGR-001A` through
`G`, the injected transport action is expected to be aborted before
transmission; the subcase itself passes only when that expected abort and zero
wire transmission are proven.

If the baseline exposes no cancel control or terminal semantic required by a
row, that row is `UNKNOWN`; it is not silently simulated and aggregate status
cannot be GREEN.

## Exact execution commands

The later `LW-P4-CHAR-001` claim must freeze and execute these command shapes
with `TEMP`, `TMP`, npm cache, Playwright browser cache, and evidence staging
root under its run-owned `runtime/tmp/` directory:

```powershell
npm ci --prefix tests/characterization --ignore-scripts
npx --prefix tests/characterization playwright test --config tests/characterization/playwright.config.mjs specs/phase4-chat.spec.mjs --workers=1 --retries=0
node --test tests/reengineering/phase4-characterization-validation.test.mjs
node tools/reengineering/validate-phase4-characterization.mjs --evidence reengineering/evidence/phase-4/LW-P4-CHAR-001
node --test tests/reengineering/*.test.mjs
git diff --check
```

The run script may wrap these commands to record exit codes and hashes but may
not replace, skip, or narrow them.

## Anti-reward-hacking rules

- A mocked response cannot satisfy a real-provider compatibility claim.
- A shell render cannot satisfy send/stream/persistence/recovery acceptance.
- Source inspection cannot replace an executable browser observation.
- Direct storage injection cannot replace a user-visible primary flow.
- One viewport cannot satisfy desktop/mobile/accessibility gates.
- A screenshot without machine-readable state and network receipts is
  insufficient.
- A smoke test cannot replace interruption, failure, cancellation, and recovery
  scenarios.
- Passing by weakening selectors, fixtures, egress denial, leak scans, or
  baseline identity is a failure.
- Test-only branches in application/legacy code are forbidden.
- AI prose judgment cannot replace required raw evidence or maintainer
  decisions.
- The validator must include negative fixtures that reject an `apps/web` edit,
  Phase 3 package import, package-manifest change, unauthorized listener or
  network API, nonempty or real-looking profile, reparse traversal, missing
  ownership marker, missing expected request, post-delta retry, duplicate
  terminal, leaked sentinel/content, skipped scenario, and an unmanifested
  evidence artifact.
- Review model/count is routing metadata only. Every reviewer finding must be
  dispositioned with an executable control, accepted documented constraint, or
  explicit unresolved blocker.

## Owned paths for characterization execution

The later characterization claim may own only these additive or exact
control-state paths:

- `tests/characterization/fixtures/phase4-chat-contract.json`;
- `tests/characterization/specs/phase4-chat.spec.mjs`;
- `tests/characterization/support/phase4-chat.mjs`;
- `tools/reengineering/run-phase4-characterization.ps1`;
- `tools/reengineering/validate-phase4-characterization.mjs`;
- `tools/reengineering/validate-phase4-active-scope.mjs`;
- `tests/reengineering/phase4-characterization-validation.test.mjs`;
- `tests/reengineering/phase4-active-scope.test.mjs`;
- `reengineering/evidence/phase-4/LW-P4-CHAR-001/**`;
- `docs/agents/claims/LW-P4-CHAR-001.md`;
- `docs/agents/handoffs/LW-P4-CHAR-001.md`;
- `reengineering/EXECUTION_CHECKLIST.md`;
- `reengineering/BLOCKERBOARD.md`;
- `docs/COMPATIBILITY.md`;
- `reengineering/PARITY_MATRIX.md`;
- `reengineering/MIGRATION_LEDGER.md`;
- `PROJECT_STATE.md`;
- `ROADMAP.md`;
- `runtime/checkpoints/LATEST.md`;
- `runtime/checkpoints/LATEST.json`;
- `reengineering/checkpoints/LATEST.md`;
- `reengineering/checkpoints/LATEST.json`.

It may not modify the baseline worktree, legacy runtime, candidate application,
Phase 3 packages, or deployment paths.

It also may not modify any root/package manifest, shared Playwright config,
existing characterization spec/support/fixture, app import graph, or Phase 3
validator. Imports from `apps/web` and `packages/{contracts,kernel,storage,providers}`
are forbidden. Any required dependency or shared-harness change stops the
workstream for a packet amendment.

## Machine-readable lock block

The characterization validator must extract and match this exact fenced block;
the surrounding Markdown is its human projection.

```json
{
  "schema": "latticework.phase4-characterization-preflight.v1",
  "base_commit": "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd",
  "phase3_terminal_commit": "e8b6a1bfe9f3f5c59f9d78b20aaa8ed2f649c4cd",
  "baseline_sha": "e7585999fc1af2707f410ae87356cf2b52e08d9c",
  "work_id": "LW-P4-CHAR-001",
  "implementation_work_id": "LW-P4-001",
  "implementation_packet_id": "LW-P4-IMPL-PREFLIGHT-001",
  "implementation_authorized": false,
  "real_data_authorized": false,
  "real_credentials_authorized": false,
  "real_provider_traffic_authorized": false,
  "provider_fixtures": ["P4-PRV-OLLAMA", "P4-PRV-OPENAI"],
  "caller_paths": ["primary-chat"],
  "playwright_workers": 1,
  "playwright_retries": 0,
  "mandatory_scenario_groups": 16,
  "mandatory_atomic_subcases": 39,
  "green_requires_all_pass": true,
  "evidence_root": "reengineering/evidence/phase-4/LW-P4-CHAR-001"
}
```

## Rollback and backout

Preflight rollback removes only this planning commit.

Characterization rollback removes only additive harness code and generated
unaccepted staging output. Accepted evidence is retained with a superseding
invalidation receipt. The immutable baseline, legacy runtime/data, candidate
application, provider configuration, routes, and deployment artifacts remain
unchanged.

## Stop conditions

Stop and request maintainer direction if:

- required behavior cannot be observed without real credentials, real provider
  traffic, real user data, or a listener other than the exact static-server
  exception;
- a product policy choice is required;
- baseline behavior is nondeterministic beyond the bounded repeat budget;
- evidence would include private content or secrets;
- exact cleanup scope cannot be proven;
- a new runtime dependency is required;
- an owned path outside the exact list above is required;
- implementation, registration, activation, migration, or cutover would be
  implied.

## Deliverables

This SpecSwarm lock must leave exactly:

1. this locked preflight;
2. an atomic Phase 4 preflight/characterization row in
   `reengineering/EXECUTION_CHECKLIST.md`;
3. linked Phase 4 characterization and implementation blockers in
   `reengineering/BLOCKERBOARD.md`.

Required checkpoint and claim/handoff files are repository-control state, not
additional planning reports.

## Terminal condition

The packet is complete when:

- SpecSwarm final QA recommends lock with no unresolved blocking defect;
- all three planning artifacts agree;
- repository controls and hygiene pass;
- the checkpoint names `LW-P4-CHAR-001` as the next additive execution claim;
- `LW-P4-001` remains blocked pending characterization evidence and a later
  explicit maintainer implementation decision.
