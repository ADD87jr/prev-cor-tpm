# Script PowerShell pentru backup complet site Next.js
# Include: fișiere proiect + baza de date (JSON + SQLite)

$source = "$PSScriptRoot"
$dest = "$env:USERPROFILE\Desktop\_backup_site"

# 1. Backup baza de date (JSON + SQLite)
Write-Host "1. Backup baza de date..."
Set-Location $source
node scripts/backup-database.js

# 2. Backup fișiere proiect
Write-Host "`n2. Backup fișiere proiect..."

# Exclude foldere inutile
$exclude = @('node_modules', '.next', '_backup_site')

Write-Host "Backup site din $source către $dest..."

# Creează folder backup dacă nu există
if (!(Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest | Out-Null
}

# Copiază fișierele și folderele, excluzând cele din $exclude
Get-ChildItem -Path $source -Exclude $exclude -Recurse | ForEach-Object {
    $target = $_.FullName.Replace($source, $dest)
    if ($_.PSIsContainer) {
        if (!(Test-Path $target)) { New-Item -ItemType Directory -Path $target | Out-Null }
    } else {
        Copy-Item $_.FullName -Destination $target -Force
    }
}

Write-Host "Backup completat! Găsești fișierele în $dest."
