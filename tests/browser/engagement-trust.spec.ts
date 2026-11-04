import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('a visitor can keep a private archive without an account', async ({ page }) => {
  await page.goto('/match/archive-148401');
  const library = page.getByRole('region', { name: 'Tu archivo' });
  await expect(library).toBeVisible();
  await expect(library.getByRole('heading', { name: 'Vistos recientemente' })).toBeVisible();
  const save = library.locator('button[aria-pressed]');
  await expect(save).toHaveAccessibleName('Guardar esta página');
  await save.click();
  await expect(save).toHaveAccessibleName('Guardado');
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Tu archivo' }).locator('button[aria-pressed="true"]')).toHaveAccessibleName('Guardado');
  expect(await page.evaluate(() => localStorage.getItem('deuce:personal-archive:v1'))).toContain('/match/archive-148401');
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Tu archivo' })).toHaveCount(0);
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

test('home stays focused and coverage explains incident counts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Historias del archivo' })).toHaveCount(0);
  await page.goto('/cobertura');
  await expect(page.getByText(/no un error 404 de la web/i)).toBeVisible();
  await expect(page.getByText('Resultados incompletos confirmados')).toBeVisible();
});
