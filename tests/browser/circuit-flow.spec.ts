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
  await expect(page.locator('#comparison').getByRole('link').first()).toHaveAttribute('href',/tour=wta/);
});

test('WTA directory, tournament leaders and quick record suggestions retain WTA context',async({page,request})=>{
  await page.goto('/jugadores?tour=wta&tipo=enfrentamientos');
  await expect(page).toHaveURL(/\/comparar\?tour=wta$/);
  await page.goto('/torneos/roland-garros?cuadro=wta');
  const effectiveness=page.locator('section').filter({has:page.getByRole('heading',{name:'Efectividad en este torneo'})});
  await expect(effectiveness.getByRole('link').first()).toHaveAttribute('href',/tour=wta/);
  const response=await request.get('/api/search?mode=quick&tour=wta&q=victorias');
  expect(response.ok()).toBe(true);
  const records=(await response.json()).items.filter((item:{group:string})=>item.group==='Récords');
  expect(records.length).toBeGreaterThan(0);
  expect(records.every((item:{href:string})=>new URL(item.href,'https://deuce.test').searchParams.get('tour')==='wta')).toBe(true);
});

test('coverage distinguishes operational clocks and remains accessible on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/cobertura');
  await expect(page.getByRole('heading',{name:'Qué se obtiene cada día.'})).toBeVisible();
  await expect(page.locator('.coverage-hero-stats dt').filter({hasText:/^Partidos ATP$/})).toBeVisible();
  await expect(page.locator('.coverage-hero-stats dt').filter({hasText:/^Partidos WTA$/})).toBeVisible();
  await expect(page.locator('.coverage-hero-stats').getByText(/^Hasta /)).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});

test('the WTA entry opens the integrated WTA match archive and stays active',async({page})=>{
  await page.goto('/wta');
  await expect(page).toHaveURL(/\/buscar\?tour=wta$/);
  await expect(page.getByRole('navigation',{name:'Filtros activos'}).getByRole('link',{name:'Quitar filtro WTA'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Principal'}).getByRole('link',{name:'WTA',exact:true})).toHaveAttribute('aria-current','page');
});
