import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('a record opens the full evidence list and preserves filters',async({page})=>{
  await page.goto('/records?dato=top-10&year=2019');
  const value=await page.locator('.rv-ranking-number strong').first().innerText();
  await page.getByRole('link',{name:/Ver partidos de .* en esta clasificación/}).first().click();
  await expect(page).toHaveURL(/\/records\/evidencia\?.*year=2019/);
  await expect(page.locator('.dx-evidence-summary strong').nth(1)).toHaveText(value);
  await expect(page.getByRole('region',{name:'Lista completa de evidencia'})).toBeVisible();
  await expect(page.locator('.dx-provenance')).toContainText('Versión');
});
test('comparison preserves cohort, exposes denominator and handles unknown players',async({page})=>{
  await page.goto('/comparar');
  await page.locator('select[name=year]').selectOption('2019');
  await page.locator('select[name=surface]').selectOption('clay');
  await page.getByRole('button',{name:'Comparar jugadores'}).click();
  await expect(page).toHaveURL(/year=2019.*surface=clay/);
  await expect(page.locator('.dx-player-card')).toHaveCount(2);
  await expect(page.locator('.dx-player-card').first()).toContainText('de');
  await page.locator('input[name=a]').fill('Nobody In This Archive');
  await page.getByRole('button',{name:'Comparar jugadores'}).click();
  await expect(page.getByRole('status')).toContainText('No hay resultados');
});
for(const colorScheme of ['light','dark'] as const) test(`redesign accessibility and layout: ${colorScheme}`,async({page})=>{
  await page.emulateMedia({colorScheme});
  for(const path of ['/','/comparar','/records?dato=finales-ganadas']) {
    await page.setViewportSize({width:1440,height:1000});await page.goto(path);
    await expect(page.getByRole('heading',{level:1})).toHaveCount(1);
    const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    for(const width of [390,320]) {await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    await page.screenshot({path:test.info().outputPath(path==='/'?`home-${colorScheme}.png`:path.startsWith('/comparar')?`compare-${colorScheme}.png`:`records-${colorScheme}.png`),fullPage:true});
  }
});
