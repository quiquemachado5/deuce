import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const profile = '/jugadores/novak-djokovic?year=2014';

test('player profile remains useful without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(profile);
    await expect(page.getByRole('heading', { level: 1, name: 'Novak Djokovic' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Cifras principales de la carrera' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Torneos y palmarés' })).toBeVisible();
    await expect(page.locator('main a[href^="/match/"]').first()).toBeVisible();
  } finally {
    await context.close();
  }
});

test('player profile keeps career sections and season context readable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(profile);
  for (const heading of ['Resumen de carrera', 'Evolución temporal', 'Ranking observado', 'Torneos y palmarés', 'Rivales y enfrentamientos', 'Últimos partidos']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Temporada anterior' })).toBeVisible();
  await expect(page.locator('main a[href^="/match/"]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mobile comparison submits the selected pair from the searchable player lists', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/comparar?a=Novak%20Djokovic&b=Rafael%20Nadal');
  await expect(page.getByRole('heading', { name: 'Comparar', exact: true })).toBeVisible({ timeout: 20_000 });
  const first = page.getByLabel('Jugador 1', { exact: true });
  const second = page.getByLabel('Jugador 2', { exact: true });
  await expect(first).toHaveValue('Novak Djokovic');
  await second.fill('Roger Federer');
  await page.locator('#player-comparison-form').getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(page).toHaveURL(/a=Novak(?:\+|%20)Djokovic.*b=Roger(?:\+|%20)Federer/);
  await expect(page.locator('main')).toContainText('Roger Federer');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`player profile remains accessible without document overflow: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(profile);
    await expect(page.getByRole('heading', { level: 1, name: 'Novak Djokovic' })).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
    expect(audit.violations).toEqual([]);
  });
}
