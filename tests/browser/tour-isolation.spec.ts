import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the single tournament selector keeps ATP and WTA categories isolated and responsive', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    await page.goto('/torneos?circuito=wta');
    const picker=page.getByLabel(/Filtrar torneos: WTA · Principales/);
    await expect(picker).toBeVisible();
    await picker.click();
    await expect(page.getByRole('group',{name:'ATP'})).toBeVisible();
    await expect(page.getByRole('group',{name:'WTA'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await expect(picker).toBeFocused();
  }
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});

test('WTA landing routes expose their own canonical and never fall back to ATP results', async ({ page }) => {
  const routes=[
    ['/torneos?circuito=wta','/torneos?circuito=wta'],
    ['/jugadores?tour=wta','/jugadores?tour=wta'],
    ['/buscar?tour=wta','/buscar?tour=wta'],
    ['/records?tour=wta','/records?tour=wta'],
  ] as const;
  await page.setViewportSize({width:390,height:844});
  for(const [route,canonical] of routes){
    await page.goto(route);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',new RegExp(canonical.replace(/[?]/g,'\\?')+'$'));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.goto('/buscar?tour=wta');
  await expect(page.locator('.match-scorecard')).toHaveCount(0);
  await expect(page.getByText(/No encontramos partidos|Sin partidos WTA/i).first()).toBeVisible();
});

