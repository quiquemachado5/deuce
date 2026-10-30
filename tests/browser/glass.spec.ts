import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('match archive keeps cards and edition navigation with shared filters',async({page})=>{
  await page.goto('/buscar?year=2024');
  await expect(page.locator('main a[href^="/match/"]').first()).toBeVisible();
  await page.getByRole('navigation',{name:'Principal'}).getByRole('link',{name:'Torneos',exact:true}).click();
  await page.locator('main a[href^="/torneos/roland-garros?"]').first().click();
  await expect(page.getByRole('heading',{level:1,name:/Roland Garros/})).toBeVisible();
});
test('tournament directory prioritizes the four Grand Slams and preserves categories',async({page})=>{
  await page.goto('/torneos');
  for(const slug of ['australian-open','roland-garros','wimbledon','us-open']){
    await expect(page.locator(`main a[href^="/torneos/${slug}?"]`).first()).toBeVisible();
  }
  await page.locator('summary[aria-label^="Filtrar torneos:"]').click();
  await page.getByRole('link',{name:'ATP 250',exact:true}).click();
  await expect(page).toHaveURL(/circuito=atp.*categoria=ATP(?:\+|%20)250/);
  await expect(page.locator('main a[href*="cuadro=atp"]').first()).toBeVisible();
});
test('edition presents the final, draw and data readings without a legacy media block',async({page})=>{
  await page.goto('/torneos/roland-garros/2024');
  await expect(page.getByRole('heading',{name:'La final',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'El cuadro de la edición',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Lecturas de la edición',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Ver todos los partidos/})).toBeVisible();
  await expect(page.locator('.tournament-edition-media')).toHaveCount(0);
});
test('player directory stays compact without duplicate local search controls',async({page})=>{
  await page.goto('/jugadores');
  await expect(page.getByRole('navigation',{name:'Circuitos de jugadores'})).toBeVisible();
  await expect(page.locator('main a[href^="/jugadores/"]').first()).toBeVisible();
  await expect(page.locator('main').getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Índice alfabético'})).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Páginas de resultados'})).toBeVisible();
});
test('home respects reduced motion and its latest results remain keyboard operable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await expect(page.getByRole('heading',{name:'Últimos resultados',exact:true})).toBeVisible();
  const firstMatch=page.locator('main a[href^="/match/"]').first();
  await expect(firstMatch).toBeVisible();
  await firstMatch.focus();
  await expect(firstMatch).toBeFocused();
  const video=page.locator('main video').first();
  if(await video.count()) await expect(video).toHaveJSProperty('paused',true);
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
    const result=await new AxeBuilder({page}).exclude('iframe[src*="youtube"]')
      .withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  }
});
