# LW-M0-INV-001 — Baseline Inventory

**Scope:** read-only static inventory of `Z:\LATTICEWORK_BASELINE_e7585999` at `e7585999fc1af2707f410ae87356cf2b52e08d9c`.

**Terminal condition:** **MET** — evidence artifacts are complete and the baseline remained unmodified (`git status --short --branch` returned only `## HEAD (no branch)`). No claim here establishes runtime behavior, compatibility, or release readiness.

## Decision summary

- **OBSERVED:** 514 tracked files; 431 text files; 365,685 physical text lines; 83 binary files. This is a documentation/asset-heavy snapshot: `docs/` holds 393 files, 135,725,003 bytes, and 195,686 LOC.
- **OBSERVED:** the principal executable payloads are very large HTML documents: `index.html` (2,779,808 bytes / 65,387 LOC) and `app.html` (1,997,992 / 51,684). `docs/app.html` is an exact duplicate of `index.html`, not of root `app.html`.
- **OBSERVED:** 29 exact-content duplicate groups produce 3,903,714 redundant bytes and 78,415 redundant text LOC beyond one copy per group. Fourteen groups explicitly cross root and `docs/`; exact pairs are in `exact-duplicates.csv`.
- **OBSERVED:** version indicators are inconsistent: root `version.json` and root `app.html` say `5.8.0`; `index.html`, `docs/app.html`, root/docs `sw.js`, and `docs/version.json` say `5.79.22`; Electron manifest says `4.6.0`; Tauri Cargo manifest says `5.43.8`.
- **INFERRED:** the baseline has multiple independently evolving distribution surfaces (root, docs/GitHub-pages-like mirror, Electron, Tauri, workers). Any behavior-preserving modernization needs a declared source-of-truth and mirror policy before edits.

## Inventory measurements

| Dimension | Result | Artifact |
|---|---:|---|
| Tracked files | 514 | `tracked-files.csv` |
| Text LOC | 365,685 | `language-summary.csv` |
| HTML | 87 files / 226,472 LOC | `language-summary.csv` |
| JavaScript | 132 files / 84,126 LOC | `language-summary.csv` |
| Markdown | 145 files / 40,440 LOC | `language-summary.csv` |
| Python | 13 files / 5,224 LOC | `language-summary.csv` |
| Exact duplicate groups | 29 | `exact-duplicates.json` |
| Extra exact duplicate LOC | 78,415 | `exact-duplicates.csv` |

The largest tracked files are image assets under `docs/assets/harmonia/`; the largest text/executable artifacts are `docs/lib/web-llm.min.js` (4,039,100 bytes), `index.html`, `app.html`, and `docs/app.html`. See `largest-files.csv` for the ranked top 50.

## Root/docs mirrors

**OBSERVED:** the root/docs crossing exact duplicate pairs are `ARCHITECTURE_INTENT.md`, `COUNCIL-DECISIONS.md`, `DRACO.md`, `ECHO.md`, `EXTERNAL-AI-PROTOCOL.md`, `GARDEN_LANGUAGE.md`, `LEORA.md`, `LYRA.md`, `QUICK-START.md`, `TELEGRAM-SETUP.md`, `index.html` ↔ `docs/app.html`, `icon-192.png`, `icon-512.png`, and `telegram-worker.js`. Paths and SHA-256 values are machine-readable in `exact-duplicates.json`.

## Entrypoints and execution modes

| Surface | OBSERVED entrypoint / mode |
|---|---|
| Static browser | `index.html`, `app.html`, `chalkboard.html`, `landing.html`, `install.html`; PWA `manifest.json` and `sw.js` are present. |
| Local HTTP | `server.py` / `server.js` listen on `PORT` default 3000; `start-freelattice.bat` / `.sh` can use `python -m http.server 3000`. |
| Electron | `desktop/package.json`: `main.js`; `npm start` = `electron .`; builds use `electron-builder`. |
| Tauri | `desktop/src-tauri/src/main.rs`, `Cargo.toml`, `tauri.conf.json`; Cargo package `freelattice-desktop`. |
| Cloudflare workers | root `worker/search.js`; `desktop/data-proxy-worker/worker.js`; `desktop/telegram-worker/worker.js`; corresponding Wrangler configuration is tracked. |
| Tests | `node tests/smoke.js` is the active executable smoke harness; `tests/smoke-history.js` is explicitly described in source as archived/superseded assertions. |

`entrypoint-evidence.json` preserves the inspected entrypoint/configuration previews without altering the baseline.

## Dependencies and external reachability hints

**OBSERVED:** no root `package.json` is tracked. The dependency manifests found are `desktop/package.json`, `desktop/src-tauri/Cargo.toml`/`Cargo.lock`, and worker Wrangler files plus `desktop/telegram-worker/package.json`. Electron declares `electron-store`, Electron `^28.0.0`, and electron-builder `^24.9.0`; Tauri declares tauri 2, serde, serde_json, and dirs 5; the Telegram worker declares Wrangler `^3.0.0`.

**OBSERVED:** static URL/provider/CDN regex hits occur in the primary HTML surfaces and modules (e.g. CDN host patterns and provider names including OpenRouter, Groq, Together). These are *hints*, not a proof of live network calls or required service dependencies. The large line-level records are preserved externally; their exact location and SHA-256 values are in the in-repo `raw-artifact-manifest.json`.

## Browser persistence and globals

**OBSERVED:** literal-string extraction found 194 distinct localStorage keys (455 path-level occurrences), two sessionStorage keys, nine IndexedDB database names, and five object-store names. The complete path-qualified inventory is `storage-identifiers.csv`. High-volume raw static call and window-access records are preserved externally, with paths and hashes in `raw-artifact-manifest.json`.

- IndexedDB databases: `FractalGarden`, `FreeLatticeGardenMemory`, `FreeLatticeMemory`, `FreeLatticeNursery`, `FreeLatticeScience`, `FreeLatticeSkills`, `FreeLatticeStudio`, `FreeLatticeWallet`, `LatticeWalletBackup`.
- Extracted object stores: `GardenQuestions`, `marks`, `StudioCreations`, `urls`, `wallets`.
- Session keys: `fl-city-opened`, `fl_inboxLetter_` (the latter is a literal prefix, indicating dynamic suffixing).
- LocalStorage names are dominated by the `fl-`/`fl_` prefixes (184 of 194 unique literal keys); a small `chalkboard-` family is also present.
- **OBSERVED:** 244 distinct `window.<symbol> =` names were statically found. `window-symbol-assignments.csv` contains the unique assignment/path pairs; `window-hits.csv` additionally records direct accesses. Static scanning cannot establish ownership, order, or runtime reachability.

## Tests

**OBSERVED:** two files live under `tests/`: `tests/smoke.js` (11,381 LOC) and `tests/smoke-history.js` (99 LOC). Ten test/spec-named tracked artifacts are catalogued in `test-inventory.csv`; most additional matches are documentation/specification files under `docs/library/` or `tools/`, not demonstrated executable tests. This inventory did not execute the smoke suite.

## Reproduction, tools, and exclusions

Commands executed:

```powershell
git -C Z:\LATTICEWORK_BASELINE_e7585999 rev-parse HEAD
git -C Z:\LATTICEWORK_BASELINE_e7585999 status --short --branch
powershell -NoProfile -ExecutionPolicy Bypass -File Z:\LATTICEWORK\reengineering\evidence\phase-0\LW-M0-INV-001\inventory.ps1 -Baseline Z:\LATTICEWORK_BASELINE_e7585999 -OutDir Z:\LATTICEWORK\reengineering\evidence\phase-0\LW-M0-INV-001
```

Tool versions: PowerShell 5.1.19041.7548; Git 2.50.1.windows.1; Node v24.13.0; Python 3.13.12; ripgrep 15.1.0. The collector validates every generated JSON file with `ConvertFrom-Json` before success.

Exclusions/limitations: only `git ls-files` tracked paths were included; ignored/untracked files were excluded. LOC is physical lines (blank/comments included); files containing any NUL byte are counted as binary and have no LOC. Duplicate detection is byte-exact SHA-256 only. Regex evidence does not prove runtime execution, key construction, data schema, or external service availability. The six high-volume raw regex-hit artifacts are intentionally external to this repository; `raw-artifact-manifest.json` is the integrity pointer.

## Unresolved unknowns

- **UNKNOWN:** canonical source-of-truth and synchronization policy among root `app.html`, `index.html`, and `docs/app.html`.
- **UNKNOWN:** runtime reachability and schema semantics of dynamic storage keys/stores and global symbols.
- **UNKNOWN:** whether all three desktop/worker routes are current, buildable, or deployed.
- **UNKNOWN:** test pass/fail state; no tests were run for this inventory-only work unit.
