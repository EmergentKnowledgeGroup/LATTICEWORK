param(
    [Parameter(Mandatory = $true)]
    [string]$IndependentReviewPath
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BaselineRoot = "Z:\LATTICEWORK_BASELINE_e7585999"
$BaselineSha = "e7585999fc1af2707f410ae87356cf2b52e08d9c"
$ModuleHash = "a65dba17a30ab8a657e52423ab8b1ac58d5597a83fe4ee823aecb83dc9588052"
$WorkId = "LW-P5-MEM-CHAR-001"
$EvidenceRoot = Join-Path $RepositoryRoot "reengineering\evidence\phase-5\$WorkId"
$RunId = "p5-memory-" + [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ") + "-" + ([guid]::NewGuid().ToString("N").Substring(0, 8))
$RunRoot = Join-Path $RepositoryRoot "runtime\tmp\phase5-lattice-memory\$RunId"
$ReportRoot = Join-Path $RunRoot "report"
$CandidateSha = (& git -C $RepositoryRoot rev-parse HEAD).Trim()

function Write-Json {
    param([string]$Path, [object]$Value)
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    [System.IO.File]::WriteAllText(
        $Path,
        (($Value | ConvertTo-Json -Depth 100 -Compress:$false) + [Environment]::NewLine),
        $Utf8NoBom
    )
}

function Assert-Descendant {
    param([string]$Path, [string]$Root, [string]$Label)
    $resolved = [System.IO.Path]::GetFullPath($Path)
    $rootPrefix = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
    if (-not $resolved.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must stay beneath $Root"
    }
    return $resolved
}

function Remove-ExactDirectory {
    param([string]$Path, [string]$Expected, [string]$Label)
    $resolved = Assert-Descendant -Path $Path -Root $RepositoryRoot -Label $Label
    if (-not [string]::Equals($resolved, [System.IO.Path]::GetFullPath($Expected), [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove unexpected $Label path."
    }
    if (Test-Path -LiteralPath $resolved) {
        [System.IO.Directory]::Delete($resolved, $true)
    }
}

function Find-Attachments {
    param([object]$Node, [System.Collections.Generic.List[object]]$Output)
    if ($null -eq $Node) { return }
    if ($Node -is [System.Collections.IEnumerable] -and $Node -isnot [string] -and $Node -isnot [pscustomobject]) {
        foreach ($item in $Node) { Find-Attachments -Node $item -Output $Output }
        return
    }
    if ($Node -is [pscustomobject]) {
        if (
            $Node.PSObject.Properties.Name -contains "name" -and
            $Node.PSObject.Properties.Name -contains "body" -and
            $Node.name -in @("scenario-result.json", "network.json", "storage.json")
        ) {
            $Output.Add($Node)
        }
        foreach ($property in $Node.PSObject.Properties) {
            Find-Attachments -Node $property.Value -Output $Output
        }
    }
}

function Decode-Attachment {
    param([object]$Attachment)
    $raw = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Attachment.body))
    return $raw | ConvertFrom-Json -Depth 100
}

function New-Manifest {
    $artifacts = @()
    Get-ChildItem -LiteralPath $EvidenceRoot -File -Recurse |
        Where-Object { $_.Name -ne "manifest.json" } |
        ForEach-Object {
            $artifacts += [ordered]@{
                path = [System.IO.Path]::GetRelativePath($EvidenceRoot, $_.FullName).Replace('\', '/')
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            }
        }
    Write-Json -Path (Join-Path $EvidenceRoot "manifest.json") -Value ([ordered]@{
        schema = "latticework.evidence.artifact-bundle.v1"
        work_id = $WorkId
        baseline_sha = $BaselineSha
        candidate_sha = $CandidateSha
        artifacts = @($artifacts | Sort-Object path)
    })
}

if (-not (Test-Path -LiteralPath $IndependentReviewPath -PathType Leaf)) {
    throw "Independent GREEN review receipt is required."
}
if ((Get-FileHash -LiteralPath (Join-Path $RepositoryRoot "docs\modules\lattice-memory.js") -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ModuleHash) {
    throw "Repository legacy module hash drifted."
}
if ((& git -C $BaselineRoot rev-parse HEAD).Trim() -ne $BaselineSha -or (& git -C $BaselineRoot status --porcelain)) {
    throw "Immutable baseline identity or cleanliness check failed."
}
Assert-Descendant -Path $EvidenceRoot -Root $RepositoryRoot -Label "evidence root" | Out-Null
Assert-Descendant -Path $RunRoot -Root $RepositoryRoot -Label "run root" | Out-Null
Remove-ExactDirectory -Path $EvidenceRoot -Expected $EvidenceRoot -Label "evidence root"
New-Item -ItemType Directory -Force -Path $EvidenceRoot, $ReportRoot | Out-Null

$env:LATTICEWORK_BASELINE_ROOT = $BaselineRoot
$env:LATTICEWORK_P5_RUN_ID = $RunId
$env:LATTICEWORK_P5_PLAYWRIGHT_ROOT = $ReportRoot
$env:TEMP = Join-Path $RunRoot "temp"
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

& node tools/reengineering/validate-phase5-active-scope.mjs | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Phase 5 active scope failed." }
& node tools/reengineering/validate-phase5-lattice-memory-preflight.mjs | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Phase 5 packet validation failed." }

& tests\characterization\node_modules\.bin\playwright.cmd test --config tests\characterization\phase5-lattice-memory.playwright.config.mjs
if ($LASTEXITCODE -ne 0) { throw "LatticeMemory browser characterization failed." }

$ReportPath = Join-Path $ReportRoot "playwright-results.json"
$report = Get-Content -LiteralPath $ReportPath -Raw | ConvertFrom-Json -Depth 100
$attachments = [System.Collections.Generic.List[object]]::new()
Find-Attachments -Node $report -Output $attachments
if ($attachments.Count -ne 207) {
    throw "Expected 207 atom attachments; observed $($attachments.Count)."
}
$byAtom = @{}
foreach ($attachment in $attachments) {
    $value = Decode-Attachment -Attachment $attachment
    if (-not $value.atom_id) { throw "Atom attachment is missing atom_id." }
    if (-not $byAtom.ContainsKey($value.atom_id)) { $byAtom[$value.atom_id] = @{} }
    $byAtom[$value.atom_id][$attachment.name] = $value
}
if ($byAtom.Count -ne 69) { throw "Expected 69 atom attachment sets; observed $($byAtom.Count)." }

$results = @()
foreach ($atomId in @($byAtom.Keys | Sort-Object)) {
    $set = $byAtom[$atomId]
    foreach ($required in @("scenario-result.json", "network.json", "storage.json")) {
        if (-not $set.ContainsKey($required)) { throw "$atomId missing $required" }
    }
    $observation = $set["scenario-result.json"]
    $network = $set["network.json"]
    $storage = $set["storage.json"]
    if ($observation.status -ne "PASS") { throw "$atomId is not PASS." }
    $directory = Join-Path $EvidenceRoot "results\$atomId"
    Write-Json -Path (Join-Path $directory "observation.json") -Value $observation
    Write-Json -Path (Join-Path $directory "network.json") -Value $network
    Write-Json -Path (Join-Path $directory "storage.json") -Value $storage
    $results += [ordered]@{
        id = $atomId
        group = $observation.group_id
        status = $observation.status
        disposition = $observation.disposition
        receipts = [ordered]@{
            observation = "results/$atomId/observation.json"
            network = "results/$atomId/network.json"
            storage = "results/$atomId/storage.json"
        }
    }
}

$clean = $byAtom["P5-MEM-CLEAN-001"]["scenario-result.json"].observed
$review = Get-Content -LiteralPath $IndependentReviewPath -Raw | ConvertFrom-Json -Depth 100
if ($review.verdict -ne "GREEN" -or $review.independent -ne $true -or $review.atom_count -ne 69 -or $review.clean_worktree -ne $true) {
    throw "Independent review receipt is not exact GREEN."
}
Write-Json -Path (Join-Path $EvidenceRoot "independent-review.json") -Value $review

& node --test tests/reengineering/*.test.mjs
if ($LASTEXITCODE -ne 0) { throw "Repository controls failed." }
& git diff --check
if ($LASTEXITCODE -ne 0) { throw "Diff hygiene failed." }

Write-Json -Path (Join-Path $EvidenceRoot "summary.json") -Value ([ordered]@{
    schema = "latticework.phase5-lattice-memory-characterization.v1"
    work_id = $WorkId
    status = "GREEN"
    baseline_sha = $BaselineSha
    candidate_sha = $CandidateSha
    captured_at = [DateTime]::UtcNow.ToString("o")
    synthetic_only = $true
    external_egress = $false
    cleanup = [ordered]@{
        listener_closed = [bool]$clean.listener_closed
        port_released = [bool]$clean.port_released
        profiles_deleted = [bool]$clean.profiles_deleted
        run_root_deleted = [bool]$clean.run_root_deleted
    }
    gates = @(
        "phase5-active-scope", "immutable-source", "browser-characterization",
        "storage-isolation", "network-denial", "content-free-scan",
        "artifact-manifest", "independent-clean-worktree",
        "repository-controls", "hygiene"
    ) | ForEach-Object { [ordered]@{ id = $_; status = "PASS" } }
    results = @($results)
})
New-Manifest

& node tools/reengineering/validate-phase5-lattice-memory-characterization.mjs
if ($LASTEXITCODE -ne 0) { throw "Promoted characterization evidence failed validation." }

Remove-ExactDirectory -Path $RunRoot -Expected $RunRoot -Label "run root"
