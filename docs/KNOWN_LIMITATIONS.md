<!-- Status: LIVING | Owner: Maintainers -->

# Known Limitations

This document lists material limitations, incomplete areas, and risks.

## Current limitations

| ID | Area | Limitation | User impact | Workaround | Planned resolution | Status |
|---|---|---|---|---|---|---|
| `LIM-001` | Project status | Reengineering has not yet established full compatibility | Do not treat as drop-in replacement | Use pinned upstream for unsupported workflows | Complete characterization and verification | Open |
| `LIM-002` | Runtime evidence | Bounded baseline and candidate browser/network/storage/visual paths are captured, but comprehensive workflows are not | Untested behavior may still be mistaken for working behavior | Use exact C-level/evidence scope; do not generalize from bounded receipts | Continue feature-by-feature characterization and parity verification | Open |
| `LIM-003` | Tests | Baseline smoke exits 1 with 107 failures and smoke history does not parse, although additive characterization/control suites are green | No green whole-legacy gate exists | Preserve raw receipts and use the additive gates without relabeling the baseline | Resolve or disposition baseline failures feature by feature | Open |
| `LIM-004` | Data | Storage names are inventoried but schemas/owners/migrations are incomplete; ADR-004 is only Proposed | Candidate must not mutate legacy data | Run legacy only for stored-data workflows | Accept ADR-004, expand descriptors, and verify synthetic migration/rollback fixtures | Open |
| `LIM-005` | Build/source | Root, docs, desktop, worker, and service-worker legacy precedence remains ambiguous; only the isolated candidate source/build boundary is proven | Editing a legacy surface may not update another | Do not edit or cut over the legacy runtime | Candidate generation is verified; later parity, deployment generation, and cutover remain | Open |
| `LIM-006` | Platforms | Browser/OS/mobile/file/PWA/LAN/desktop support matrix is unverified | Unsupported paths could be mistaken for supported | Make no support claim | ADR-011 plus executable matrix | Open |
| `LIM-007` | Security/privacy | Provider/proxy contracts in ADR-005/006 are only Proposed; gateway, credentials, workers, peer, GitHub, Drive, Telegram, and wallet boundaries remain source-mapped only | Trust and failure behavior are unknown | Do not enable or mutate external services in characterization | Accept applicable ADRs and run mock/provider plus later proxy/LAN security tests; ADR-012 remains required | Open |
| `LIM-008` | Accessibility/performance | The feature-free candidate has one keyboard/semantic/mobile/reduced-motion/forced-colors/startup receipt, but no complete a11y audit or representative feature/heap/GPU baseline | Broad regressions cannot yet be measured | Make only the bounded candidate claim | Add equivalent-feature, cross-browser, screen-reader, heap, and GPU profiles | Open |
| `LIM-009` | Context7 | Docker Desktop MCP Toolkit exposes a callable Context7 server, while the optional dedicated `context7-mcp`/8077 container is absent | No current blocker; connector availability depends on Docker Desktop | Use the MCP Toolkit server or primary documentation | Recreate a dedicated endpoint only if a non-Toolkit workflow requires it | Closed |

## Required categories

Document limitations in:

- Compatibility.
- Data migration.
- Browser support.
- Mobile support.
- Offline behavior.
- Local model providers.
- Cloud model providers.
- Peer-to-peer networking.
- Identity and continuity.
- Security.
- Privacy.
- Accessibility.
- Performance.
- Build and release reproducibility.
- Agent workflow.

## Rule

A limitation should not be hidden because it weakens a launch message.

Publishing limits makes the verified claims stronger.
