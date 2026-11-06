import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('match navigation keeps its archive origin without rendering a personal archive', async ({ page }) => {
  await page.goto('/buscar?tour=atp');
  const match = page.locator('a[href^="/match/"]').first();
  await expect(match).toBeVisible();
  await match.click();
  await expect(page).toHaveURL(/\/match\//);
  expect(await page.evaluate(() => sessionStorage.getItem('deuce:archive-origin'))).toBe('/buscar?tour=atp');
  await expect(page.locator('#tu-archivo')).toHaveCount(0);
});

test('about, correction and privacy information is public and readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sobre');
  await expect(page.getByRole('heading', { name: 'Sobre DEUCE', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Correcciones' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Privacidad' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Proponer una corrección en GitHub/ })).toHaveAttribute('href', /github\.com\/quiquemachado5\/deuce\/issues\/new/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
});

test('home stays focused and coverage explains its public quality policy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Historias del archivo' })).toHaveCount(0);
  await page.goto('/cobertura');
  await expect(page.getByRole('heading', { name: 'Un archivo publicado con criterio.' })).toBeVisible();
  await expect(page.getByText('Solo datos verificables')).toBeVisible();
  await expect(page.getByText('Resultados incompletos confirmados')).toHaveCount(0);
});
