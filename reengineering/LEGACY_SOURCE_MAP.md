# Legacy Source Map

**Status:** DISCOVERY

| Surface | Apparent role | Canonicality | Preservation rule |
|---|---|---|---|
| `docs/app.html` | Primary deployed application definition | Candidate upstream canonical source; not yet accepted | Immutable baseline; characterize |
| `index.html` | Exact mirror of deployed application at baseline | Ambiguous authored/deployed mirror | Preserve and hash; do not edit independently |
| `app.html` | Non-identical root application variant | Ambiguous legacy runtime | Preserve and characterize separately |
| `docs/modules/*.js` | Deployed feature modules | Candidate deployed source | Preserve and map contracts |
| `modules/*.js` | Root feature variants/mirrors | Mixed exact and divergent copies | Preserve and reconcile only after evidence |
| `docs/sw.js`, `sw.js` | Service-worker variants | Ambiguous mirrored deployment artifacts | Preserve cache/update behavior |
| `server.js`, `server.py` | Static hosting and Ollama proxy | Parallel gateway implementations | Preserve; threat-model before change |
| `desktop/` | Electron and Tauri strategies | Overlapping desktop implementations | Preserve until an explicitly accepted desktop-strategy ADR |
| `worker/`, `telegram-worker.js` | Optional external/coordination services | Security-sensitive optional boundaries | Preserve; fail-closed target |
| `tests/smoke*.js` | Append-only source/assertion ledger | Baseline requirement source, not sufficient behavioral proof | Freeze and supplement |

No path may move to `legacy/` until hash preservation, reachability mapping, rollback, and owner approval are complete.
