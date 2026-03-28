param(
  [string]$Branch,
  [string]$StatusCheckName = 'AI Studio Unit Checks'
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  Write-Host "[ERROR] $Message" -ForegroundColor Red
  exit 1
}

function Info([string]$Message) {
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Success([string]$Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Assert-LastExit([string]$step) {
  if ($LASTEXITCODE -ne 0) {
    Fail "$step a esuat (exit code $LASTEXITCODE)."
  }
}

if (-not $Branch) {
  $Branch = (git branch --show-current).Trim()
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
  Fail 'Nu am putut determina branch-ul curent. Ruleaza cu -Branch master sau -Branch main.'
}

$originUrl = ''
try {
  $originUrl = (git remote get-url origin).Trim()
} catch {
  Fail 'Remote origin nu este configurat. Configureaza origin si ruleaza din nou.'
}

if ([string]::IsNullOrWhiteSpace($originUrl)) {
  Fail 'Remote origin este gol.'
}

$ghCmd = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghCmd) {
  Fail 'GitHub CLI (gh) nu este instalat. Instaleaza gh si autentifica-te cu gh auth login.'
}

gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) {
  Fail 'gh nu este autentificat. Ruleaza gh auth login.'
}

$owner = $null
$repo = $null

if ($originUrl -match 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$') {
  $owner = $Matches['owner']
  $repo = $Matches['repo']
}

if (-not $owner -or -not $repo) {
  Fail "Nu am putut extrage owner/repo din origin: $originUrl"
}

Info "Repo detectat: $owner/$repo"
Info "Branch target: $Branch"
Info "Status check required: $StatusCheckName"

$payload = @{
  required_status_checks = @{
    strict = $true
    contexts = @($StatusCheckName)
  }
  enforce_admins = $false
  required_pull_request_reviews = @{
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $false
    required_approving_review_count = 1
    require_last_push_approval = $false
  }
  restrictions = $null
  required_conversation_resolution = $true
  allow_force_pushes = $false
  allow_deletions = $false
  block_creations = $false
  required_linear_history = $false
  lock_branch = $false
  allow_fork_syncing = $true
} | ConvertTo-Json -Depth 20 -Compress

$apiPath = "repos/$owner/$repo/branches/$Branch/protection"
$tmpFile = Join-Path $env:TEMP ("branch-protection-" + [guid]::NewGuid().ToString() + ".json")

try {
  Set-Content -Path $tmpFile -Value $payload -Encoding UTF8
  $null = gh api --method PUT --header "Accept: application/vnd.github+json" --header "X-GitHub-Api-Version: 2022-11-28" $apiPath --input $tmpFile
  Assert-LastExit 'Aplicare branch protection prin gh api'
  Success 'Branch protection aplicat cu succes.'
  Success 'Reguli: PR obligatoriu, 1 review, status check AI Studio Unit Checks.'
} catch {
  Fail "Nu am putut aplica branch protection. Verifica permisiunile repo/admin. Detalii: $($_.Exception.Message)"
} finally {
  if (Test-Path $tmpFile) {
    Remove-Item -Path $tmpFile -Force -ErrorAction SilentlyContinue
  }
}
