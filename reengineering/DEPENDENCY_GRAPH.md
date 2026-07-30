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

The graph remains a baseline summary. Phase 0 inventories now provide measured
path/symbol, storage, and network-boundary ownership; dynamic reachability and a
complete module-cycle graph remain unknown.

## Target dependency rule

Feature code depends on stable contracts. Contracts do not depend on feature implementations. UI code does not access durable storage or providers directly.

## Verified Phase 2 candidate seam

```mermaid
flowchart LR
  Web["apps/web"] --> Kernel["packages/kernel"]
  Web --> Contracts["packages/contracts"]
  Kernel --> Contracts
  Build["Vite build"] --> Output["ignored candidate output"]
```

**VERIFIED:** this feature-free seam has no provider, storage, service-worker,
legacy-runtime, or external-service dependency in the bounded source and
browser gates. It is not yet a feature migration graph.
