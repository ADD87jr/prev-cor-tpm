@echo off
cd /d "C:\Users\Dan\Desktop\backup_magazin_full_2026-01-31"

:: Verifica daca serverul ruleaza
curl -s -o NUL http://localhost:3000 2>NUL
if %errorlevel% neq 0 (
    echo Pornesc serverul...
    start /min cmd /c "npm run dev"
    timeout /t 10 /nobreak >NUL
)

:: Deschide browserul
start http://localhost:3000/admin
