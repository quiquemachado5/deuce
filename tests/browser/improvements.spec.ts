import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('compound searches keep player, year, final and format constraints', async ({ page, request }) => {
  const response = await request.get('/api/search?q=Nadal%20Federer%20Wimbledon%202008');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.items.some((item: { group: string; name: string }) => item.group === 'Partidos' && item.name.includes('Rafael Nadal') && item.name.includes('Roger Federer'))).toBeTruthy();
  await page.goto('/buscar?q=finales+a+cinco+sets+Wimbledon+2008');
  await expect(page.locator('main')).toContainText('Interpretamos: Cinco sets · Final · 2008');
  const match = page.getByRole('link', { name: 'Ver Rafael Nadal contra Roger Federer' });
  await expect(match).toContainText('Rafael Nadal');
  await expect(match).toContainText('Roger Federer');
});

test('return from a match restores the filtered list', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/buscar?q=Alcaraz&surface=hard&limit=24');
  const card = page.locator('main a[href^="/match/"]').nth(6);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/match\//);
  await page.goBack();
  await expect(page).toHaveURL(/q=Alcaraz.*surface=hard.*limit=24/);
  await expect(page.locator('main a[href^="/match/"]').first()).toBeVisible();
});

test('record detail and index remain focused on discovery', async ({ page }) => {
  await page.goto('/records?dato=top-10');
  await expect(page.getByRole('heading', { name: 'Más victorias ante el top 10' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clasificación', exact: true })).toBeVisible();
  await page.goto('/records');
  await expect(page.getByRole('heading', { name: 'Clasificaciones históricas' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Familias de estadísticas' })).toBeVisible();
});

test('shared career comparison keeps the chosen period and evidence', async ({ page }) => {
  await page.goto('/comparar?a=Novak%20Djokovic&b=Rafael%20Nadal&period=shared');
  await expect(page.getByRole('heading', { name: 'Comparar', exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel('Periodo de comparación')).toHaveValue('shared');
  await expect(page.getByRole('heading', { name: 'Comparación métrica' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cara a cara' })).toBeVisible();
  await expect(page.locator('main a[href^="/match/"]').first()).toBeVisible();
});

test('coverage and editorial pages work at narrow and wide widths', async ({ page }) => {
  for (const route of ['/historias', '/cobertura', '/no-existe-auditoria']) {
    await page.goto(route);
    for (const width of [320, 390, 834, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.evaluate(() => document.getAnimations().forEach(animation => {
      try { animation.finish(); } catch { /* Preserve deliberate infinite ambient motion. */ }
    }));
    const audit = await new AxeBuilder({ page }).exclude('iframe[src*="youtube"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
  }
});
