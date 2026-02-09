# Script PowerShell pentru backup local site Next.js
# Salvează tot proiectul (fără node_modules/.next) într-un folder de backup pe Desktop

$source = "$PSScriptRoot"
$dest = "$env:USERPROFILE\Desktop\_backup_site"

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
