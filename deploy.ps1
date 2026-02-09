# ============================================
# SCRIPT DEPLOYMENT PRODUCȚIE - PREV-COR TPM
# ============================================
# Rulează: .\deploy.ps1

param(
    [switch]$SkipBuild,
    [switch]$GenerateSecrets
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT PREV-COR TPM" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verifică dacă suntem în directorul corect
if (-not (Test-Path "package.json")) {
    Write-Host "EROARE: Rulează scriptul din directorul proiectului!" -ForegroundColor Red
    exit 1
}

# Funcție pentru generare secret
function New-Secret {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Generează secrete dacă e cerut
if ($GenerateSecrets) {
    Write-Host "Generare secrete..." -ForegroundColor Yellow
    $nextAuthSecret = New-Secret
    $cronSecret = New-Secret
    Write-Host ""
    Write-Host "NEXTAUTH_SECRET=$nextAuthSecret" -ForegroundColor Green
    Write-Host "CRON_SECRET=$cronSecret" -ForegroundColor Green
    Write-Host ""
    Write-Host "Copiază aceste valori în .env.production" -ForegroundColor Yellow
    exit 0
}

# Pas 1: Verifică .env.production
Write-Host "[1/6] Verificare .env.production..." -ForegroundColor Yellow
if (-not (Test-Path ".env.production")) {
    Write-Host "EROARE: Fișierul .env.production nu există!" -ForegroundColor Red
    Write-Host "Creează-l mai întâi și completează valorile." -ForegroundColor Red
    exit 1
}

# Verifică dacă are valorile default
$envContent = Get-Content ".env.production" -Raw
if ($envContent -match "SCHIMBA_CU_CHEIE|sk_live_XXXXX|PAROLA_APP_GMAIL") {
    Write-Host "ATENTIE: .env.production conține valori placeholder!" -ForegroundColor Red
    Write-Host "Completează toate valorile înainte de deployment." -ForegroundColor Red
    exit 1
}
Write-Host "   OK - .env.production configurat" -ForegroundColor Green

# Pas 2: Instalare dependențe
Write-Host "[2/6] Instalare dependențe..." -ForegroundColor Yellow
npm install --production=false
if ($LASTEXITCODE -ne 0) {
    Write-Host "EROARE la instalare dependențe!" -ForegroundColor Red
    exit 1
}
Write-Host "   OK - Dependențe instalate" -ForegroundColor Green

# Pas 3: Prisma generate
Write-Host "[3/6] Generare Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "EROARE la Prisma generate!" -ForegroundColor Red
    exit 1
}
Write-Host "   OK - Prisma Client generat" -ForegroundColor Green

# Pas 4: Migrare bază de date
Write-Host "[4/6] Aplicare migrări bază de date..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "EROARE la migrări!" -ForegroundColor Red
    exit 1
}
Write-Host "   OK - Migrări aplicate" -ForegroundColor Green

# Pas 5: Build producție
if (-not $SkipBuild) {
    Write-Host "[5/6] Build producție..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "EROARE la build!" -ForegroundColor Red
        exit 1
    }
    Write-Host "   OK - Build complet" -ForegroundColor Green
} else {
    Write-Host "[5/6] Build skip (flag -SkipBuild)" -ForegroundColor Gray
}

# Pas 6: Instrucțiuni finale
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   BUILD COMPLET!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pași următori pentru deployment:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. PENTRU VERCEL:" -ForegroundColor Yellow
Write-Host "   - Push codul pe GitHub"
Write-Host "   - Conectează repo-ul în Vercel"
Write-Host "   - Adaugă variabilele din .env.production"
Write-Host ""
Write-Host "2. PENTRU VPS:" -ForegroundColor Yellow
Write-Host "   - Copiază proiectul pe server"
Write-Host "   - Rulează: npm start"
Write-Host "   - Sau folosește PM2: pm2 start npm --name prevcortpm -- start"
Write-Host ""
Write-Host "3. CONFIGURARE STRIPE LIVE:" -ForegroundColor Yellow
Write-Host "   - Mergi la https://dashboard.stripe.com"
Write-Host "   - Dezactivează Test Mode"
Write-Host "   - Copiază cheile LIVE în .env.production"
Write-Host "   - Creează webhook: https://prevcortpm.ro/api/stripe-webhook"
Write-Host ""
Write-Host "4. CONFIGURARE DNS:" -ForegroundColor Yellow
Write-Host "   - Record A: prevcortpm.ro -> IP_SERVER"
Write-Host "   - Record A: www.prevcortpm.ro -> IP_SERVER"
Write-Host ""
