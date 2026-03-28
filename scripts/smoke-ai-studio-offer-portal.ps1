$ErrorActionPreference = 'Stop'
$base = if ($env:AI_STUDIO_BASE_URL) { $env:AI_STUDIO_BASE_URL } else { 'http://localhost:3001' }
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$projName = "SMOKE-$ts"
$projectId = $null
$shareToken = $null

function Step([string]$name, [bool]$ok, [string]$detail) {
  if ($ok) {
    Write-Host "[PASS] $name - $detail" -ForegroundColor Green
  } else {
    Write-Host "[FAIL] $name - $detail" -ForegroundColor Red
    throw "Smoke failed at step: $name"
  }
}

$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $res = Invoke-WebRequest -Uri $base -UseBasicParsing -TimeoutSec 3
    if ($res.StatusCode -ge 200) {
      $ready = $true
      break
    }
  } catch {}
  Start-Sleep -Milliseconds 500
}
Step 'server-ready' $ready "base=$base"

try {
  $createBody = @{
    requirements = @{
      projectName = $projName
      clientName = 'SMOKE CLIENT'
      description = 'smoke flow'
    }
    conversationHistory = @()
  } | ConvertTo-Json -Depth 10

  $create = Invoke-RestMethod -Uri "$base/api/ai-studio/projects" -Method Post -ContentType 'application/json' -Body $createBody
  $projectId = [int]$create.projectId
  Step 'create-project' ($projectId -gt 0) "projectId=$projectId"

  $approve = Invoke-RestMethod -Uri "$base/api/ai-studio/offer-approve" -Method Post -ContentType 'application/json' -Body (@{ projectId = $projectId; action = 'approve' } | ConvertTo-Json)
  Step 'offer-approve' ($approve.offerStatus -eq 'approved') "status=$($approve.offerStatus)"

  $send = Invoke-RestMethod -Uri "$base/api/ai-studio/offer-approve" -Method Post -ContentType 'application/json' -Body (@{ projectId = $projectId; action = 'send' } | ConvertTo-Json)
  $shareToken = [string]$send.shareToken
  Step 'offer-send' (![string]::IsNullOrWhiteSpace($shareToken)) "status=$($send.offerStatus)"

  $portalGet = Invoke-RestMethod -Uri "$base/api/ai-studio/portal/$shareToken" -Method Get
  Step 'portal-get' ($portalGet.id -eq $projectId) "offerStatus=$($portalGet.offerStatus)"

  $portalApprove = Invoke-RestMethod -Uri "$base/api/ai-studio/portal/$shareToken" -Method Post -ContentType 'application/json' -Body (@{ action = 'approve'; clientName = 'Smoke QA'; message = 'Approved in smoke' } | ConvertTo-Json)
  Step 'portal-approve-when-sent' ($portalApprove.success -eq $true) "feedbackType=$($portalApprove.feedbackType)"

  $newVersion = Invoke-RestMethod -Uri "$base/api/ai-studio/offer-approve" -Method Post -ContentType 'application/json' -Body (@{ projectId = $projectId; action = 'new-version' } | ConvertTo-Json)
  Step 'offer-new-version' ($newVersion.offerStatus -eq 'draft') "status=$($newVersion.offerStatus) version=$($newVersion.offerVersion)"

  $code = 0
  try {
    $null = Invoke-RestMethod -Uri "$base/api/ai-studio/portal/$shareToken" -Method Post -ContentType 'application/json' -Body (@{ action = 'approve'; clientName = 'Smoke QA'; message = 'Should be blocked' } | ConvertTo-Json)
  } catch {
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode
    }
  }
  Step 'portal-approve-after-new-version' ($code -eq 409) "statusCode=$code"
}
finally {
  if ($projectId) {
    try {
      $null = Invoke-RestMethod -Uri "$base/api/ai-studio/projects/$projectId" -Method Delete
      Write-Host "[PASS] cleanup-delete - projectId=$projectId" -ForegroundColor Green
    } catch {
      Write-Host "[WARN] cleanup-delete failed - projectId=$projectId" -ForegroundColor Yellow
    }
  }
}

Write-Host 'Smoke completed successfully.' -ForegroundColor Green
