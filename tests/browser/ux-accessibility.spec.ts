import { expect, test } from '@playwright/test';

test.use({ bypassCSP: true });

test('mobile match filters are a trapped modal and restore focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/buscar');
  const trigger = page.getByRole('button', { name: /Filtrar partidos/ });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Filtrar partidos' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByRole('button', { name: 'Cerrar filtros' })).toBeFocused();
  expect(await dialog.evaluate((node) => [...document.body.children]
    .filter((child) => child !== node && !child.contains(node))
    .every((child) => (child as HTMLElement).inert))).toBe(true);

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByLabel('Ronda')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('desktop match filters close without stealing focus from the outside control', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/buscar');
  const trigger = page.getByRole('button', { name: /Filtrar partidos/ });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  const outsideControl = page.getByRole('button', { name: 'Buscar en DEUCE', exact: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('[data-deuce-topbar]')).not.toHaveAttribute('data-hidden', 'true');
  await expect(outsideControl).toBeInViewport();
  await outsideControl.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByLabel('Buscar jugadores, partidos o torneos')).toBeFocused();
});

test('comparison defaults to two players, rejects identical pairs and uses semantic metrics', async ({ page }) => {
  await page.goto('/comparar?a=Nadal');
  await expect(page.getByLabel('Jugador 1', { exact: true })).toHaveValue('Rafael Nadal');
  await expect(page.getByLabel('Jugador 2', { exact: true })).toHaveValue('Novak Djokovic');
  await expect(page.getByRole('table').first()).toBeVisible();

  await page.goto('/comparar?a=Rafael%20Nadal&b=Rafael%20Nadal');
  await expect(page.getByText(/dos jugadores distintos/i)).toBeVisible();
  await expect(page.locator('#comparison')).toHaveCount(0);
});

test('mobile directory openings, profile facts and pagination stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/jugadores', '/torneos']) {
    await page.goto(path);
    const topbarBottom = await page.locator('header[data-deuce-topbar]:visible').last().evaluate((node) => node.getBoundingClientRect().bottom);
    const headingTop = await page.getByRole('heading', { level: 1 }).evaluate((node) => node.getBoundingClientRect().top);
    expect(headingTop, path).toBeGreaterThanOrEqual(topbarBottom - 1);
  }

  await page.goto('/jugadores/novak-djokovic');
  for (const label of ['Actividad en DEUCE', 'Mano', 'Circuito']) await expect(page.locator('.pp-hero-facts').getByText(label, { exact: true })).toBeVisible();
  await expect(page.locator('.pp-chart-x-axis')).toBeVisible();

  await page.goto('/jugadores?orden=wins');
  await page.getByRole('button', { name: 'Filtrar jugadores' }).click();
  await expect(page.getByLabel('Ordenar directorio')).toHaveValue('wins');
  await page.getByRole('link', { name: 'Limpiar' }).click();
  await page.getByRole('button', { name: 'Filtrar jugadores' }).click();
  await expect(page.getByLabel('Ordenar directorio')).toHaveValue('relevance');

  await page.goto('/jugadores?page=2');
  await expect(page.getByRole('link', { name: 'Ir a la primera página' })).toBeVisible();
  const pageStatus = page.locator('.nc-pagination-mobile-status');
  await expect(pageStatus).toBeVisible();
  await expect(pageStatus).toHaveAttribute('aria-current', 'page');
  await expect(pageStatus.locator('.nc-sr')).toHaveText(/^Página 2 de \d+$/);
});

test('record discovery links reach stable detail states and explain their data', async ({ page }) => {
  await page.goto('/records');
  const backgroundVideo = page.locator('iframe[title*="Isner"]');
  await expect(backgroundVideo).toHaveAttribute('aria-hidden', 'true');
  await expect(backgroundVideo).toHaveAttribute('tabindex', '-1');
  const surface = page.locator('.records-surface-gallery a').first();
  await expect(surface).toHaveAttribute('href', /\/records\?.*dato=/);
  await surface.click();
  await expect(page).toHaveURL(/\/records\?.*dato=/);
  const methodLink = page.getByRole('link', { name: 'Sobre los datos y el cálculo' });
  await expect(methodLink).toHaveAttribute('href', /\/cobertura\?dato=.*#estadistica/);
  await expect(methodLink).toHaveCSS('color', 'rgb(200, 255, 50)');

  await page.goto('/records?tour=wta');
  const unavailable = page.getByRole('heading', { name: 'El archivo WTA todavía no tiene temporadas publicadas' });
  if (await unavailable.count()) {
    await expect(unavailable).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver récords ATP' })).toHaveAttribute('href', '/records');
    await expect(page.getByRole('link', { name: 'Consultar cobertura' })).toBeVisible();
  }
});
