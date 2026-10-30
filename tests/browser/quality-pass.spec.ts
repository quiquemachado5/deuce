import { expect, test } from '@playwright/test';

test('mobile match filters and view controls stay distinct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/buscar?year=2024');
  const filters = page.getByRole('button', { name: /Filtrar partidos/ });
  await expect(filters).toBeVisible();
  await filters.click();
  await expect(page.getByRole('combobox', { name: 'Superficie' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('scoreboards expose only the played sets and preserve tie-break superscripts', async ({ page }) => {
  await page.goto('/buscar?q=Nadal+Federer+Wimbledon+2008');
  const card = page.getByRole('link', { name: 'Ver Rafael Nadal contra Roger Federer' });
  await expect(card).toBeVisible();
  await expect(card.locator('sup')).not.toHaveCount(0);
  await expect(card).toContainText('Rafael Nadal');
  await expect(card).toContainText('Roger Federer');
});

test('record and player directories remain progressive and compact', async ({ page }) => {
  await page.goto('/records');
  await expect(page.getByRole('heading', { name: 'Explorar el archivo', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Familias de estadísticas' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/jugadores');
  const card = page.locator('main a[href^="/jugadores/"]').first();
  await expect(card).toBeVisible();
  expect((await card.boundingBox())!.height).toBeLessThan(520);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
