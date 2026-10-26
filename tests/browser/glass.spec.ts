import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('match archive keeps cards and edition navigation with shared filters',async({page})=>{
  await page.goto('/buscar');
  await expect(page.locator('.match-scorecard')).toHaveCount(12);
  await page.getByRole('navigation',{name:'Vista de resultados'}).getByRole('link',{name:'Torneos',exact:true}).click();
  const group=page.locator('main article').filter({has:page.locator('details')}).first();
  await group.locator('summary').click();
  await expect(group.locator('.match-scorecard').first()).toBeVisible();
  await group.getByRole('link',{name:/Ver edición/}).click();
  await expect(page.locator('.td-edition')).toBeVisible();
});
test('tournament directory prioritizes the four Grand Slams and preserves categories',async({page})=>{
  await page.goto('/torneos');
  await expect(page.locator('.catalog-card h2').nth(0)).toHaveText('Abierto de Australia');
  await page.getByRole('navigation',{name:'Categorías de torneos'}).getByRole('link',{name:'ATP 250',exact:true}).click();
  await expect(page).toHaveURL(/categoria=ATP/);
  await expect(page.locator('.catalog-card').first()).toBeVisible();
});
test('player directory keeps search and sorting compact without an alphabet strip',async({page})=>{
  await page.goto('/jugadores');
  const toolbar=page.locator('.player-toolbar.archive-unified-toolbar');
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole('searchbox')).toHaveAttribute('placeholder','Nombre del jugador');
  await expect(page.getByRole('navigation',{name:'Índice alfabético'})).toHaveCount(0);
  await expect(page.locator('.player-directory-count')).toContainText('jugadores');
});
test('home slider is keyboard operable and reduced motion disables rotation',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const slider=page.locator('.archive-slider');await slider.scrollIntoViewIfNeeded();
  await expect(page.locator('video')).not.toHaveAttribute('src',/./);
  const before=await slider.locator('.slider-count').textContent();
  const next=slider.getByRole('button',{name:'Torneo siguiente',exact:true});
  await next.click();await expect(slider.locator('.slider-count')).not.toHaveText(before!);
  await next.press('ArrowLeft');await expect(slider.locator('.slider-count')).toHaveText(before!);
});
test('handoff screens fit all required widths and pass accessibility checks',async({page})=>{
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const route of ['/','/buscar','/records','/jugadores','/torneos','/comparar']){
    await page.goto(route);
    for(const width of [320,390,768,1024,1440,1920]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  }
});
