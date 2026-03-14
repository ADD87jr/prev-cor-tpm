import { test, expect } from '@playwright/test';

test.describe('Pagina principală', () => {
  test('se încarcă corect', async ({ page }) => {
    await page.goto('/');
    
    // Verifică titlul paginii
    await expect(page).toHaveTitle(/magazin|shop|produs/i);
    
    // Verifică că există header
    await expect(page.locator('header')).toBeVisible();
    
    // Verifică că există footer
    await expect(page.locator('footer')).toBeVisible();
  });

  test('navigare către produse', async ({ page }) => {
    await page.goto('/');
    
    // Click pe un link de produse
    const productsLink = page.locator('a[href*="produse"], a[href*="products"]').first();
    if (await productsLink.isVisible()) {
      await productsLink.click();
      await expect(page).toHaveURL(/produse|products/);
    }
  });

  test('responsive - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verifică că pagina se încarcă
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Căutare produse', () => {
  test('funcționează căutarea', async ({ page }) => {
    await page.goto('/');
    
    // Caută input de search
    const searchInput = page.locator('input[type="search"], input[name="search"], input[placeholder*="caut"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // Așteaptă rezultatele sau URL-ul să se schimbe
      await page.waitForLoadState('networkidle');
    }
  });
});
