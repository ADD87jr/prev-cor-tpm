# Script PowerShell pentru programare automată backup zilnic site Next.js
# Rulează o singură dată acest script din folderul proiectului

$taskName = "Backup Site Next.js"
$scriptPath = "$PSScriptRoot\backup_site.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File '$scriptPath'"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description "Backup automat site Next.js pe Desktop" -Force

Write-Host "Task-ul de backup automat a fost creat! Backup-ul se va executa zilnic la ora 3:00 AM."
