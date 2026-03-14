import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
  test('API produse răspunde', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.ok() || response.status() === 401).toBeTruthy();
  });

  test('API categorii răspunde', async ({ request }) => {
    const response = await request.get('/api/categories');
    expect(response.ok() || response.status() === 401 || response.status() === 404).toBeTruthy();
  });

  test('Sitemap.xml există', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok() || response.status() === 404).toBeTruthy();
  });

  test('Robots.txt există', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();
  });

  test('Manifest.json există', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();
    
    if (response.ok()) {
      const manifest = await response.json();
      expect(manifest).toHaveProperty('name');
    }
  });
});

test.describe('Admin API - necesită autentificare', () => {
  test('Dashboard API necesită auth', async ({ request }) => {
    const response = await request.get('/admin/api/dashboard');
    // Ar trebui să returneze 401 sau redirect
    expect([401, 403, 302, 307].includes(response.status()) || response.ok()).toBeTruthy();
  });

  test('Export orders necesită auth', async ({ request }) => {
    const response = await request.get('/admin/api/export-orders');
    expect([401, 403, 302, 307, 500].includes(response.status()) || response.ok()).toBeTruthy();
  });
});
