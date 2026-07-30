<!-- Status: LIVING | Owner: Audit lead | Freeze after baseline verification -->

# Upstream Baseline

## Identity

| Field | Value |
|---|---|
| Repository | `Chaos2Cured/FreeLattice` |
| Branch | `main` |
| Commit | `e7585999fc1af2707f410ae87356cf2b52e08d9c` |
| Commit date | `2026-07-30T01:05:26Z` |
| Baseline tag | `v0.0.0-upstream-baseline` |
| Evidence capture | `2026-07-30T08:05:14Z` |
| Clone date | `UNKNOWN — clone creation time was not recorded independently` |
| Archive | `Z:\LATTICEWORK_PRESERVATION\freelattice-baseline-e7585999fc1af2707f410ae87356cf2b52e08d9c.zip` |
| Archive SHA-256 | `fe7c401aee963051993fd7c0794bfe9de9deb8f8ebbba203a6ee4ce1e1302861` |

**MEASURED:** the baseline is an immutable detached worktree at
`Z:\LATTICEWORK_BASELINE_e7585999`; its capture manifest is
[`reengineering/evidence/phase-0/LW-P0-001/manifest.json`](../reengineering/evidence/phase-0/LW-P0-001/manifest.json).
The archive is intentionally external because it is 124,714,814 bytes and exceeds
GitHub's ordinary file limit. The repository manifest records its absolute path,
size, and hash.

## Environment

| Item | Value |
|---|---|
| Operating system | Microsoft Windows `10.0.19045`, x64 |
| CPU and memory | Intel Core i9-12900K, 24 logical processors; 68,423,118,848 bytes RAM |
| GPU | Intel UHD Graphics 770 and NVIDIA GeForce RTX 3090 Ti; WMI adapter-memory values are not publication-grade |
| Browser and version | Chrome `150.0.7871.187`; Edge `150.0.4078.105` |
| Node or runtime version | Node `v24.13.0`; Python `3.13.12`; PowerShell `7.6.3` |
| Package manager | npm `11.6.2` |
| Test command | `node tests/smoke.js` |
| Build command | `UNKNOWN — no root package manifest or canonical build command is tracked` |
| Local model service | Source contains Ollama/LM Studio/custom endpoint paths; no model service was exercised |
| Cloud provider configuration | Source contains multiple provider definitions; no credentials or provider request was exercised |

Raw environment evidence:
[`reengineering/evidence/phase-0/LW-P0-001-environment/`](../reengineering/evidence/phase-0/LW-P0-001-environment/).

## Repository snapshot

Record measured values only.

| Metric | Value | Command | Raw artifact |
|---|---:|---|---|
| Tracked files | 514 | `git ls-files` through `capture-baseline.mjs` | [`baseline-summary.json`](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Tracked text lines | 365,685 | repository text inventory | [`LW-M0-INV-001.md`](../reengineering/evidence/phase-0/LW-M0-INV-001/LW-M0-INV-001.md) |
| First-party source lines | 302,560 | extension/path-scoped source inventory | [`baseline-summary.json`](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Largest first-party source file | `docs/app.html`, 65,387 lines; tied byte-for-byte by `index.html` | repository text inventory | [`baseline-summary.json`](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Exact duplicate first-party source | 9 groups; 75,123 redundant lines | source-only SHA-256 inventory | [`baseline-summary.json`](../reengineering/evidence/phase-0/LW-P0-001/baseline-summary.json) |
| Exact duplicates across all tracked files | 29 groups; 78,415 redundant text lines | all-tracked SHA-256 inventory | [`LW-M0-INV-001.md`](../reengineering/evidence/phase-0/LW-M0-INV-001/LW-M0-INV-001.md) |
| Smoke assertions observed | 3,213 | `node tests/smoke.js` | [`stdout.log`](../reengineering/evidence/phase-0/LW-P0-002-smoke/stdout.log) |
| Passing smoke assertions | 3,106 | `node tests/smoke.js` | [`manifest.json`](../reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json) |
| Failing smoke assertions | 107 | `node tests/smoke.js` | [`manifest.json`](../reengineering/evidence/phase-0/LW-P0-002-smoke/manifest.json) |
| Direct dependency declarations | 9 declarations across 3 manifests | manifest inspection | [`LW-M0-INV-001.md`](../reengineering/evidence/phase-0/LW-M0-INV-001/LW-M0-INV-001.md) |

The duplicate measurements use different scopes and are both valid: 75,123 is
first-party source only; 78,415 is all tracked text beyond one copy per exact
content group.

## Baseline workflows

For each workflow, record setup, steps, expected behavior, observed behavior, screenshots or traces, storage changes, network calls, and cleanup.

- Launch and first-run experience — **C1 OBSERVED** for Chrome over local HTTP:
  onboarding, skip, Garden boot, first-load storage/network side effects.
- Local model connection.
- Cloud model connection.
- Chat and memory.
- Canvas or vision workflow.
- Garden or persistent-identity workflow.
- Core or permanent-wisdom workflow.
- Import and export.
- Offline and service-worker behavior — **C1 OBSERVED** for registration/cache and
  one failed offline reload; update/rollback remain UNKNOWN.
- Peer-to-peer behavior.
- Failure and recovery — **C1 OBSERVED** for Signal Report open/copy only.

Browser receipt:
[`LW-P0-003-browser/README.md`](../reengineering/evidence/phase-0/LW-P0-003-browser/README.md).
It also records one installed-Edge first-load observation and one isolated
direct-`file://` Chrome first-render observation. Those additions remain C1
launch evidence, not cross-browser or direct-file workflow compatibility.
All unannotated workflows remain **UNKNOWN**. Even the C1 rows are bounded
observations, not complete compatibility evidence.

## Test status

Do not summarize only the final count.

Record:

- Exact command.
- Full output.
- Exit code.
- Duration.
- Environment.
- Known flaky tests.
- Tests that do not assert behavior.
- Tests that pass despite runtime errors.
- Tests that cannot run and why.

**MEASURED — current smoke**

```text
Command: node tests/smoke.js
Working directory: Z:\LATTICEWORK_BASELINE_e7585999
Exit: 1
Duration: 4.434 seconds
Result: 3,106 passed; 107 failed
```

The 107 failures consist of 100 stale version/cache assertions, four historical
feature/structure literals, one executable-bit/environment assertion, and two
current source-behavior checks. This suite is a cumulative source/assertion ledger,
not sufficient browser characterization.

**MEASURED — archived smoke history**

`node tests/smoke-history.js` exited 1 after 0.053 seconds with a parse-time
`SyntaxError: Unexpected end of input` at line 99. Receipt:
[`reengineering/evidence/phase-0/LW-P0-002-smoke-history/`](../reengineering/evidence/phase-0/LW-P0-002-smoke-history/).

No test was weakened, removed, or changed.

## Freeze rule

This document is not frozen yet. Browser/runtime/network, data-schema, supported
platform, and performance evidence remain open Phase 0 blockers. After verification,
corrections must be recorded as corrections, not silent edits.
