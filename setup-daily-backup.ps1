# Setup Backup Task pentru Windows Task Scheduler
# Rulează zilnic la ora 02:00 pentru a face backup automat din Turso

$taskName = "PREVCOR-TursoBackup"
$projectPath = $PSScriptRoot
$scriptPath = Join-Path $projectPath "scripts\backup-turso.js"

# Verifică dacă task-ul există deja
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task-ul '$taskName' există deja." -ForegroundColor Yellow
    $response = Read-Host "Vrei să-l înlocuiești? (da/nu)"
    if ($response -ne "da") {
        Write-Host "❌ Anulat." -ForegroundColor Red
        exit
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Creează acțiunea - rulează node script
$action = New-ScheduledTaskAction -Execute "node" -Argument "`"$scriptPath`"" -WorkingDirectory $projectPath

# Trigger zilnic la ora 02:00
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

# Setări task
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Înregistrează task-ul
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Backup automat Turso pentru PREV-COR TPM" `
    -RunLevel Highest

Write-Host ""
Write-Host "✅ Task '$taskName' creat cu succes!" -ForegroundColor Green
Write-Host "📅 Backup automat zilnic la ora 02:00" -ForegroundColor Cyan
Write-Host ""
Write-Host "Comenzi utile:" -ForegroundColor Yellow
Write-Host "  Verifică status:  Get-ScheduledTask -TaskName '$taskName'"
Write-Host "  Rulează manual:   Start-ScheduledTask -TaskName '$taskName'"
Write-Host "  Șterge task:      Unregister-ScheduledTask -TaskName '$taskName'"
Write-Host ""
