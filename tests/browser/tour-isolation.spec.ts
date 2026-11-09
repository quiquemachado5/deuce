import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the tournament circuit and category selectors stay isolated and responsive', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    await page.goto('/torneos?circuito=wta');
    if(width<700) await page.getByRole('button',{name:/Filtrar torneos/}).click();
    await expect(page.getByRole('navigation',{name:'Circuito de torneos'}).getByRole('link',{name:'WTA',exact:true})).toHaveAttribute('aria-current','page');
    if(width<700) await page.getByRole('button',{name:'Cerrar filtros'}).last().click();
    await expect(page.getByLabel(/Filtrar torneos: Categoría/)).toHaveCount(0);
    for(const name of ['Grand Slams','WTA 1000','WTA 500','WTA 250']) await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
    if(width===320){
      const previewSizes=await page.locator('main div[tabindex][aria-label]').evaluateAll(nodes=>nodes.map(node=>node.querySelectorAll(':scope > a').length).filter(Boolean));
      expect(previewSizes.length).toBeGreaterThan(0);
      expect(Math.max(...previewSizes)).toBeLessThanOrEqual(10);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  }
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});

test('WTA landing routes expose their own canonical and never fall back to ATP results', async ({ page }) => {
  const routes=[
    ['/torneos?circuito=wta','/torneos?circuito=wta'],
    ['/jugadores?tour=wta','/jugadores?tour=wta'],
    ['/buscar?tour=wta','/partidos?tour=wta'],
    ['/records?tour=wta','/records?tour=wta'],
  ] as const;
  await page.setViewportSize({width:390,height:844});
  for(const [route,canonical] of routes){
    await page.goto(route);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',new RegExp(canonical.replace(/[?]/g,'\\?')+'$'));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.goto('/buscar?tour=wta');
  const wtaMatches=page.locator('main a[href^="/match/"]');
  await expect(wtaMatches.first()).toBeVisible();
  await expect(wtaMatches).not.toHaveCount(0);
  expect(await wtaMatches.evaluateAll(links=>links.every(link=>link.getAttribute('data-tour')==='wta'))).toBe(true);
});
