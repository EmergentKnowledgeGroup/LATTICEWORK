param(
    [int]$ExistingStaticPort = 4184,
    [int]$LoopbackStaticPort = 4185,
    [string]$IndependentReviewPath
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BaselineRoot = "Z:\LATTICEWORK_BASELINE_e7585999"
$BaselineSha = "e7585999fc1af2707f410ae87356cf2b52e08d9c"
$EvidenceRelative = "reengineering\evidence\phase-4\LW-P4-RETEST-001"
$EvidenceRoot = Join-Path $RepositoryRoot $EvidenceRelative
$HarnessRoot = Join-Path $RepositoryRoot "tests\characterization"
$Playwright = Join-Path $HarnessRoot "node_modules\.bin\playwright.cmd"
$BrowserCache = Join-Path $RepositoryRoot "runtime\tmp\phase3-playwright-browsers"
$CandidateSha = (& git -C $RepositoryRoot rev-parse HEAD).Trim()
$RunStamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ") + "-" + ([guid]::NewGuid().ToString("N").Substring(0, 8))
$ExistingRun = Join-Path $RepositoryRoot "runtime\tmp\phase4-characterization\p4-retest-existing-$RunStamp"
$LoopbackRun = Join-Path $RepositoryRoot "runtime\tmp\phase4-characterization\p4-retest-loopback-$RunStamp"
Set-Location $RepositoryRoot

function Write-Json {
    param([string]$Path, [object]$Value)
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    [System.IO.File]::WriteAllText(
        $Path,
        (($Value | ConvertTo-Json -Depth 100) + [Environment]::NewLine),
        $Utf8NoBom
    )
}

function Assert-FreeLoopbackPort {
    param([int]$Port)
    if ($Port -lt 1024 -or $Port -gt 65535) {
        throw "Static server port must be between 1024 and 65535."
    }
    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Parse("127.0.0.1"),
        $Port
    )
    try { $listener.Start() } finally { $listener.Stop() }
}

function New-OwnedRun {
    param([string]$RunRoot, [string]$Mode)
    $expectedPrefix = [System.IO.Path]::GetFullPath(
        (Join-Path $RepositoryRoot "runtime\tmp\phase4-characterization")
    ).TrimEnd('\') + '\'
    $resolved = [System.IO.Path]::GetFullPath($RunRoot)
    if (-not $resolved.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Run root escaped the project staging area: $resolved"
    }
    if (Test-Path -LiteralPath $resolved) {
        throw "Run root already exists: $resolved"
    }
    New-Item -ItemType Directory -Force -Path (Join-Path $resolved "playwright"), (Join-Path $resolved "temp"), (Join-Path $resolved "npm-cache") | Out-Null
    Write-Json -Path (Join-Path $resolved ".ownership.json") -Value ([ordered]@{
        schema = "latticework.phase4-run-ownership.v1"
        repository_root = $RepositoryRoot
        run_id = Split-Path $resolved -Leaf
        mode = $Mode
        pid = $PID
        created_at = [DateTime]::UtcNow.ToString("o")
        nonce = [guid]::NewGuid().ToString("N")
    })
}

function Invoke-BrowserRetests {
    param(
        [string]$RunRoot,
        [string]$Mode,
        [int]$Port,
        [string]$SubcaseIds
    )
    $env:TEMP = Join-Path $RunRoot "temp"
    $env:TMP = $env:TEMP
    $env:npm_config_cache = Join-Path $RunRoot "npm-cache"
    $env:npm_config_update_notifier = "false"
    $env:npm_config_fund = "false"
    $env:npm_config_audit = "false"
    $env:PLAYWRIGHT_BROWSERS_PATH = $BrowserCache
    $env:LATTICEWORK_PHASE4_RUN_ID = Split-Path $RunRoot -Leaf
    $env:LATTICEWORK_PHASE4_RUN_ROOT = $RunRoot
    $env:LATTICEWORK_PHASE1_EVIDENCE_ROOT = Join-Path $RunRoot "playwright"
    $env:LATTICEWORK_BASELINE_ROOT = $BaselineRoot
    $env:LATTICEWORK_CHARACTERIZATION_BASE_URL = "http://127.0.0.1:$Port"
    $env:LATTICEWORK_PHASE4_SUBCASES = $SubcaseIds
    $env:LATTICEWORK_PHASE4_AMENDMENT_RETESTS = if ($Mode -eq "existing") { "1" } else { "" }
    $env:LATTICEWORK_PHASE4_LOOPBACK_RETESTS = if ($Mode -eq "loopback") { "1" } else { "" }
    $stdout = Join-Path $RunRoot "browser-stdout.log"
    $stderr = Join-Path $RunRoot "browser-stderr.log"
    $process = Start-Process -FilePath $Playwright `
        -ArgumentList @(
            "test",
            "specs/phase4-chat.spec.mjs",
            "--config", "playwright.config.mjs",
            "--workers=1",
            "--retries=0"
        ) `
        -WorkingDirectory $HarnessRoot `
        -NoNewWindow -Wait -PassThru `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr
    if ($process.ExitCode -ne 0) {
        throw "Phase 4 $Mode browser retests failed; see $stdout and $stderr"
    }
}

if ($CandidateSha -notmatch "^[0-9a-f]{40}$") { throw "Candidate SHA is invalid." }
if (& git -C $RepositoryRoot status --porcelain) {
    throw "Promotable Phase 4 retest evidence requires a clean candidate worktree."
}
if (-not (Test-Path -LiteralPath $BaselineRoot -PathType Container)) {
    throw "Immutable baseline worktree is missing."
}
if ((& git -C $BaselineRoot rev-parse HEAD).Trim() -ne $BaselineSha) {
    throw "Immutable baseline SHA mismatch."
}
if (& git -C $BaselineRoot status --porcelain) {
    throw "Immutable baseline worktree is dirty."
}
if (-not (Test-Path -LiteralPath $Playwright -PathType Leaf)) {
    throw "Playwright harness is not installed."
}
Assert-FreeLoopbackPort -Port $ExistingStaticPort
Assert-FreeLoopbackPort -Port $LoopbackStaticPort
if ($ExistingStaticPort -eq $LoopbackStaticPort) {
    throw "Existing and loopback static-server ports must differ."
}

New-OwnedRun -RunRoot $ExistingRun -Mode "existing"
New-OwnedRun -RunRoot $LoopbackRun -Mode "loopback"

node.exe --test --test-reporter=tap `
    tests/reengineering/phase4-active-scope.test.mjs `
    tests/reengineering/phase4-amendment.test.mjs `
    tests/reengineering/phase4-loopback-stream.test.mjs `
    tests/reengineering/phase4-amended-characterization-validation.test.mjs
if ($LASTEXITCODE -ne 0) { throw "Phase 4 retest controls failed." }

Invoke-BrowserRetests `
    -RunRoot $ExistingRun `
    -Mode "existing" `
    -Port $ExistingStaticPort `
    -SubcaseIds "P4-A11Y-001A,P4-A11Y-001B,P4-A11Y-001C,P4-CHAT-008A,P4-DEG-001A,P4-ONB-001C"
Invoke-BrowserRetests `
    -RunRoot $LoopbackRun `
    -Mode "loopback" `
    -Port $LoopbackStaticPort `
    -SubcaseIds "P4-CHAT-001A,P4-CHAT-003B,P4-CHAT-010A,P4-CHAT-010B,P4-RESP-001A"

$promoteArgs = @(
    "tools/reengineering/promote-phase4-amendment-retests.mjs",
    "--evidence", $EvidenceRelative.Replace('\', '/'),
    "--existing-run", $ExistingRun,
    "--loopback-run", $LoopbackRun,
    "--candidate-sha", $CandidateSha
)
if ($IndependentReviewPath) {
    if (-not (Test-Path -LiteralPath $IndependentReviewPath -PathType Leaf)) {
        throw "Independent review receipt is missing: $IndependentReviewPath"
    }
    $promoteArgs += @("--independent-review", (Resolve-Path $IndependentReviewPath).Path)
}
& node.exe @promoteArgs
if ($LASTEXITCODE -ne 0) { throw "Phase 4 retest evidence promotion failed." }

$validationArgs = @(
    "tools/reengineering/validate-phase4-amended-characterization.mjs",
    "--evidence", $EvidenceRelative.Replace('\', '/'),
    "--permit-pending", $(if ($IndependentReviewPath) { "false" } else { "true" })
)
& node.exe @validationArgs
if ($LASTEXITCODE -ne 0) { throw "Phase 4 amended characterization validation failed." }

Write-Output "Phase 4 amended retests completed: $EvidenceRoot"
