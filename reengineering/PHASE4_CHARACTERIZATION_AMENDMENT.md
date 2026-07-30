<!-- Status: LOCKED FOR VALIDATION | Owner: Maintainers | Work: LW-P4-AMEND-001 -->

# Phase 4 characterization amendment

## Control

- **Status:** LOCKED FOR VALIDATION
- **Version:** `1.0`
- **Date:** `2026-07-30`
- **Base commit:** `a9f8cdd877e835f7bd86edd49d44ba0b711ef205`
- **Original packet:** `reengineering/PHASE4_PREFLIGHT.md`
- **Original evidence:** `reengineering/evidence/phase-4/LW-P4-CHAR-001/`
- **Implementation authority:** none

## Maintainer receipt

> Approved. Treat confirmed FreeLattice defects as documented divergences, allow the local fake streaming server, and prepare the corrected LATTICEWORK implementation packet. Keep real data, credentials, provider traffic, activation, and deployment disabled.

This receipt changes how the already-observed baseline defects are dispositioned
and authorizes one test-only listener. It does not make a defect a `PASS`, prove
candidate compatibility, or authorize `LW-P4-001`.

## Amended evidence language

- `PASS` retains its original meaning: the required baseline behavior was
  reproduced by the locked evidence procedure.
- `ACCEPTED_DIVERGENCE` means the original receipt proves a baseline defect or
  missing behavior and the maintainer accepts a named, testable candidate
  difference. The original `FAIL` or `UNKNOWN` receipt remains immutable.
- `RETEST_WITH_LOOPBACK_STREAM_FIXTURE` means the observation must be rerun
  against the test listener below.
- `RETEST_WITH_EXISTING_HARNESS` means the observation must be rerun without
  new network authority.
- `BLOCKED` means the observation still lacks a safe, complete receipt.

An amended characterization can be `GREEN` only when all 39 atomic cases have
either an original `PASS`, an `ACCEPTED_DIVERGENCE`, or a new receipted `PASS`;
there are zero remaining retest or blocked dispositions; the amended manifest
is independently reproduced; and the original result status is preserved.

## Accepted divergences

| Cases | Original evidence | Divergence | Candidate obligation |
|---|---|---|---|
| `P4-CHAT-002A`, `P4-CHAT-007A`, `P4-CHAT-007B` | per-case `observation.json` and `network.json`; aggregate summary | Visible OpenAI selection dispatches the Groq target | Bind the visible selection to the selected mock adapter; prove correct target identity, failure mapping, and no cross-provider fallback |
| `P4-CHAT-004A`, `P4-CHAT-005A`, `P4-CHAT-005B`, `P4-CHAT-005C`, `P4-SIG-001B` | per-case `observation.json`; aggregate summary | Primary Chat exposes no visible cancellation control | Provide visible cancellation; prove cancel-before-dispatch, cancel-after-delta, one terminal, late-delta rejection, persistence, and redacted diagnostics |

These eight cases are never relabeled baseline `PASS`.

## Required bounded retests

### Test-only streaming fixture

`P4-CHAT-001A`, `P4-CHAT-003B`, `P4-CHAT-010A`,
`P4-CHAT-010B`, and `P4-RESP-001A` require a controlled fragmented stream.

The fixture:

- binds exactly `127.0.0.1` on an operating-system-selected port;
- is created and stopped by the current test run and cannot reuse a listener;
- accepts only a fixed method, path, fixture ID, and synthetic content schema;
- performs no DNS lookup, forwarding, redirect, credential resolution, or
  external request;
- records monotonic fragment timing, connection closure, and teardown;
- lives only under the marked run directory in
  `runtime/tmp/phase4-characterization/<run-id>/`;
- rejects wildcard, IPv6-any, LAN, public, proxy, worker, peer, gateway, and
  Telegram binding;
- is absent before evidence promotion and after cleanup.

This listener is a characterization/E2E fixture, not the ADR-006 proxy and not
an application provider adapter.

### Existing harness

`P4-A11Y-001A`, `P4-A11Y-001B`, `P4-A11Y-001C`,
`P4-CHAT-008A`, and `P4-DEG-001A` must be rerun with sharpened deterministic
assertions. Absence of a live region, timeout contract, or offline recovery is
recorded explicitly; it is not silently converted to success.

`P4-ONB-001C` may persist only a clearly synthetic, non-secret invalid
configuration sentinel inside its fresh disposable browser profile. The
sentinel is forbidden from promoted evidence, must be found absent by the
content scan, and the entire profile must be deleted. No real credential,
ambient credential source, provider call, or durable user store is authorized.

## Locked amendment

```json
{
  "schema": "latticework.phase4-characterization-amendment.v1",
  "work_id": "LW-P4-AMEND-001",
  "original_work_id": "LW-P4-CHAR-001",
  "implementation_packet_id": "LW-P4-IMPL-PREFLIGHT-001",
  "implementation_authorized": false,
  "real_data_authorized": false,
  "real_credentials_authorized": false,
  "real_provider_traffic_authorized": false,
  "activation_authorized": false,
  "deployment_authorized": false,
  "cutover_authorized": false,
  "legacy_remains_default": true,
  "accepted_divergence_ids": [
    "P4-CHAT-002A",
    "P4-CHAT-004A",
    "P4-CHAT-005A",
    "P4-CHAT-005B",
    "P4-CHAT-005C",
    "P4-CHAT-007A",
    "P4-CHAT-007B",
    "P4-SIG-001B"
  ],
  "loopback_retest_ids": [
    "P4-CHAT-001A",
    "P4-CHAT-003B",
    "P4-CHAT-010A",
    "P4-CHAT-010B",
    "P4-RESP-001A"
  ],
  "existing_harness_retest_ids": [
    "P4-A11Y-001A",
    "P4-A11Y-001B",
    "P4-A11Y-001C",
    "P4-CHAT-008A",
    "P4-DEG-001A",
    "P4-ONB-001C"
  ],
  "listener": {
    "purpose": "test-only synthetic fragmented streaming",
    "bind": "127.0.0.1",
    "port": "os-selected",
    "run_owned": true,
    "fixture_only": true,
    "external_egress": false,
    "application_runtime": false
  },
  "amended_green_requires": {
    "atomic_cases": 39,
    "allowed_final_dispositions": [
      "PASS",
      "ACCEPTED_DIVERGENCE"
    ],
    "remaining_retests": 0,
    "remaining_blocked": 0,
    "independent_reproduction": true,
    "preserve_original_results": true
  }
}
```

## Current decision

**PROPOSED:** this amendment is complete as a control packet. The original
characterization remains `BLOCKED` until the 11 bounded retests are executed,
receipted, and independently reproduced. `LW-BLK-009` remains open.
`LW-BLK-010` remains independently open until the corrected implementation
packet is explicitly accepted.
