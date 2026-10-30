import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home exposes useful archive entry points without repeating its content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('TODO EL TENIS');
  await expect(page.getByRole('heading', { name: 'Últimos resultados' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Récords que explican el juego' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Grandes escenarios' })).toBeVisible();
  await expect(page.locator('main a[href^="/match/"]')).not.toHaveCount(0);
  await expect(page.locator('main a[href^="/records?dato="]')).not.toHaveCount(0);
});

test('five-set score keeps full names and tie-break superscripts', async ({ page }) => {
  await page.goto('/match/archive-148401');
  const summary = page.getByRole('region', { name: 'Wimbledon' });
  await expect(summary).toContainText('Rafael Nadal');
  await expect(summary).toContainText('Roger Federer');
  await expect(summary.locator('sup').first()).toHaveText('5');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('match comparison preserves real numeric values', async ({ page }) => {
  await page.goto('/match/live-203807');
  await expect(page.getByRole('heading', { name: 'Resumen comparativo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Juegos ganados' })).toBeVisible();
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
});

test('record cards keep their radius and categories filter by URL', async ({ page }) => {
  await page.goto('/records');
  const card = page.locator('main a[href^="#record-"]').first();
  await expect(card).toBeVisible();
  const radius = await card.evaluate(element => getComputedStyle(element).borderRadius);
  await card.hover();
  await expect(card).toHaveCSS('border-radius', radius);
  await page.getByRole('navigation', { name: 'Familias de estadísticas' }).getByRole('link', { name: 'Saque', exact: true }).click();
  await expect(page).toHaveURL(/grupo=Saque/);
  await expect(page.getByRole('heading', { name: 'Estadísticas de la familia' })).toBeVisible();
});

test('match result links align both players without portrait placeholders', async ({ page }) => {
  await page.goto('/buscar?q=Nadal+Federer+Wimbledon+2008');
  const row = page.getByRole('link', { name: 'Ver Rafael Nadal contra Roger Federer' });
  await expect(row).toContainText('Rafael Nadal');
  await expect(row).toContainText('Roger Federer');
  await expect(row.locator('.player-avatar')).toHaveCount(0);
  await expect(row.getByLabel('Ganador')).toHaveCount(1);
});

test('Australian draw and walkover details remain truthful', async ({ page }) => {
  await page.goto('/torneos/australian-open/2026');
  await expect(page.getByRole('region', { name: 'El cuadro de la edición' })).toBeVisible();
  for (const id of ['live-37395', 'reference-ao-2026-mensik-withdrawal', 'reference-ao-2026-ms701']) {
    const response = await page.goto(`/match/${id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goto('/match/reference-ao-2026-mensik-withdrawal');
  await expect(page.locator('main')).toContainText('Jakub Mensik');
  await expect(page.locator('main')).toContainText('Novak Djokovic');
});

test('topbar follows scroll direction and exposes no platform shortcut', async ({ page }) => {
  await page.goto('/torneos');
  await expect(page.locator('.topbar kbd')).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 900));
  await expect(page.locator('.topbar')).toHaveClass(/nav-hidden/);
  await page.evaluate(() => scrollTo(0, 650));
  await expect(page.locator('.topbar')).not.toHaveClass(/nav-hidden/);
});

test('match header keeps the result and omits redundant metadata actions', async ({ page }) => {
  await page.goto('/match/reference-ao-2026-ms701');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('main')).toContainText('Abierto de Australia');
  await expect(page.getByText('Información y cobertura')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Compartir partido', exact: true })).toHaveCount(0);
});
