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
  await expect(page.getByRole('heading',{name:'Lo que ha cambiado hoy.'})).toBeVisible();
  await expect(page.getByText('Resultados obtenidos',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Cada día, en claro.'})).toBeVisible();
  await expect(page.getByText('Archivo WTA',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});
