$ErrorActionPreference = 'Stop'

$paths = @(
  'README.md',
  'package.json',
  '.github/workflows/ai-studio-regression.yml',
  'scripts/smoke-ai-studio-offer-portal.ps1',
  'src/app/api/ai-studio/portal/[id]/route.ts',
  'src/app/portal/project/[id]/page.tsx',
  'src/lib/ai-studio/portalRules.ts',
  'tests/api/ai-studio-portal-route.test.ts',
  'tests/api/ai-studio-portal-rules.test.ts'
)

Write-Host 'Staging AI Studio regression files...' -ForegroundColor Cyan
foreach ($p in $paths) {
  git add -- $p
}

Write-Host ''
Write-Host 'Staged files:' -ForegroundColor Green
git diff --cached --name-only

Write-Host ''
Write-Host 'Next:' -ForegroundColor Yellow
Write-Host 'git commit -m "feat(ai-studio): enforce portal sent-state rule and add regression checks"'
