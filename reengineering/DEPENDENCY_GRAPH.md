# Baseline Dependency Graph

**Status:** DISCOVERY

```mermaid
flowchart LR
  UI["Large browser application surfaces"] --> Globals["window globals and shared state"]
  UI --> Storage["IndexedDB / localStorage / Cache Storage"]
  UI --> Providers["Local and cloud provider calls"]
  UI --> Modules["Root and docs module variants"]
  SW["Service workers"] --> UI
  SW --> Cache["App-shell caches"]
  Electron["Electron shell"] --> UI
  Tauri["Tauri shell"] --> UI
  Gateway["Node/Python local gateways"] --> Providers
  Gateway --> UI
  Workers["Search / Telegram / peer workers"] --> UI
```

The graph is preliminary. Phase 0 evidence must replace each broad node with measured path/symbol ownership and identify cycles, direct globals, direct storage calls, and network edges.

## Target dependency rule

Feature code depends on stable contracts. Contracts do not depend on feature implementations. UI code does not access durable storage or providers directly.
