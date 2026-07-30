# LW-P0-003 browser characterization

**Status:** PARTIAL PHASE 0 RECEIPT  
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`  
**Server:** `python -m http.server 4173 --bind 127.0.0.1` from the immutable
baseline worktree  
**Browser:** Playwright CLI using installed Chrome `150.0.0.0` user agent on
Windows 10  
**Date:** 2026-07-30

No credential, provider request, imported file, peer connection, or external
mutation was supplied by the operator. The browser profile and npm cache were
located under `Z:\LATTICEWORK\runtime\tmp`.

## Observations

### Cold first load

- **MEASURED:** the initial document reported DOM content loaded at about
  1,593 ms, load at about 1,693 ms, and 2,780,108 transfer bytes in this one
  desktop run. These are observations, not accepted budgets.
- **OBSERVED:** the onboarding dialog appeared over an already initialized Garden.
  The app initialized 12 canvases and a WebGL Garden before onboarding was
  completed.
- **OBSERVED:** before the owner selected “Skip — just explore,” the app had
  created 19 localStorage keys and 17 IndexedDB databases with 24 object stores.
- **OBSERVED:** startup assigned/migrated 100 Lattice Points and initialized
  Garden, identity, memory, wallet, skills, presence, and continuity surfaces.
  This means “first look” is not a side-effect-free state.
- **OBSERVED:** the active service worker was `docs/sw.js` with cache
  `freelattice-v5.79.22`; the cache held 174 requests after first load.

Raw runtime structure is in `runtime-probe/stdout.log`. It records keys and
database/store names only, not stored values or user records.

### Network behavior without configured AI

- **OBSERVED:** startup attempted local model discovery against
  `127.0.0.1:4173/ollama/api/tags` and localhost ports `11434`, `1234`, `8080`,
  `8081`, `8000`, `5001`, `7860`, `1337`, and `4891`.
- **OBSERVED:** startup also fetched the upstream
  `Chaos2Cured/FreeLattice/main/version.json`. The initial trace additionally
  captured a request to Cloudflare's trace endpoint.
- **MEASURED:** the first session accumulated 14 console error entries before
  onboarding interaction and 18 by the Signal Report flow. The captured errors
  were primarily failed local discovery/resource requests.

The compact request receipt is in `network-probe/stdout.log`; the full trace is
external because its frame resources are large.

### Main shell and mobile

- **OBSERVED:** “Skip — just explore” opened the Garden and added onboarding
  completion keys.
- **OBSERVED:** desktop Garden rendered through WebGL on the NVIDIA GeForce RTX
  3090 Ti. `navigator.gpu` was available.
- **OBSERVED:** at 390 × 844 the app switched to a bottom navigation shell, but
  Garden controls overlapped the Garden heading and each other near the top of
  the viewport.
- **OBSERVED:** forced-colors plus reduced-motion emulation produced a readable
  black/white shell, but the same control overlap remained. This receipt does not
  establish that every animation honored reduced motion.

### Installed Edge and direct-file launch

- **MEASURED:** one fresh-profile installed Edge 150 first load reported
  DOMContentLoaded at about 880 ms, load at about 898 ms, and 2,780,108
  navigation transfer bytes. This is a single observation, not a budget or a
  Chrome/Edge parity claim.
- **OBSERVED:** the Edge run displayed the same first-run onboarding surface,
  initialized 12 canvases, exposed WebGPU, created 17 localStorage keys, and
  exposed 16 IndexedDB databases with 24 object stores at probe time.
- **OBSERVED:** Edge attempted the same same-origin Ollama route, localhost model
  discovery ports, and upstream `version.json` request recorded in the Chrome
  flow.
- **OBSERVED:** installed Chrome 150 loaded the immutable `docs/app.html`
  directly from `file://` and rendered the first-run onboarding dialog. The
  command exited 0 and wrote the direct-file screenshot.
- **UNKNOWN:** direct-file interaction, relative module/resource behavior,
  service-worker behavior, provider use, persistence, and later workflows were
  not exercised. Playwright CLI blocks `file://` before navigation, so this one
  launch-mode receipt uses isolated-profile Chrome headless directly.

### Offline and degraded GPU

- **MEASURED:** although the page was controlled by the active service worker,
  setting the browser offline and reloading `docs/app.html` navigated to
  `chrome-error://chromewebdata/` with `ERR_INTERNET_DISCONNECTED`. The installed
  shell did not recover in this run.
- **OBSERVED:** in a fresh profile where `navigator.gpu` was removed before page
  load, the app still initialized 12 canvases and rendered the Garden through
  WebGL. No explicit no-WebGPU notice was visible.

These are baseline behaviors to characterize and disposition, not proposed target
behavior.

### Signal Report

- **OBSERVED:** Chat exposes an accessible `Signal Report` button.
- **OBSERVED:** the modal says message content is excluded and exposes a Copy
  action. Copy changed the button label to `Copied ✓`.
- **OBSERVED:** with no AI connected, the report still labeled the provider/model
  as `groq` / `llama`.
- **OBSERVED:** the report said “Last 0 browser errors” while the Playwright page
  had 18 console error entries. The existing report therefore does not capture
  every browser resource failure observed by the harness.
- **INFERRED:** the in-memory, privacy-bounded Support Receipt remains a strong
  candidate for the first post-ADR implementation slice, but parity tests must
  preserve the no-message-content rule while deciding how resource errors and
  disconnected provider metadata should be represented.

## Artifacts

| Artifact | What it shows |
|---|---|
| `artifacts/onboarding-desktop.png` | First-run dialog over initialized application |
| `artifacts/garden-desktop.png` | Desktop Garden after skip |
| `artifacts/garden-mobile-390x844.png` | Mobile shell and control overlap |
| `artifacts/garden-mobile-reduced-motion-forced-colors.png` | Forced-colors/reduced-motion profile |
| `artifacts/offline-reload-failure.png` | Offline reload failure |
| `artifacts/no-webgpu-onboarding.png` | No-WebGPU first-run state |
| `artifacts/no-webgpu-garden.png` | WebGL Garden with `navigator.gpu` unavailable |
| `artifacts/signal-report-desktop.png` | Existing privacy-bounded report modal |
| `artifacts/onboarding-edge-desktop.png` | Installed Edge first-run onboarding |
| `artifacts/onboarding-file-direct.png` | Installed Chrome direct-`file://` onboarding |
| `artifacts/*accessibility-tree.yml` | Playwright accessibility snapshots |
| `artifacts/*console.log` | Browser console streams |
| `runtime-probe/` | Hashed command receipt for storage/runtime structure |
| `network-probe/` | Hashed command receipt for non-static requests |
| `edge-runtime-probe/` | Hashed installed-Edge runtime-name/timing receipt |
| `edge-network-probe/` | Hashed installed-Edge non-static request receipt |
| `file-launch-probe/` | Hashed direct-`file://` Chrome launch receipt |

The full trace bundle is stored externally:

```text
Z:\LATTICEWORK_PRESERVATION\phase-0\LW-P0-003-browser\playwright-trace.zip
bytes: 78,563,465
sha256: b880654444cfcc04f0d05b8bf264e0f7ba4996f47f68deef45645f147efb172e
```

`manifest.json` records hashes for all repository artifacts and the external
trace archive.

## Limitations

- Chrome and one bounded installed-Edge first-load path only; Firefox, WebKit,
  other operating systems, and full Edge workflow behavior remain **UNKNOWN**.
- No real provider/local model, import/export, peer, worker, desktop shell, or
  destructive workflow was exercised.
- No screen reader or manual accessibility review was performed.
- Performance figures are single-run observations, not fixed-profile budgets.
- Offline behavior was tested after one online load in one fresh profile; update,
  partial-install, stale-client, multi-tab, and rollback cases remain open.
