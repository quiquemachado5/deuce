import { expect, test, type Page } from '@playwright/test';

async function expectInsideViewport(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

test('mobile filters use the viewport even after the page moves', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/buscar?year=2024');
  await page.getByRole('button', { name: /Filtrar partidos/ }).click();
  await page.evaluate(() => scrollTo(0, 900));
  await expect(page.locator('[class*="portalFilters"][data-visible]')).toBeVisible();
  await expectInsideViewport(page, '[class*="portalFilters"][data-visible]');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('inner page openings remain below the fixed topbar', async ({ page }) => {
  for (const path of ['/info', '/historias', '/comparar']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const topbarBottom = await page.locator('.topbar').evaluate((node) => node.getBoundingClientRect().bottom);
    const headingTop = await page.getByRole('heading', { level: 1 }).evaluate((node) => node.getBoundingClientRect().top);
    expect(headingTop, path).toBeGreaterThanOrEqual(topbarBottom - 1);
  }
});

test('records fallback and full-ranking action remain readable and compact', async ({ page }) => {
  await page.goto('/records');
  const notice = page.locator('.records-page .deuce-archive-notice');
  if (await notice.count()) {
    await expect(notice).toBeVisible();
    expect((await notice.boundingBox())!.height).toBeLessThan(120);
    await expect(notice.getByRole('link', { name: 'Cobertura y versión' })).toHaveCSS('color', 'rgb(200, 255, 50)');
  }
  await page.goto('/records?dato=mas-juegos');
  const action = page.getByRole('link', { name: /Ver clasificación completa/ });
  await expect(action).toHaveCSS('background-color', 'rgb(200, 255, 50)');
  await expect(action).toHaveCSS('color', 'rgb(8, 34, 25)');
});

test('player directory title, filters and empty WTA state are explicit', async ({ page }) => {
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/jugadores');
    const title = await page.getByRole('heading', { level: 1, name: 'Jugadores' }).boundingBox();
    const circuit = await page.getByRole('navigation', { name: 'Circuitos de jugadores' }).boundingBox();
    expect(title).not.toBeNull();
    expect(circuit).not.toBeNull();
    expect(circuit!.y).toBeGreaterThanOrEqual(title!.y + title!.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/jugadores?tour=wta');
  await expect(page.getByRole('heading', { level: 1, name: 'Jugadoras' })).toBeVisible();
  if (!(await page.locator('main a[href^="/jugadores/"]').count())) {
    await expect(page.getByRole('heading', { name: 'El archivo WTA todavía no tiene temporadas publicadas' })).toBeVisible();
  }
});

test('search shows its query and tournament rounds fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/buscar?q=Nadal');
  await expect(page.getByRole('searchbox', { name: 'Búsqueda actual' })).toHaveValue('Nadal');
  await expect(page.getByRole('link', { name: 'Borrar búsqueda' })).toBeVisible();
  await page.goto('/torneos/roland-garros/2024');
  const bracket = page.getByRole('region', { name: /Cuadro.*edición/i });
  await expect(bracket.getByRole('button', { name: /Ronda de 128/ })).toHaveAttribute('aria-pressed', 'true');
  const dimensions = await bracket.evaluate((node) => ({ width: node.clientWidth, scrollWidth: node.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
  await bracket.getByRole('button', { name: /Cuartos de final/ }).click();
  await expect(bracket.getByRole('region', { name: 'Cuartos de final', exact: true })).toBeVisible();
});

test('profile, match and footer links expose the archive context', async ({ page }) => {
  await page.goto('/jugadores/novak-djokovic');
  await expect(page.locator('a[href^="/torneos/"]').filter({ hasText: 'Roland Garros' }).first()).toBeVisible();
  await page.goto('/match/archive-148401');
  await expect(page.getByRole('heading', { name: 'Cara a cara en todo el archivo' })).toBeVisible();
  await expect(page.locator('.pm-player a[href^="/jugadores/"]')).toHaveCount(2);
  await expect(page.locator('.pm-event h1 a[href^="/torneos/"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación del pie' }).getByRole('link', { name: 'Historias' })).toBeAttached();
});

test('licence filters are labelled and the first result is reachable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/licencias');
  await expect(page.getByRole('heading', { name: 'Tipo de recurso' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Estado de derechos' })).toBeVisible();
  const firstImage = await page.locator('.ry-photo-entry').first().boundingBox();
  expect(firstImage).not.toBeNull();
  expect(firstImage!.y).toBeLessThan(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
