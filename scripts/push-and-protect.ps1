param(
  [string]$RemoteUrl,
  [string]$Branch,
  [string]$StatusCheckName = 'AI Studio Unit Checks'
)

$ErrorActionPreference = 'Stop'

function Info([string]$m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok([string]$m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Warn([string]$m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Fail([string]$m) { Write-Host "[ERROR] $m" -ForegroundColor Red; exit 1 }

function Assert-LastExit([string]$step) {
  if ($LASTEXITCODE -ne 0) {
    Fail "$step a esuat (exit code $LASTEXITCODE)."
  }
}

if (-not $Branch) {
  $Branch = (git branch --show-current).Trim()
}
if ([string]::IsNullOrWhiteSpace($Branch)) {
  Fail 'Nu pot determina branch-ul curent. Ruleaza cu -Branch master sau -Branch main.'
}

$origin = ''
try {
  $origin = (git remote get-url origin).Trim()
} catch {
  $origin = ''
}

if ([string]::IsNullOrWhiteSpace($origin)) {
  if ([string]::IsNullOrWhiteSpace($RemoteUrl)) {
    Fail 'Lipseste origin. Furnizeaza -RemoteUrl ca sa configurez remote-ul.'
  }
  Info "Configurez origin: $RemoteUrl"
  git remote add origin $RemoteUrl
  Assert-LastExit 'Configurare origin'
  $origin = (git remote get-url origin).Trim()
  Ok "Origin configurat: $origin"
} else {
  Ok "Origin existent: $origin"
}

Info "Fac push pentru branch-ul $Branch"
git push -u origin $Branch
Assert-LastExit 'Push'
Ok 'Push reusit.'

$ghCmd = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghCmd) {
  Warn 'gh nu este instalat. Sar peste branch protection automat.'
  Warn 'Instaleaza gh si ruleaza apoi scripts/setup-branch-protection.ps1.'
  exit 0
}

gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) {
  Warn 'gh nu este autentificat. Sar peste branch protection automat.'
  Warn 'Ruleaza: gh auth login'
  exit 0
}

Info 'Aplic branch protection automat.'
powershell -ExecutionPolicy Bypass -File scripts/setup-branch-protection.ps1 -Branch $Branch -StatusCheckName $StatusCheckName
Assert-LastExit 'Aplicare branch protection'
Ok 'Flux complet: push + branch protection.'
