# `LW-P3-DEC-001` Evidence

**Status:** MEASURED PROPOSAL — MAINTAINER DISPOSITION PENDING  
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`  
**Phase 3 base:** `6704dd502a140fce2fe8e06f8db336d0bd3839a5`  
**Candidate:** `22c3742cdc7863f16bf190ee23ddc67eabc20ec1`  
**Date:** 2026-07-30

## Claim

This bundle verifies the Phase 3 decision packet only. It contains no storage
repository, migration runner, provider adapter, credential use, network
listener, legacy feature migration, route change, or cutover.

## Command receipts

| Receipt | Result | Artifact |
|---|---|---|
| Canonical packet validator | `valid: true`; Git scope checked from pinned base; implementation authority false | [`commands/validator/`](commands/validator/) |
| Focused positive/negative controls | 23 pass, 0 fail | [`commands/focused/`](commands/focused/) |
| Full repository controls | 75 pass, 0 fail, 0 skip | [`commands/controls/`](commands/controls/) |

All commands ran with temporary paths under `Z:\LATTICEWORK\runtime\tmp`; the
full suite used immutable baseline root
`Z:\LATTICEWORK_BASELINE_e7585999`.

## Review-driven corrections

Two independent bounded source reviews challenged the first draft. The final
candidate:

- treats the 252 baseline preservation IDs as an immutable floor while allowing
  additive inventory discovery;
- uses stable dataset ID `conversation` with separate schema version and only
  `conversations`/`messages` in the first descriptor;
- excludes credentials, device-key, identity/crypto, wallet/chain,
  session-token, cache, desktop, and remote datasets from Phase 3 copy/export;
- defines exact hostile-import staging and retained terminal rollback receipts;
- forbids portable content-derived digests for future real data without a
  separate privacy decision;
- makes each adapter invocation one wire attempt with router-owned,
  zero-default retry, stable operation identity, and unique attempt identity;
- binds credential resolution to a prior immutable exact egress grant;
- distinguishes transport abort from provider cancellation acknowledgement;
- defines viable, narrowly constrained pairing bootstrap routes; and
- prevents the canonical validator CLI from disabling or rebasing Git-scope
  validation.

Each boundary above is represented in structured packet fields and exercised
by a negative mutation test.

## Authority boundary

ADR-004, ADR-005, and ADR-006 remain **Proposed** with **PENDING** receipts.
`LW-BLK-005`, `LW-BLK-006`, and `LW-BLK-007` remain open. A green evidence
bundle does not accept an ADR or authorize implementation.
