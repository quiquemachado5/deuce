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

test('global search covers ATP and WTA from every section',async({page,request})=>{
  for(const query of ['Djokovic','Sabalenka']){
    const response=await request.get(`/api/search?tour=all&q=${query}`);
    expect(response.ok()).toBe(true);
    expect((await response.json()).items.length).toBeGreaterThan(0);
  }
  await page.goto('/info');
  await page.getByRole('button',{name:'Buscar en DEUCE'}).click();
  await expect(page.locator('#global-search')).toBeFocused();
  await page.locator('#global-search').fill('Sabalenka');
  await page.getByRole('button',{name:'Ver todos los resultados'}).click();
  await expect(page).toHaveURL(/\/buscar\?q=Sabalenka&tour=all$/);
  await expect(page.getByText('Resultados publicados de ATP y WTA. Elige un circuito para continuar solo en su archivo.')).toBeVisible();
  await expect(page.getByRole('link',{name:/Aryna Sabalenka/}).first()).toBeVisible();

  await page.goto('/buscar');
  await page.getByRole('button',{name:'Buscar en DEUCE'}).click();
  await expect(page.locator('#global-search')).toBeFocused();
  await page.locator('#global-search').fill('Swiatek');
  await expect(page.locator('[data-search-result][href*="iga-swiatek"]')).toHaveAttribute('href','/jugadores/iga-swiatek?tour=wta');
});

test('archive filters never inherit an invisible latest season',async({page})=>{
  await page.goto('/buscar');
  await expect(page.getByRole('link',{name:/Quitar filtro Temporada/})).toHaveCount(0);
  await page.getByRole('button',{name:/Filtrar partidos/}).click();
  await expect(page.getByLabel('Temporada')).toHaveValue('all');
  await page.getByRole('button',{name:'Cerrar filtros'}).click();
  await page.goto('/buscar?surface=clay');
  await expect(page.getByRole('link',{name:/Quitar filtro Temporada/})).toHaveCount(0);
  await page.getByRole('button',{name:/Filtrar partidos/}).click();
  await expect(page.getByLabel('Temporada')).toHaveValue('all');
});

test('WTA comparator persists its circuit and never defaults to ATP champions',async({page})=>{
  await page.goto('/comparar?tour=wta&year=1900');
  await expect(page.locator('input[name="tour"]')).toHaveValue('wta');
  await expect(page.locator('select[name="year"]')).toHaveValue('all');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',/tour=wta/);
  await expect(page.getByRole('combobox',{name:'Jugadora 1'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Jugadora 2'})).toBeVisible();
  const names=await page.locator('input[name="a"],input[name="b"]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLInputElement).value));
  expect(names).not.toContain('Novak Djokovic');expect(names).not.toContain('Rafael Nadal');
  expect(await page.locator('main').innerText()).not.toContain('Novak Djokovic');
  await expect(page.locator('#comparison').getByRole('link').first()).toHaveAttribute('href',/tour=wta/);
});

test('WTA match comparison opens with two published WTA matches',async({page})=>{
  await page.goto('/compare?tour=wta');
  await expect(page.getByRole('heading',{name:'Comparar partidos',level:1})).toBeVisible();
  await expect(page.getByRole('heading',{name:'No se pudo abrir la comparación.'})).toHaveCount(0);
  const matches=page.locator('.ry-compare-identity');
  await expect(matches).toHaveCount(2);
  const categories=await matches.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-event-category')));
  expect(categories.every(category=>category==='Grand Slam'||/^WTA (1000|500|250)$/.test(category||''))).toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',/\/compare\?tour=wta$/);
});

test('WTA directory, tournament leaders and quick record suggestions retain WTA context',async({page,request})=>{
  await page.goto('/jugadores?tour=wta&tipo=enfrentamientos');
  await expect(page).toHaveURL(/\/comparar\?tour=wta$/);
  await page.goto('/torneos/roland-garros?cuadro=wta');
  await expect(page.getByRole('heading',{name:'Campeonas en la muestra publicada'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Campeonas de la historia'})).toHaveCount(0);
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
  await expect(page.getByRole('heading',{name:'Actividad diaria'})).toBeVisible();
  await expect(page.locator('.coverage-hero-stats dt').filter({hasText:/^Partidos ATP$/})).toBeVisible();
  await expect(page.locator('.coverage-hero-stats dt').filter({hasText:/^Partidos WTA$/})).toBeVisible();
  await expect(page.getByText(/^Hasta /)).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});

test('the WTA entry opens the integrated match archive and keeps its circuit across sections',async({page})=>{
  await page.goto('/wta');
  await expect(page).toHaveURL(/\/buscar\?tour=wta$/);
  const primary=page.getByRole('navigation',{name:'Principal',exact:true});
  await expect(primary.getByRole('button',{name:'Partidos',exact:true})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Circuito de partidos'}).getByRole('link',{name:'WTA',exact:true})).toHaveAttribute('aria-current','page');

  await page.goto('/torneos?circuito=wta');
  await expect(page).toHaveURL(/\/torneos\?circuito=wta$/);
  await expect(page.getByRole('navigation',{name:'Circuito de torneos'}).getByRole('link',{name:'WTA',exact:true})).toHaveAttribute('aria-current','page');

  await page.goto('/jugadores?tour=wta');
  await expect(page).toHaveURL(/\/jugadores\?tour=wta$/);
  await expect(page.getByRole('navigation',{name:'Circuito de jugadoras'}).getByRole('link',{name:'WTA',exact:true})).toHaveAttribute('aria-current','page');

  await page.goto('/comparar?tour=wta');
  await expect(page).toHaveURL(/\/comparar\?tour=wta$/);
  await expect(page.getByRole('navigation',{name:'Circuito del comparador'}).getByRole('link',{name:'WTA',exact:true})).toHaveAttribute('aria-current','page');

  await page.getByRole('button',{name:'Buscar en DEUCE'}).click();
  await page.getByRole('search').getByRole('searchbox').fill('Swiatek');
  await page.getByRole('button',{name:'Ver todos los resultados'}).click();
  await expect(page).toHaveURL(/\/buscar\?q=Swiatek&tour=all$/);
});

test('match circuit is compact and organization lives inside filters',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/buscar?tour=wta');
  await expect(page.getByRole('navigation',{name:'Circuito de partidos'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Organización de los partidos'})).toHaveCount(0);
  await page.getByRole('button',{name:/Filtrar partidos/}).click();
  const organization=page.getByRole('combobox',{name:'Organizar por'});
  await expect(organization).toBeVisible();
  await organization.selectOption('torneos');
  await expect(page).toHaveURL(/vista=torneos/);
});
