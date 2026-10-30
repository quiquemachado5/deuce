import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('mobile home keeps its current editorial sections compact and accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Últimos resultados', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Récords que explican el juego', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Grandes escenarios', exact: true })).toBeVisible();
  await expect(page.locator('main a[href^="/match/"]').first()).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
});

test('navigation is immediate and licences remain in the dedicated directory', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Principal', exact: true }).getByRole('link', { name: 'Jugadores' }).click();
  await expect(page).toHaveURL(/\/jugadores/);
  await expect(page.getByRole('heading', { level: 1, name: 'Jugadores' })).toBeVisible();
  await page.goto('/licencias?q=Nastase');
  await expect(page.getByRole('heading', { level: 1, name: 'Licencias' })).toBeVisible();
  await expect(page.locator('.ry-photo-entry').first()).toBeVisible();
  await expect(page.locator('.ry-photo-audit').first()).toBeVisible();
});
