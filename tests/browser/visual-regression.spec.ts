import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { name: 'phone-320', width: 320, height: 800 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

const dynamicCoverageContent = (page: Page) => [
  page.locator('.coverage-updated'),
  page.locator('.coverage-piece dd'),
  page.locator('.coverage-api-days time'),
  page.locator('.coverage-footer small'),
];

for (const viewport of viewports) {
  test(`coverage keeps the approved layout at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/cobertura');
    await expect(page.getByRole('heading', { name: /^Cobertura del archivo/ })).toBeVisible();
    await expect(page).toHaveScreenshot(`coverage-${viewport.name}.png`, {
      animations: 'disabled',
      fullPage: true,
      maxDiffPixelRatio: 0.001,
      mask: dynamicCoverageContent(page),
    });
  });
}

test('a dark operating-system preference keeps the approved light design', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cobertura');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await expect(page).toHaveScreenshot('coverage-system-dark.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.001,
    mask: dynamicCoverageContent(page),
  });
});

test('reduced motion preserves the home composition without video', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.hero-film video')).toHaveCount(0);
  await expect(page).toHaveScreenshot('home-reduced-motion.png', {
    animations: 'disabled',
    fullPage: true,
  });
});
