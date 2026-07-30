# Phase 1 baseline characterization

**Status:** executable characterization of the immutable upstream baseline
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`

This isolated Playwright project exercises the preserved baseline at
`Z:\LATTICEWORK_BASELINE_e7585999`. It does not modify or import source from the
baseline worktree.

Run from `Z:\LATTICEWORK`:

```powershell
powershell -ExecutionPolicy Bypass -File tools\reengineering\run-phase1-characterization.ps1
```

The runner:

1. verifies the immutable worktree SHA and clean state;
2. redirects npm, browser, and temporary files to `Z:\LATTICEWORK\runtime\tmp`;
3. installs exactly `@playwright/test@1.62.0` from the committed lockfile;
4. installs the matching Chromium build under the project scratch directory;
5. serves only the immutable baseline on loopback;
6. blocks every HTTP(S) request except the loopback baseline origin; and
7. writes receipts under
   `reengineering/evidence/phase-1/LW-P1-001/playwright/`.

Use `-UpdateSnapshots` only when intentionally creating or reviewing visual
characterization baselines:

```powershell
powershell -ExecutionPolicy Bypass -File tools\reengineering\run-phase1-characterization.ps1 -UpdateSnapshots
```

The fixtures contain names and obvious test sentinels only. They contain no real
provider credential, imported conversation, personal record, or mutable
external endpoint.
