# Performance Measurement Plan

**Status:** PROPOSED — Phase 0 measurement contract, not a compatibility or
release claim
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`

## Evidence boundary

- **MEASURED:** one cold desktop run reported DOMContentLoaded at about 1,593
  ms, load at about 1,693 ms, and 2,780,108 navigation transfer bytes.
- **OBSERVED:** that run initialized 12 canvases and the WebGL Garden before
  onboarding, created browser state, installed a service worker/cache, and made
  local and external discovery requests.
- **UNKNOWN:** repeatability, controlled warm-cache timing, aggregate
  subresource transfer, emitted bundle sizes, long tasks, heap recovery,
  GPU-resource recovery, physical-mobile performance, desktop-shell
  performance, and accessibility-profile performance.
- **PROPOSED:** a required online run must meet every applicable ceiling below.
  An average cannot hide a slower run.

A later diagnostic probe reported much smaller navigation timing with an active
service worker/cache. Its capture ordering did not make it a controlled warm
profile. It is not a warm-profile result and is not used to set a budget.

## Fixed profiles

| ID | Exact setup and flow | Required receipt |
|---|---|---|
| `P0-PERF-DESKTOP-COLD` | Windows 10 `10.0.19045`; Chrome `150.0.7871.187`; 1440 × 900; local `python -m http.server 4173 --bind 127.0.0.1`; unthrottled loopback; five independent empty browser profiles with no prior HTTP cache, Cache Storage, service worker, localStorage, or IndexedDB; open `/docs/app.html`; do not provide credentials, imports, provider actions, or external mutation. | Navigation timing, navigation `transferSize`, aggregate resource transfer separately, resource list, console errors, long-task observations from navigation through 10 seconds after `load`, heap sample, canvas/context inventory, trace, and screenshot. |
| `P0-PERF-DESKTOP-WARM` | For each cold profile, wait until its service worker is active, close the page, and navigate a new page in the same profile to the same URL. Do not clear cache or storage; retain the same server, browser, version, and viewport. | The cold-profile fields plus service-worker controller/cache names and an explicit `warm_after=P0-PERF-DESKTOP-COLD` relationship. |
| `P0-PERF-MOBILE-EMULATED-COLD` | Same as desktop cold with Chromium mobile emulation at 390 × 844, `isMobile=true`, `hasTouch=true`, and `deviceScaleFactor=3`; five fresh profiles. | The cold-profile fields plus viewport/device-emulation metadata and mobile screenshot/overlap assertions. This is layout emulation, not physical-mobile performance. |
| `P0-PERF-A11Y` | Repeat desktop-cold and mobile-emulated-cold with `prefers-reduced-motion: reduce` and `forced-colors: active`; separately run keyboard-only and automated axe checks. | The same performance fields plus accessibility tree, screenshot, keyboard trace, and axe output. |
| `P0-PERF-OFFLINE-WARM` | Prime exactly as the warm profile, confirm an active worker, set the browser offline, then navigate a new page to `/docs/app.html`. Deny and record external requests. | Binary navigation result, ready-marker time only on success, failed requests, worker/cache state, screenshot, and trace. |
| `P0-PERF-GPU-CLEANUP` | Run desktop cold twice: native `navigator.gpu` and the existing pre-load no-WebGPU override. Enter and leave the candidate-owned GPU surface five times, then wait two seconds after final teardown. | Canvas/context/requestAnimationFrame ownership counters, heap samples, screenshots, console output, and an explicit teardown receipt. |

## Provisional candidate ceilings

These are **PROPOSED** pilot ceilings, not baseline measurements or public
claims. They apply to the additive bounded shell/status spike until repeated
baseline and candidate data supports a revised contract.

| Metric | Profiles | Ceiling |
|---|---|---:|
| DOMContentLoaded | successful online cold, warm, and accessibility runs | `<= 2,000 ms` on every run |
| `load` | successful online cold, warm, and accessibility runs | `<= 2,250 ms` on every run |
| Navigation `transferSize` | successful online cold, warm, and accessibility runs | `<= 3,000,000 bytes` on every run |
| Long tasks | bounded candidate shell, navigation through 10 seconds after `load` | `0` tasks `>= 50 ms` |
| Heap recovery | five candidate-surface mount/unmount cycles, sampled after two seconds idle | post-cycle delta `<= 10 MiB` |
| Candidate GPU cleanup | five teardown cycles | `0` candidate-owned live canvases, tracked animation-frame loops, or tracked GPU contexts after two seconds |
| Offline | offline-warm | successful local shell ready marker `<= 3,000 ms`; `0` external network requests |

The 50 ms threshold is the browser long-task reporting boundary, not a measured
baseline result. Heap and GPU ceilings require candidate-owned instrumentation:
browser APIs do not provide portable, authoritative GPU-memory byte counts.
Process memory, screenshots, or an absent WebGPU API are not cleanup receipts.

No emitted bundle-size ceiling is proposed yet. The repository has no tracked
canonical build command, and the browser receipt does not enumerate total static
resource transfer. First record initial JavaScript and CSS bytes (raw, gzip, and
Brotli) plus aggregate resource transfer for the selected candidate build.

## Promotion rule

Replace a provisional ceiling only after five baseline and five candidate runs
for every relevant profile. Store raw per-run values, median and maximum, pinned
commits, environment, command, timestamps, and hashes. A budget change must say
whether it is a behavior-preserving exception, a deliberate divergence, or a
corrected receipt.

## Non-performance gates

- Offline is first an availability/failure-behavior gate. The observed baseline
  reload failed, so the 3,000 ms ceiling is a candidate product target, not a
  baseline comparison.
- Mobile has an observed Garden-control overlap. Passing synthetic timing does
  not pass responsive behavior.
- Forced-colors/reduced-motion produced a readable shell but did not remove the
  overlap and did not prove that every animation honors reduced motion.
- Accessibility still requires keyboard, screen-reader/manual review, contrast,
  and axe evidence. Performance checks cannot replace them.

## Current evidence

- [Phase 0 browser characterization](evidence/phase-0/LW-P0-003-browser/README.md)
- [Pinned environment receipt](evidence/phase-0/LW-P0-001-environment/manifest.json)
- [Baseline definition](../docs/BASELINE.md)
