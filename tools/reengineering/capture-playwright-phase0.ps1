param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("runtime", "requests")]
    [string]$Probe,

    [string]$SessionName = "lw-phase0",

    [string]$ScratchRoot = "Z:\LATTICEWORK\runtime\tmp\phase0-browser"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $ScratchRoot | Out-Null
$env:TEMP = $ScratchRoot
$env:TMP = $ScratchRoot
$env:npm_config_cache = Join-Path $ScratchRoot "npm-cache"

if ($Probe -eq "requests") {
    & npx --yes --package "@playwright/cli" playwright-cli --json "-s=$SessionName" requests
    exit $LASTEXITCODE
}

$runtimeProbe = "async () => { const databases=[]; for (const metadata of await indexedDB.databases()) { databases.push(await new Promise(resolve => { const request=indexedDB.open(metadata.name); request.onsuccess=()=>{const database=request.result; const row={name:database.name,version:database.version,stores:Array.from(database.objectStoreNames)}; database.close(); resolve(row)}; request.onerror=()=>resolve({name:metadata.name,version:metadata.version,stores:[],error:String(request.error)}); })); } const cacheRows=[]; for (const name of await caches.keys()) { const cache=await caches.open(name); const keys=await cache.keys(); cacheRows.push({name,count:keys.length}); } const navigation=performance.getEntriesByType('navigation')[0]; return {url:location.href,title:document.title,viewport:{width:innerWidth,height:innerHeight},userAgent:navigator.userAgent,webgpu:Boolean(navigator.gpu),canvasCount:document.querySelectorAll('canvas').length,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,forcedColors:matchMedia('(forced-colors: active)').matches,serviceWorker:{controller:navigator.serviceWorker.controller&&navigator.serviceWorker.controller.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(registration=>({scope:registration.scope,active:registration.active&&registration.active.scriptURL}))},caches:cacheRows,localStorageKeys:Object.keys(localStorage).sort(),sessionStorageKeys:Object.keys(sessionStorage).sort(),indexedDB:databases.sort((left,right)=>left.name.localeCompare(right.name)),navigation:navigation?{domContentLoaded:navigation.domContentLoadedEventEnd,load:navigation.loadEventEnd,transferSize:navigation.transferSize}:null}; }"

& npx --yes --package "@playwright/cli" playwright-cli --json "-s=$SessionName" eval $runtimeProbe
exit $LASTEXITCODE
