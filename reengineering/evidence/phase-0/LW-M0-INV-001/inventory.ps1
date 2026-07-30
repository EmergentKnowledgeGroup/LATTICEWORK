param(
  [Parameter(Mandatory=$true)][string]$Baseline,
  [Parameter(Mandatory=$true)][string]$OutDir
)
$ErrorActionPreference = 'Stop'
$Baseline = (Resolve-Path -LiteralPath $Baseline).Path
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path -LiteralPath $OutDir).Path

function Write-Utf8Json($Path, $Object) { $Object | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $Path -Encoding utf8 }
function Csv([string]$Name, $Rows) { $Rows | Export-Csv -LiteralPath (Join-Path $OutDir $Name) -NoTypeInformation -Encoding utf8 }
function Language([string]$p) {
  $n=[IO.Path]::GetFileName($p).ToLowerInvariant(); $e=[IO.Path]::GetExtension($p).ToLowerInvariant()
  if($n -in @('makefile','dockerfile')) { return $n }
  switch($e) { '.js' {'JavaScript'} '.mjs' {'JavaScript'} '.cjs' {'JavaScript'} '.html' {'HTML'} '.css' {'CSS'} '.md' {'Markdown'} '.json' {'JSON'} '.py' {'Python'} '.sh' {'Shell'} '.bat' {'Batch'} '.cmd' {'Batch'} '.toml' {'TOML'} '.yml' {'YAML'} '.yaml' {'YAML'} '.txt' {'Text'} '.svg' {'SVG'} default { if($e) { "Other:$e" } else {'Extensionless'} } }
}
function IsText([string]$Full) {
  $b=[IO.File]::ReadAllBytes($Full); if($b.Length -eq 0){return $true}; return -not ($b -contains 0)
}
function LineCount([string]$Full) { if(-not (IsText $Full)){return $null}; $r=[IO.File]::OpenText($Full); try { $n=0; while($null -ne $r.ReadLine()){$n++}; return $n } finally {$r.Dispose()} }
function Sha256([string]$Full) { (Get-FileHash -Algorithm SHA256 -LiteralPath $Full).Hash.ToLowerInvariant() }

$started=(Get-Date).ToUniversalTime().ToString('o')
$sha=(git -C $Baseline rev-parse HEAD).Trim()
$branch=(git -C $Baseline status --short --branch | Select-Object -First 1)
$tracked=@(git -C $Baseline ls-files -z | ForEach-Object { $_ -split "`0" } | Where-Object { $_ })
$rows=foreach($rel in $tracked){
  $full=Join-Path $Baseline $rel; $item=Get-Item -LiteralPath $full
  $text=IsText $full; $loc=if($text){LineCount $full}else{$null}; $top=($rel -split '[\\/]')[0]
  [pscustomobject]@{path=$rel; directory=$top; language=(Language $rel); bytes=$item.Length; is_text=$text; loc=$loc; sha256=(Sha256 $full)}
}
$rows | Sort-Object path | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $OutDir 'tracked-files.json') -Encoding utf8
Csv 'tracked-files.csv' ($rows | Sort-Object path)
$lang=$rows | Group-Object language | ForEach-Object {[pscustomobject]@{language=$_.Name;files=$_.Count;bytes=($_.Group|Measure-Object bytes -Sum).Sum;loc=($_.Group|Where-Object {$null -ne $_.loc}|Measure-Object loc -Sum).Sum}} | Sort-Object @{e='loc';d=$true},language
$dirs=$rows | Group-Object directory | ForEach-Object {[pscustomobject]@{directory=$_.Name;files=$_.Count;bytes=($_.Group|Measure-Object bytes -Sum).Sum;loc=($_.Group|Where-Object {$null -ne $_.loc}|Measure-Object loc -Sum).Sum}} | Sort-Object @{e='loc';d=$true},directory
Csv 'language-summary.csv' $lang; Csv 'path-summary.csv' $dirs
$largest=$rows|Sort-Object -Property @{Expression='bytes';Descending=$true},@{Expression='path';Descending=$false}|Select-Object -First 50 path,directory,language,bytes,loc,sha256; Csv 'largest-files.csv' $largest
$dups=$rows|Group-Object sha256|Where-Object {$_.Count -gt 1}|ForEach-Object { $paths=@($_.Group.path|Sort-Object); [pscustomobject]@{sha256=$_.Name;files=$_.Count;bytes=$_.Group[0].bytes;loc=$_.Group[0].loc;total_duplicate_bytes=$_.Group[0].bytes*($_.Count-1);total_duplicate_loc=if($null -ne $_.Group[0].loc){$_.Group[0].loc*($_.Count-1)}else{$null};paths=$paths -join ' | ';root_docs_mirror=(($paths|Where-Object {$_ -notmatch '[\\/]'}).Count -gt 0 -and ($paths|Where-Object {$_ -match '^docs[\\/]'}).Count -gt 0)}}
$dups|ConvertTo-Json -Depth 4|Set-Content -LiteralPath (Join-Path $OutDir 'exact-duplicates.json') -Encoding utf8; Csv 'exact-duplicates.csv' $dups

$manifestNames='package.json','package-lock.json','npm-shrinkwrap.json','yarn.lock','pnpm-lock.yaml','requirements.txt','pyproject.toml','Pipfile','poetry.lock','Cargo.toml','go.mod','Gemfile','composer.json','wrangler.toml'
$manifests=$rows|Where-Object { $manifestNames -contains ([IO.Path]::GetFileName($_.path)) }|ForEach-Object {[pscustomobject]@{path=$_.path;bytes=$_.bytes;sha256=$_.sha256;preview=((Get-Content -LiteralPath (Join-Path $Baseline $_.path) -TotalCount 120) -join "`n")}}
Write-Utf8Json (Join-Path $OutDir 'dependency-manifests.json') $manifests

$code=$rows|Where-Object {$_.is_text -and $_.language -in @('JavaScript','HTML','Python','Shell','Batch','JSON','TOML')}
function Hits([string]$Name,[string]$Pattern) { $h=@(); foreach($f in $code){$m=Select-String -LiteralPath (Join-Path $Baseline $f.path) -Pattern $Pattern -AllMatches; foreach($x in $m){$h += [pscustomobject]@{category=$Name;path=$f.path;line=$x.LineNumber;text=$x.Line.Trim()}}}; return $h }
$storage=@(); $storage+=Hits 'indexeddb' '(?i)indexedDB\.(open|deleteDatabase)|IDBDatabase|createObjectStore'; $storage+=Hits 'localStorage' '(?i)\blocalStorage\b'; $storage+=Hits 'sessionStorage' '(?i)\bsessionStorage\b'
$storage|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $OutDir 'storage-hits.json') -Encoding utf8; Csv 'storage-hits.csv' $storage
$window=@(); $window+=Hits 'window_assignment' '(?i)\bwindow\.[A-Za-z_$][\w$]*\s*='; $window+=Hits 'window_access' '(?i)\bwindow\.[A-Za-z_$][\w$]*'; $window|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $OutDir 'window-hits.json') -Encoding utf8; Csv 'window-hits.csv' $window
$identifiers=@(); $symbols=@()
foreach($f in $code){ $src=[IO.File]::ReadAllText((Join-Path $Baseline $f.path)); foreach($m in [regex]::Matches($src,'(?i)(localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*[\''"]([^\''"]+)[\''"]')){ $identifiers += [pscustomobject]@{kind=$m.Groups[1].Value;name=$m.Groups[2].Value;path=$f.path} }; foreach($m in [regex]::Matches($src,'(?i)indexedDB\.open\(\s*[\''"]([^\''"]+)[\''"]')){ $identifiers += [pscustomobject]@{kind='indexedDB_database';name=$m.Groups[1].Value;path=$f.path} }; foreach($m in [regex]::Matches($src,'(?i)createObjectStore\(\s*[\''"]([^\''"]+)[\''"]')){ $identifiers += [pscustomobject]@{kind='indexedDB_store';name=$m.Groups[1].Value;path=$f.path} }; foreach($m in [regex]::Matches($src,'(?i)\bwindow\.([A-Za-z_$][\w$]*)\s*=')){ $symbols += [pscustomobject]@{symbol=$m.Groups[1].Value;path=$f.path} } }
$identifiers=$identifiers|Sort-Object kind,name,path -Unique; Csv 'storage-identifiers.csv' $identifiers; Write-Utf8Json (Join-Path $OutDir 'storage-identifiers.json') $identifiers
$symbols=$symbols|Sort-Object symbol,path -Unique; Csv 'window-symbol-assignments.csv' $symbols; Write-Utf8Json (Join-Path $OutDir 'window-symbol-assignments.json') $symbols
$cdn=Hits 'external_or_cdn' '(?i)(https?://|cdn\.|unpkg\.com|jsdelivr|cdnjs|esm\.sh|skypack|openrouter|groq|together\.ai)'; $cdn|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $OutDir 'external-cdn-hints.json') -Encoding utf8; Csv 'external-cdn-hints.csv' $cdn
$tests=$rows|Where-Object {$_.path -match '(^|[\\/])(test|tests|__tests__|spec)([\\/]|$)|(^|[._-])(test|spec)([._-]|$)'}|Sort-Object path; $tests|ConvertTo-Json -Depth 4|Set-Content -LiteralPath (Join-Path $OutDir 'test-inventory.json') -Encoding utf8; Csv 'test-inventory.csv' $tests

$entry=@(); foreach($name in 'README.md','QUICKSTART.md','QUICK-START.md','SELF-HOST.md','package.json','server.js','server.py','start-freelattice.bat','start-freelattice.sh','manifest.json','worker/wrangler.toml.example','desktop/package.json'){ if($tracked -contains $name){ $entry += [pscustomobject]@{path=$name;preview=((Get-Content -LiteralPath (Join-Path $Baseline $name) -TotalCount 160) -join "`n")}}}; Write-Utf8Json (Join-Path $OutDir 'entrypoint-evidence.json') $entry
$meta=[ordered]@{ baseline=$Baseline; sha=$sha; branch_status=$branch; generated_utc=(Get-Date).ToUniversalTime().ToString('o'); files=$rows.Count; text_files=($rows|Where-Object is_text).Count; text_loc=($rows|Where-Object {$null -ne $_.loc}|Measure-Object loc -Sum).Sum; binary_files=($rows|Where-Object {-not $_.is_text}).Count; exclusions=@('Only git-tracked paths from git ls-files; no ignored/untracked files. LOC is physical non-binary line count and includes blank/comment lines. Text heuristic treats any NUL byte as binary. Storage/window results are static regex hits, not runtime reachability.'); tools=[ordered]@{powershell=$PSVersionTable.PSVersion.ToString();git=(git --version);node=(node --version);python=(python --version);rg=(rg --version|Select-Object -First 1)}; commands=@('git -C <baseline> rev-parse HEAD','git -C <baseline> status --short --branch','git -C <baseline> ls-files -z','powershell -ExecutionPolicy Bypass -File inventory.ps1 -Baseline <baseline> -OutDir <outdir>') }; Write-Utf8Json (Join-Path $OutDir 'inventory-meta.json') $meta
Get-ChildItem -LiteralPath $OutDir -Filter '*.json' | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName | ConvertFrom-Json | Out-Null }
"Inventory complete: $($rows.Count) tracked files, SHA $sha"
