# LW-M0-BEH-001 — Phase 0 behavior and boundary map

**Status:** evidence package complete; no implementation authorization implied.  
**Baseline:** `Z:\LATTICEWORK_BASELINE_e7585999` at `e7585999fc1af2707f410ae87356cf2b52e08d9c` (clean detached HEAD observed).  
**Control checkout:** `Z:\LATTICEWORK`, `reengineering/m0-baseline-characterization`, same HEAD.  
**Owned output only:** `reengineering/evidence/phase-0/LW-M0-BEH-001/`.

## Decision

**INFERRED — implementation and ADR acceptance remain blocked.** The baseline exposes a broad browser product, multiple static routes, optional local gateways, PWA, LAN, desktop, and worker paths. Its current behavior and data contracts have not been characterized end-to-end. A source-level panel or route is not proof that the workflow works, but it is a preservation obligation until deliberately classified.

The machine-readable map is [behavior-boundary-map.json](behavior-boundary-map.json). It is the exhaustive path/name inventory for this bounded pass.

## What is present

**OBSERVED — runtime composition.** `docs/app.html` is the large browser runtime (65,387 physical lines in the pinned tree) and `docs/modules/*.js` contains 76 extension modules. `window.FreeLatticeLoader` lazy-loads several modules while many are deferred or service-worker-cached. Direct source inspection found 54 `tab-panel` IDs, 82 docs static HTML routes, and five root static HTML routes. The JSON lists each one without claiming it is currently navigable.

**OBSERVED — major globals.** The app exposes, among others, `window.state`, `window.PROVIDERS`, `window.FreeLattice.callAI`, `window.FLAutoModel`, `window.BrowserAI`, `window.FLSearch`, `window.FLSignalReport`, `window.FLToolConsent`, `window.LatticeEvents`, `window.LatticeBank`, `window.LatticeMarket`, LAN helpers, `window.sendMessage`, `window.showToast`, and `window._flIdentityContext`. Multiple assignments to `state`, `FreeLattice`, `sendMessage`, and identity context are visible. **INFERRED:** ordering/overwrites are a first-class compatibility surface, not cleanup noise.

**OBSERVED — user-facing surface categories.** The apparent surface includes chat/conversations/memory/attachments; provider setup; Garden, Core, mesh/LAN, wallet/market/bounties, GitHub/Workshop, skills, import/export/backup/restore, canvas/chalkboard/vision, education/games/radio/quiet room, Telegram, Google Drive, web search, consent-gated repository reads, and proposal flows. The JSON carries the tab IDs and source modules rather than collapsing these into a claim of functional support.

## Launch and deployment boundaries

| Mode | Evidence | Current characterization |
|---|---|---|
| Direct static file | `start-freelattice.bat`, `start-freelattice.sh` explicitly offer it | **OBSERVED** path exists; file-origin behavior is **UNKNOWN** |
| Local static HTTP | `node server.js`, `python3 server.py`, scripts | **OBSERVED** bind `0.0.0.0`, default port 3000 |
| Ollama gateway | `/ollama/*` in both servers | **OBSERVED** proxies to `OLLAMA_HOST`/localhost:11434 with wildcard CORS |
| PWA/offline | `docs/manifest.json`, `docs/sw.js` | **OBSERVED** standalone manifest and cache `freelattice-v5.79.22`; install/update behavior **UNKNOWN** |
| LAN/mesh | server network URL and mesh/LAN app paths | **OBSERVED** source; peer connectivity/failure behavior **UNKNOWN** |
| Electron | `desktop/package.json`, `desktop/main.js` | **OBSERVED** source defaults to live `freelattice.com/app.html` with bundled fallback; executable behavior **UNKNOWN** |
| Tauri | `desktop/src-tauri/*` | **OBSERVED** project/configuration exists; build/run behavior **UNKNOWN** |
| Workers | search, Telegram and finance-worker source | **OBSERVED** deployable source; deployment state/configuration **UNKNOWN** |

## Provider, network, data, and security boundaries

**OBSERVED — AI/network.** The app contains browser WebLLM imports; local Ollama, LM Studio, and custom OpenAI-compatible URLs; and cloud provider definitions for Groq, Together, OpenRouter, xAI/Grok, Mistral, DeepSeek, Moonshot, DashScope, 01.AI, OpenAI, Anthropic, Gemini, Hugging Face, Kindroid, and custom endpoints. Other explicit network surfaces are PeerJS/WebRTC-related paths, GitHub API, Google Drive readonly file loading, raw GitHub/version update checks, CDNs/fonts/audio, a Cloudflare-to-Brave search worker, Telegram bridge, and a finance proxy.

**OBSERVED — persistence and sensitive state.** Source references IndexedDB stores including `FreeLatticeDB` (conversations/messages/meta/memoryIndex), `FreeLatticeSkills`, `SophiaEngine`, `FreeLatticeMemory`, and mesh identity databases plus many localStorage keys. It has API-key and GitHub-token encrypted storage plus legacy plaintext migration/removal paths; a WebCrypto Ed25519/SHA-256/Merkle path; imports/exports; and signal-report code asserted not to record message content. Exact schemas, encryption semantics, migrations, recovery, and real deployment configuration are **UNKNOWN** and need dedicated evidence.

**OBSERVED — high-risk side effects.** GitHub push, provider prompts, Telegram setup/notify, peer sharing, user-selected Drive/file loading, web search, wallet and marketplace actions can transfer data or mutate external state. Consent-related modules and prompts exist, but end-to-end gating and bypass resistance are **UNKNOWN**.

## Smoke receipt

**MEASURED** at the pinned baseline:

```text
Command: node tests/smoke.js
Working directory: Z:\LATTICEWORK_BASELINE_e7585999
Exit: 1
Result: 107 failed, 3106 passed
Duration: about 4.0 seconds
```

**MEASURED — transient discrepancy resolved.** An earlier run reported 108 failed / 3105 passed because this clone did not yet contain `refs/tags/v5.79.20-anchor`. After the parent restored upstream tags with `git fetch upstream --tags`, the tag resolves to `96a689725b3a6ae3a14cb0df494a4f90cc9ad255` and the unchanged baseline now produces the 107 / 3106 result above. The baseline worktree was not modified. The existing checkpoint count is therefore reproduced, though its original tag-completeness receipt was not recorded.

| Failure category | Count | Evidence meaning |
|---|---:|---|
| Stale version/cache/version.json assertions | 100 | **OBSERVED** historical release assertions; current app/SW/docs version is 5.79.22 |
| Historical feature/structure literals | 4 | **OBSERVED** confirm, Chalkboard/Drawing Board, canopy checks; not proof of a current product failure |
| Repository/environment assertions | 1 | **OBSERVED** executable-bit expectation |
| Current source behavior checks | 2 | **OBSERVED** FL_SEARCH sentinel stripping and `setAgentEmotion` target-HSL assignment |

**INFERRED:** this suite is a cumulative release-history assertion log rather than a clean current-baseline characterization suite. It must remain unmodified in Phase 0; a future characterization suite must separately encode current behavior and explicitly disposition each non-version failure.

## Preservation obligations

1. Preserve the listed paths, panels, module loading, launch modes, provider selection/request behavior, offline cache rules, data names, import/export behavior, identity/Merkle behavior, and all externally observable failures until a behavior-level decision says otherwise.
2. Preserve global assignment/load ordering until a trace proves how it can change safely.
3. Do not infer that the 107 smoke failures permit deletion. They are evidence about test quality/history, not authorization to weaken the baseline.
4. Treat the wildcard-CORS/`0.0.0.0` gateway, API-key persistence, identity keys, provider payloads, GitHub/Telegram/search/peer flows, and wallet-like actions as sensitive boundaries requiring explicit security/privacy review before changing semantics.

## Blockers / unanswered questions

- **UNKNOWN — canonical source precedence:** root mirrors, `docs/` mirrors, live hosting, desktop bundled assets, and update source are not reconciled.
- **UNKNOWN — behavioral reachability:** no browser, PWA, worker, provider, LAN/peer, Electron, Tauri, storage/import/export, or failure-recovery flow was exercised here.
- **UNKNOWN — data/crypto compatibility:** schemas, key material handling, migration/recovery, and cross-version guarantees are not frozen.
- **UNKNOWN — authority and consent:** production worker configuration, deployment protections, user authorization, and consent enforcement have not been verified.
- **UNKNOWN — smoke dispositions:** the two current source failures and four historical feature/structure assertions need recorded intent before ADR or implementation treats them as requirements or bugs.

## Commands and limitations

Commands run against the baseline included:

```powershell
git -C Z:\LATTICEWORK_BASELINE_e7585999 rev-parse HEAD
git -C Z:\LATTICEWORK_BASELINE_e7585999 status --short --branch
node tests/smoke.js
git -C Z:\LATTICEWORK_BASELINE_e7585999 ls-files 'docs/*.html'
rg -n 'fetch\(|WebSocket\(|EventSource\(|RTCPeerConnection\(|new Peer\(' <runtime paths>
rg -n 'localStorage|indexedDB|crypto\.subtle|clipboard|FileSystem' <runtime paths>
```

**LIMITATION:** this report is static-source plus smoke evidence only. It deliberately made no baseline, source, configuration, lockfile, branch, tag, or runtime-state change; no external request was intentionally issued.

## Terminal condition

**Evidence artifacts complete and baseline unmodified.**
