import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('circuit-specific suggestions cannot leak the opposite circuit',async({request})=>{
  for(const [tour,foreign] of [['wta','Djokovic'],['atp','Swiatek']] as const){
    const players=await request.get(`/api/players?tour=${tour}&q=${foreign}`);
    expect(players.ok()).toBe(true);expect((await players.json()).items).toEqual([]);
    const search=await request.get(`/api/search?tour=${tour}&q=${foreign}`);
    expect(search.ok()).toBe(true);expect((await search.json()).items).toEqual([]);
  }
});

test('WTA comparator persists its circuit and never defaults to ATP champions',async({page})=>{
  await page.goto('/comparar?tour=wta');
  await expect(page.locator('input[name="tour"]')).toHaveValue('wta');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',/tour=wta/);
  const names=await page.locator('input[name="a"],input[name="b"]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLInputElement).value));
  expect(names).not.toContain('Novak Djokovic');expect(names).not.toContain('Rafael Nadal');
  expect(await page.locator('main').innerText()).not.toContain('Novak Djokovic');
});

test('coverage distinguishes operational clocks and remains accessible on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/cobertura');
  await expect(page.getByRole('heading',{name:'Qué se obtiene cada día.'})).toBeVisible();
  await expect(page.locator('.coverage-hero-stats dt').filter({hasText:/^Partidos ATP$/})).toBeVisible();
  await expect(page.locator('.coverage-hero-stats dt').filter({hasText:/^Partidos WTA$/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});

test('the retired WTA page opens the integrated WTA match archive',async({page})=>{
  await page.goto('/wta');
  await expect(page).toHaveURL(/\/buscar\?tour=wta$/);
  await expect(page.getByRole('navigation',{name:'Filtros activos'}).getByRole('link',{name:'Quitar filtro WTA'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Principal'}).getByRole('link',{name:'WTA',exact:true})).toHaveCount(0);
});
