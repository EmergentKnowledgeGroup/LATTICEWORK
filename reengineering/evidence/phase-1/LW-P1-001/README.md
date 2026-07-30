# `LW-P1-001` — Executable Baseline Characterization

**Evidence label:** `MEASURED`  
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`  
**Baseline worktree:** `Z:\LATTICEWORK_BASELINE_e7585999`  
**Harness:** Playwright 1.62.0 with bundled Chromium 151 on Windows 10

The automated evidence in this directory is labeled `MEASURED`. A separate QA
run reproduced and accepted the bounded work unit as `VERIFIED`; see
[`independent-review/README.md`](independent-review/README.md).

## Result

The final ordinary (non-snapshot-update) run passed all seven bounded scenarios:

1. HTTP first run and fresh storage initialization.
2. Onboarding skip to the initialized Garden.
3. Chat shell, Signal Report open/copy, and unsent-input exclusion.
4. Garden rendering without `navigator.gpu`.
5. Garden at 390 × 844 with the observed Presence-button/title overlap.
6. Warm offline reload preserving the observed navigation failure.
7. Synthetic provider/persistence contract validation.

The evidence safety gate recorded:

- 96 blocked out-of-origin HTTP requests.
- 1 blocked external WebSocket attempt.
- 8 blocked realtime-channel attempts.
- 0 allowed external network requests.
- No synthetic private-sentinel leak.
- 7 expected tests, 0 skipped, 0 unexpected, and 0 flaky.

## Exact command

The final run was captured by:

```powershell
node tools/reengineering/run-evidence-command.mjs `
  --cwd . `
  --output reengineering/evidence/phase-1/LW-P1-001/command `
  --id LW-P1-001-playwright `
  --baseline-sha e7585999fc1af2707f410ae87356cf2b52e08d9c `
  -- powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File tools/reengineering/run-phase1-characterization.ps1
```

The wrapper recorded exit code `0`, duration, environment, repository status,
stdout/stderr hashes, and the exact command in
[`command/manifest.json`](command/manifest.json).

## Evidence index

- [`summary.json`](summary.json) — validator result, per-test status, safety
  counts, and extracted attachment hashes.
- [`manifest.json`](manifest.json) — directory-level hash manifest.
- [`playwright/playwright-results.json`](playwright/playwright-results.json) —
  raw Playwright JSON output.
- [`controls/manifest.json`](controls/manifest.json) — exact 19-of-19
  repository-control command, exit, environment, and log hashes.
- [`control-plane/manifest.json`](control-plane/manifest.json) — live canonical
  document/ADR/checkpoint control-plane validation command and exit.
- [`independent-review/`](independent-review/) — separate-port independent
  reproduction, extracted artifacts, and acceptance.
- [`artifacts/shell-and-storage/runtime-snapshot.json`](artifacts/shell-and-storage/runtime-snapshot.json)
  — fresh storage/service-worker/cache shape.
- [`artifacts/mobile/mobile-overlap.json`](artifacts/mobile/mobile-overlap.json)
  — measured 390 × 844 geometry.
- [`artifacts/offline/offline-reload-observation.json`](artifacts/offline/offline-reload-observation.json)
  — warm offline reload failure.
- [`artifacts/degraded-gpu/garden-no-webgpu.png`](artifacts/degraded-gpu/garden-no-webgpu.png)
  — no-WebGPU Garden fallback.
- [`artifacts/chat-signal-report/signal-report.png`](artifacts/chat-signal-report/signal-report.png)
  — bounded diagnostics modal.

## Limits

This package does not establish provider behavior, message generation,
record-value compatibility, migration, cross-browser/OS parity, full
accessibility, PWA update/rollback, performance budgets, desktop packaging, or
candidate parity. It authorizes no runtime architecture by itself.
