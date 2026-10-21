import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('overview is real, versioned and matches the public coverage page', async ({ page, request }) => {
  const response = await request.get('/api/overview');
  expect(response.status()).toBe(200);
  const summary = await response.json();
  expect(summary.mode).toBe('ARCHIVO REAL');
  expect(summary.matches).toBeGreaterThan(100_000);
  expect(summary.rulesVersion).toBeTruthy();
  await page.goto('/cobertura');
  await expect(page.getByRole('heading', { name: 'Cobertura del archivo', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText(summary.version || summary.datasetVersion);
  await expect(page.locator('main')).toContainText('Moqueta');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('coverage-mobile.png'), fullPage: true });
});

test('global search finds tournaments, editions and a player with a typo', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Buscar en DEUCE', exact: true });
  await trigger.click();
  const input = page.locator('#ry-search-query');
  await input.fill('Wimbledon');
  await expect(page.locator('dialog[open] a[href="/torneos/wimbledon"]')).toBeVisible();
  await input.fill('Wimbledon 2008');
  await expect(page.locator('dialog[open] a[href="/wimbledon/2008"]')).toBeVisible();
  await input.fill('Djokovich');
  await expect(page.locator('dialog[open] a[href="/players/novak-djokovic"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('missing historical rank keeps filters and explains missing coverage', async ({ page }) => {
  await page.goto('/records?dato=top-10&year=2023');
  await expect(page.locator('select[name=year]')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('No tenemos ranking histórico');
  await page.locator('select[name=year]').selectOption('2019');
  await expect(page).toHaveURL(/year=2019/);
  await expect(page.getByRole('heading', { name: 'Clasificación', exact: true })).toBeVisible();
});

test('moqueta can be selected and returned by the API', async ({ page, request }) => {
  await page.goto('/buscar?surface=carpet');
  await expect(page.locator('select[name=surface]')).toHaveValue('carpet');
  const response = await request.get('/api/matches?surface=carpet&limit=5');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.total).toBeGreaterThan(10_000);
  expect(body.matches).toHaveLength(5);
  for (const match of body.matches) expect(match.surface).toBe('carpet');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`player accessibility, surface totals and no mobile overflow: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/players/novak-djokovic');
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`player-${colorScheme}.png`), fullPage: true });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('API validation, protected cron and security headers remain intact', async ({ request }) => {
  expect((await request.get('/api/matches?limit=10000')).status()).toBe(400);
  expect((await request.get('/api/cron/refresh')).status()).toBe(401);
  const response = await request.get('/');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
});
