<!-- Status: LIVING | Owner: Maintainers -->

# Known Limitations

This document lists material limitations, incomplete areas, and risks.

## Current limitations

| ID | Area | Limitation | User impact | Workaround | Planned resolution | Status |
|---|---|---|---|---|---|---|
| `LIM-001` | Project status | Reengineering has not yet established full compatibility | Do not treat as drop-in replacement | Use pinned upstream for unsupported workflows | Complete characterization and verification | Open |
| `LIM-002` | Runtime evidence | Browser, network, storage, and visual workflows are not yet captured | Source presence may not equal working behavior | Use immutable baseline and treat claims as C0 | Phase 0/1 browser characterization | Open |
| `LIM-003` | Tests | Baseline smoke exits 1 with 107 failures; smoke history does not parse | No green baseline gate exists | Preserve raw receipts and classify failures | Build additive characterization suite | Open |
| `LIM-004` | Data | Storage names are inventoried but schemas/owners/migrations are incomplete | Candidate must not mutate legacy data | Run legacy only for stored-data workflows | Data fixtures and ADR-004 | Open |
| `LIM-005` | Build/source | Root, docs, desktop, worker, and service-worker source precedence is ambiguous | Editing one surface may not update another | Do not edit legacy runtime | ADR-001 accepted; prove candidate generation and later parity before cutover | Open |
| `LIM-006` | Platforms | Browser/OS/mobile/file/PWA/LAN/desktop support matrix is unverified | Unsupported paths could be mistaken for supported | Make no support claim | ADR-011 plus executable matrix | Open |
| `LIM-007` | Security/privacy | Gateway, credentials, workers, peer, GitHub, Drive, Telegram, and wallet boundaries are source-mapped only | Trust and failure behavior are unknown | Do not enable or mutate external services in characterization | Threat model, ADR-006/012, security tests | Open |
| `LIM-008` | Accessibility/performance | No fixed a11y, reduced-motion, contrast, mobile, startup, heap, or GPU baseline | Regressions cannot yet be measured | No improvement claim | Capture Phase 0 budgets and baselines | Open |
| `LIM-009` | Context7 | Docker Desktop MCP Toolkit lists Context7, but the project-expected `context7-mcp` container/8077 endpoint is absent | Local library-documentation connector is not callable from this checkout | Use official primary documentation | Configure connector only if needed | Open |

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
