param(
    [switch]$UpdateSnapshots
)

$ErrorActionPreference = "Stop"

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BaselineRoot = "Z:\LATTICEWORK_BASELINE_e7585999"
$BaselineSha = "e7585999fc1af2707f410ae87356cf2b52e08d9c"
$HarnessRoot = Join-Path $RepositoryRoot "tests\characterization"
$ScratchRoot = Join-Path $RepositoryRoot "runtime\tmp\phase1-characterization"
$EvidenceRoot = Join-Path $RepositoryRoot "reengineering\evidence\phase-1\LW-P1-001\playwright"

if (-not (Test-Path -LiteralPath $BaselineRoot -PathType Container)) {
    throw "Immutable baseline worktree is missing: $BaselineRoot"
}

$ActualBaselineSha = (& git -C $BaselineRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $ActualBaselineSha -ne $BaselineSha) {
    throw "Immutable baseline SHA mismatch. Expected $BaselineSha; observed $ActualBaselineSha"
}

$BaselineStatus = (& git -C $BaselineRoot status --porcelain)
if ($LASTEXITCODE -ne 0) {
    throw "Unable to read immutable baseline git status."
}
if ($BaselineStatus) {
    throw "Immutable baseline worktree is dirty. Refusing characterization run."
}

New-Item -ItemType Directory -Force -Path $ScratchRoot | Out-Null
$RepositoryPrefix = [System.IO.Path]::GetFullPath($RepositoryRoot).TrimEnd('\') + '\'
$ResolvedEvidenceRoot = [System.IO.Path]::GetFullPath($EvidenceRoot)
if (-not $ResolvedEvidenceRoot.StartsWith($RepositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clear evidence outside the repository: $ResolvedEvidenceRoot"
}
if (Test-Path -LiteralPath $ResolvedEvidenceRoot -PathType Container) {
    Remove-Item -LiteralPath $ResolvedEvidenceRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $ResolvedEvidenceRoot | Out-Null

$env:TEMP = Join-Path $ScratchRoot "temp"
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $ScratchRoot "npm-cache"
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $ScratchRoot "browsers"
$env:LATTICEWORK_BASELINE_ROOT = $BaselineRoot
$env:LATTICEWORK_BASELINE_SHA = $BaselineSha
$env:LATTICEWORK_CHARACTERIZATION_BASE_URL = "http://127.0.0.1:4174"
$env:LATTICEWORK_PHASE1_EVIDENCE_ROOT = $EvidenceRoot

New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null
New-Item -ItemType Directory -Force -Path $env:npm_config_cache | Out-Null
New-Item -ItemType Directory -Force -Path $env:PLAYWRIGHT_BROWSERS_PATH | Out-Null

Write-Host "Installing pinned characterization dependencies from package-lock.json..."
& npm --prefix $HarnessRoot ci
if ($LASTEXITCODE -ne 0) {
    throw "npm ci failed with exit code $LASTEXITCODE"
}

Write-Host "Ensuring the pinned Playwright Chromium build is present on Z:..."
& npm --prefix $HarnessRoot exec -- playwright install chromium
if ($LASTEXITCODE -ne 0) {
    throw "Playwright browser install failed with exit code $LASTEXITCODE"
}

$Arguments = @("test")
if ($UpdateSnapshots) {
    $Arguments += "--"
    $Arguments += "--update-snapshots"
}

Write-Host "Running characterization against $BaselineRoot at $BaselineSha..."
& npm --prefix $HarnessRoot @Arguments
$TestExitCode = $LASTEXITCODE

Write-Host "Playwright characterization exit code: $TestExitCode"
exit $TestExitCode
