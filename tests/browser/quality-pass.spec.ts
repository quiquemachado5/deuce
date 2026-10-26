import { expect, test } from '@playwright/test';

test('mobile match filters keep search, filters and view controls distinct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/buscar');
  await expect(page.getByPlaceholder('Jugador, torneo, año, ronda')).toBeVisible();
  const filters = page.getByText(/^Filtros(?: \(\d+\))?$/);
  await expect(filters).toBeVisible();
  await filters.click();
  for (const label of ['2026', 'Superficie', 'Categoría', 'Ronda']) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('scoreboards show only the games in each set', async ({ page }) => {
  await page.goto('/buscar?q=Nadal+Federer+Wimbledon+2008');
  const card = page.locator('.match-scorecard').first();
  await expect(card.locator('.global-score-labels')).toHaveCount(0);
  await expect(card.locator('.global-set-total')).toHaveCount(0);
  await expect(card.locator('.global-set')).not.toHaveCount(0);
});

test('record index is progressive and mobile directories are compact', async ({ page }) => {
  await page.goto('/records');
  const family = page.locator('.records-family').first();
  await expect(family.locator('.records-family-more')).toBeVisible();
  expect(await family.locator('a').count()).toBeLessThanOrEqual(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/jugadores');
  const card = page.locator('.player-directory .catalog-card').first();
  await expect(card).toBeVisible();
  expect((await card.boundingBox())?.height).toBeLessThan(150);
});
