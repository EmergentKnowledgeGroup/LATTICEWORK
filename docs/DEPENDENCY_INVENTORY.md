<!-- Status: LIVING | Owner: Architecture and security leads -->

# Dependency Inventory

## Direct dependencies

| Name | Version | Purpose | Runtime or build | Source | License | Network access | Owner | Replacement plan |
|---|---|---|---|---|---|---|---|---|
| `lit` | `3.3.3` | Candidate-only status-shell rendering | Runtime | root workspace / `apps/web/package.json` | BSD-3-Clause (receipt-verified) | No runtime access in the verified shell | Candidate web shell | Retain through bounded evaluation |
| `vite` | `8.1.5` | Candidate development, preview, and relative build | Build | root workspace | MIT (receipt-verified) | Package installation only; loopback preview in tests | Candidate build | Retain through bounded evaluation |
| `typescript` | `6.0.3` | Strict candidate contracts and typechecking | Build | root workspace | Apache-2.0 (receipt-verified) | Package installation only | Candidate architecture | Retain through bounded evaluation |
| `@playwright/test` | `1.62.0` | Isolated Phase 2 browser verification | Test | `tests/phase2/package.json` | Apache-2.0 (receipt-verified) | Browser installation; tested application egress is denied | Verification | Retain while browser gate applies |
| `electron-store` | `^8.1.0` | Electron settings persistence | Runtime | `desktop/package.json` | UNKNOWN | No direct network requirement | Desktop surface | Freeze until ADR-007 |
| `electron` | `^28.0.0` | Electron desktop shell | Build/dev runtime | `desktop/package.json` | MIT (not independently receipt-verified) | Can load network content | Desktop surface | Freeze until ADR-007 |
| `electron-builder` | `^24.9.0` | Desktop packaging | Build | `desktop/package.json` | MIT (not independently receipt-verified) | Package resolution/signing may use network | Release engineering | Freeze until ADR-007 |
| `wrangler` | `^3.0.0` | Telegram worker development/deployment | Build/deploy | `desktop/telegram-worker/package.json` | UNKNOWN | Yes | Worker surface | Freeze until ADR-012/013 |
| `tauri-build` | major `2` | Tauri build integration | Build | `desktop/src-tauri/Cargo.toml` | UNKNOWN | No runtime claim | Desktop surface | Freeze until ADR-007 |
| `tauri` | major `2` | Tauri desktop shell | Runtime/build | `desktop/src-tauri/Cargo.toml` | UNKNOWN | Platform-dependent | Desktop surface | Freeze until ADR-007 |
| `serde` | major `1` | Rust serialization | Runtime/build | `desktop/src-tauri/Cargo.toml` | UNKNOWN | No | Desktop surface | Retain only with selected desktop |
| `serde_json` | major `1` | JSON serialization | Runtime/build | `desktop/src-tauri/Cargo.toml` | UNKNOWN | No | Desktop surface | Retain only with selected desktop |
| `dirs` | major `5` | Platform directory discovery | Runtime | `desktop/src-tauri/Cargo.toml` | UNKNOWN | No | Desktop surface | Retain only with selected desktop |

**OBSERVED:** the candidate commit tracks a root npm workspace with lockfile
version 3 and exact Node/npm engine bounds. **MEASURED:** the Phase 2 receipt
records 58 external lockfile packages, 27 installed on the measured Windows
platform, 31 skipped optional packages, license/integrity metadata, a CycloneDX
SBOM, and zero npm-audit vulnerabilities. The isolated lockfile replay was
byte-identical to the committed lockfile. Evidence:
[`supply-chain.json`](../reengineering/evidence/phase-2/LW-P2-001/supply-chain.json),
[`sbom.cdx.json`](../reengineering/evidence/phase-2/LW-P2-001/sbom.cdx.json),
and
[`lockfile-comparison.json`](../reengineering/evidence/phase-2/LW-P2-001/lockfile-comparison.json).

Legacy browser libraries remain vendored under `docs/lib/` and referenced
through source/CDN paths. Their complete versions, licenses, and runtime
resolution remain **UNKNOWN** until a separate legacy hash/SBOM pass.

## External services

| Service | Purpose | Data sent | Authentication | Optional | Failure behavior |
|---|---|---|---|---|---|
| Ollama / LM Studio / custom OpenAI-compatible | Local inference | prompts, attachments, model options | endpoint-dependent | Yes | UNKNOWN; not exercised |
| OpenAI, Anthropic, Gemini, Groq, Together, OpenRouter, xAI, Mistral, DeepSeek, Moonshot, DashScope, 01.AI, Hugging Face, Kindroid, custom | Cloud inference | provider request payloads | API keys or provider-specific | Yes | UNKNOWN; not exercised |
| GitHub API | Repository read/write workflows | repository paths/content/actions | token | Yes | UNKNOWN; external mutation paths exist |
| Google Drive | User-selected file loading | file identifiers/content | OAuth/platform token | Yes | UNKNOWN |
| Search worker / Brave | Web search | queries and worker metadata | worker/service key | Yes | UNKNOWN |
| Telegram worker/bridge | Coordination/notification | configured messages and metadata | token/webhook policy | Yes | UNKNOWN |
| PeerJS/WebRTC/mesh | Peer coordination | identity and shared feature payloads | protocol-specific | Yes | UNKNOWN |
| Finance/wallet proxy paths | Market/wallet features | UNKNOWN | UNKNOWN | Yes | UNKNOWN |

All external-service rows are **OBSERVED source boundaries**. They are not claims
of deployed configuration, successful authentication, or current availability.

## Browser and platform APIs

Inventory:

- IndexedDB.
- Service Worker.
- WebRTC.
- Web Crypto.
- Canvas and WebGL.
- Audio.
- File APIs.
- Local network requests.
- Clipboard.
- Notifications.
- Permissions.

## Dependency rules

- Pin versions where practical.
- Record license.
- Record whether the dependency executes remote code or sends data.
- Avoid hidden CDN runtime requirements.
- Verify offline claims without network access.
- Require review for new security-sensitive dependencies.
- Do not replace a dependency solely to claim modernization.
