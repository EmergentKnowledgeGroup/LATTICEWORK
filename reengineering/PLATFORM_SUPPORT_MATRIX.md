# Platform, Launch-Mode, and Degraded-Capability Matrix

**Status:** PHASE 0 FROZEN — SUPPORT DECISIONS PENDING
**Baseline:** `e7585999fc1af2707f410ae87356cf2b52e08d9c`

This matrix records evidence and preservation obligations. `OBSERVED` does not
mean supported, and `PROPOSED` does not mean accepted.

## Browser, operating system, and viewport

| Profile | Baseline evidence | Current disposition | Target support decision |
|---|---|---|---|
| Windows 10, Chrome 150, 1440 × 900 | First-run, Garden, Chat shell, Signal Report, storage/network, offline failure | **OBSERVED C1** for bounded flows | **PROPOSED REQUIRED**; final browser ADR pending |
| Windows 10, Chrome 150, 390 × 844 emulation | Garden/mobile shell screenshot; control overlap | **OBSERVED C1** for layout only | **PROPOSED REQUIRED**; physical mobile remains UNKNOWN |
| Windows 10, Chrome 150, forced colors + reduced motion | Readable shell screenshot; overlap remains; animation compliance not proven | **OBSERVED C1** for one frame | **PROPOSED REQUIRED** accessibility profile |
| Windows 10, Chrome 150, no `navigator.gpu` | Onboarding and Garden rendered through WebGL; no explicit notice | **OBSERVED C1** for bounded flow | **PROPOSED REQUIRED** degraded path |
| Windows 10, Edge 150, 1440 × 900 | Fresh-profile first load, runtime names, request boundaries, screenshot | **OBSERVED C1** for first load | **PROPOSED REQUIRED**; complete workflow parity pending |
| Firefox | none | **UNKNOWN** | Owner/browser ADR decision required |
| WebKit/Safari | none | **UNKNOWN** | Owner/browser ADR decision required |
| macOS | none | **UNKNOWN** | Owner/browser ADR decision required |
| Linux desktop | source launch scripts only | **UNKNOWN** | Owner/browser/desktop ADR decision required |
| Physical mobile browser | none | **UNKNOWN** | Owner/browser ADR decision required |

## Launch modes

| Mode | Baseline evidence | Preservation disposition | Remaining proof |
|---|---|---|---|
| Direct `file://` | Isolated Chrome loaded `docs/app.html` and rendered onboarding | **REQUIRED UNTIL OWNER DECISION** | interaction, modules/resources, persistence, provider, import/export |
| Static HTTP | Python loopback server plus Chrome/Edge receipts | **REQUIRED** | full critical-flow characterization |
| Node/Python local gateway | source inventory only | **REQUIRED** | gateway boot, proxy behavior, error handling, origin/auth/CORS |
| Installed PWA/offline restart | active worker/cache observed; one primed offline reload failed | **REQUIRED** | install, cold offline, update, partial install, multi-tab, rollback |
| LAN access | bind/source inventory only | **REQUIRED UNTIL OWNER DECISION** | explicit trust, origin, authentication, denied-default receipt |
| Electron | tracked project/source only | **REQUIRED UNTIL OWNER DECISION** | build/run, privilege, packaged-resource, fallback behavior |
| Tauri | tracked project/source only | **REQUIRED UNTIL OWNER DECISION** | build/run, command/filesystem authorization, packaged-resource behavior |

## Degraded-capability profiles

| Condition | Baseline evidence | Target requirement |
|---|---|---|
| WebGPU unavailable | WebGL Garden still rendered; no explicit notice | Preserve usable fallback or record owner-approved divergence |
| Offline after one online load | reload failed with `ERR_INTERNET_DISCONNECTED` | Candidate local shell must recover within proposed offline budget |
| Local model services unavailable | repeated local discovery failures; onboarding remained visible | No crash; clear disconnected state; bounded retries |
| External network denied | not yet isolated across a complete flow | Local-only critical path must pass with denied external network |
| Reduced motion | one emulated screenshot only | All non-essential motion must honor preference; test lifecycle/RAF cleanup |
| Forced colors/high contrast | one readable screenshot with layout overlap | Controls/content must remain perceivable and operable |
| Low-end CPU/mobile | not measured | Run fixed throttled/physical profile before release claim |
| GPU resource pressure/teardown | not measured | Candidate-owned cleanup counters and recovery budget required |

## Evidence

- [Phase 0 browser characterization](evidence/phase-0/LW-P0-003-browser/README.md)
- [Behavior and boundary map](evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.md)
- [Performance measurement plan](PERFORMANCE_PLAN.md)
- [Baseline capability contract](BASELINE_CAPABILITY_CONTRACT.md)

No row may move from `UNKNOWN` or `OBSERVED` to `SUPPORTED` without a pinned
receipt and the accepted browser/launch-mode ADR.
