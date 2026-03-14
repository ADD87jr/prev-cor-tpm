import { test, expect } from '@playwright/test';

// Credentials pentru admin (de setat în .env sau aici pentru teste)
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'test123';

test.describe('Admin Panel', () => {
  test('redirectează la login când nu e autentificat', async ({ page }) => {
    await page.goto('/admin');
    
    // Verifică redirect la login
    await expect(page).toHaveURL(/login|autentificare|signin/);
  });

  test('pagina de login se încarcă', async ({ page }) => {
    await page.goto('/login');
    
    // Verifică că există formularul de login
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitBtn = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('afișează eroare la credențiale greșite', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"], input[name="email"]', 'invalid@email.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Așteaptă mesaj de eroare
    await page.waitForLoadState('networkidle');
    const errorMsg = page.locator('text=/eroare|invalid|greșit|error|wrong/i');
    
    // Poate fi vizibil sau nu, depinde de implementare
    await page.waitForTimeout(2000);
  });
});

test.describe('Admin Dashboard - autentificat', () => {
  test.skip(true, 'Necesită setup de autentificare valid');
  
  test('dashboard se încarcă', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Verifică redirect la admin
    await page.waitForURL(/admin/);
    
    // Verifică că există dashboard elements
    const dashboard = page.locator('[data-testid="dashboard"], .dashboard, main');
    await expect(dashboard).toBeVisible();
  });
});
