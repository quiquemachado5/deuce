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
  await expect(page.getByRole('heading', { name: /^Cobertura del archivo/ })).toBeVisible();
  await expect(page.locator('#main-content')).toContainText(summary.version || summary.datasetVersion);
  await expect(page.locator('#main-content')).toContainText('Moqueta');
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
  const input = page.locator('#global-search');
  await input.fill('Wimbledon');
  await expect(page.locator('[data-search-result][href="/torneos/wimbledon"]')).toBeVisible({ timeout: 15_000 });
  await input.fill('Wimbledon 2008');
  await expect(page.locator('[data-search-result][href="/torneos/wimbledon/2008"]')).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-search-result][href="/torneos/wimbledon/2008"]').click();
  await expect(page).toHaveURL(/\/torneos\/wimbledon\/2008/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Wimbledon');
  await page.getByRole('button', { name: 'Buscar en DEUCE', exact: true }).click();
  await input.fill('Djokovich');
  await expect(page.locator('[data-search-result][href="/jugadores/novak-djokovic"]')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('#global-search-results')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('button', { name: 'Buscar en DEUCE', exact: true })).toBeFocused();
});

test('record circuit filters persist across navigation and reload', async ({ page }) => {
  await page.goto('/records?tour=atp');
  await page.getByRole('navigation', { name: 'Circuitos del archivo' }).getByRole('link', { name: 'WTA', exact: true }).click();
  await expect(page).toHaveURL(/tour=wta/);
  await expect(page.getByRole('navigation', { name: 'Circuitos del archivo' }).getByRole('link', { name: 'WTA', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page).toHaveURL(/tour=wta/);
  await expect(page.getByRole('navigation', { name: 'Circuitos del archivo' }).getByRole('link', { name: 'WTA', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('moqueta can be selected and returned by the API', async ({ page, request }) => {
  await page.goto('/buscar?surface=carpet');
  await expect(page.getByRole('link', { name: 'Quitar Moqueta', exact: true })).toBeVisible();
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
    await page.goto('/jugadores/novak-djokovic');
    await expect(page.getByRole('heading', { level: 1, name: 'Novak Djokovic' })).toBeVisible();
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
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
});

test('overview, matches, search and rivals identify the same validated generation', async ({ request }) => {
  const matchList = await (await request.get('/api/matches?limit=1')).json();
  const paths = ['/api/overview', '/api/matches?limit=1', `/api/matches/${matchList.matches[0].match_id}`, '/api/featured', '/api/search?q=Wimbledon', '/api/rivals?player=Novak%20Djokovic', '/api/health/deep'];
  const versions: string[] = [];
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.datasetVersion).toBeTruthy();
    expect(response.headers()['x-deuce-dataset-version']).toBe(body.datasetVersion);
    expect(['bundled', 'remote']).toContain(body.source);
    versions.push(body.datasetVersion);
  }
  expect(new Set(versions).size).toBe(1);
});
