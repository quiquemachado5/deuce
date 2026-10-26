import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('compound searches keep player, year, final and format constraints',async({page,request})=>{
  const response=await request.get('/api/search?q=Nadal%20Federer%20Wimbledon%202008');
  expect(response.ok()).toBeTruthy();
  const data=await response.json();
  expect(data.items.some((item:{group:string;name:string})=>item.group==='Partidos'&&item.name.includes('Rafael Nadal')&&item.name.includes('Roger Federer'))).toBeTruthy();
  await page.goto('/buscar?q=finales+a+cinco+sets+Wimbledon+2008');
  await expect(page.locator('main')).toContainText('Interpretamos: Cinco sets · Final · 2008');
  await expect(page.locator('main .global-scoreboard').first()).toContainText('Roger Federer');
  await expect(page.locator('main .global-scoreboard').first()).toContainText('Rafael Nadal');
  await page.keyboard.press('Control+k');
  await page.locator('#global-search').fill('Alcaraz');
  await expect(page.locator('.deuce-search-results').getByRole('heading',{name:'Jugadores'})).toBeVisible();
  await page.keyboard.press('Escape');
});

test('return from a match restores the filtered list and its scroll position',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/buscar?q=Alcaraz&surface=hard&limit=24');
  const card=page.locator('main .global-scoreboard').nth(6);
  await card.scrollIntoViewIfNeeded();
  const position=await page.evaluate(()=>scrollY);
  await card.click();await expect(page).toHaveURL(/\/match\//);
  await page.getByRole('link',{name:'Volver a los partidos'}).click();
  await expect(page).toHaveURL(/q=Alcaraz&surface=hard&limit=24/);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(Math.max(0,position-200));
});

test('record detail explains coverage and the index stays focused on discovery',async({page})=>{
  await page.goto('/records?dato=top-10');
  await expect(page.locator('main')).toContainText('Mínimo por entrada:');
  await expect(page.locator('main')).toContainText('Cálculo actualizado');
  await page.goto('/records');
  await expect(page.getByRole('heading',{name:'En primer plano'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Familias de estadísticas'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Cambios publicados'})).toHaveCount(0);
});

test('shared career comparison and evidence use the same period',async({page})=>{
  await page.goto('/comparar?period=shared');
  await expect(page.getByLabel('Periodo de comparación')).toHaveValue('shared');
  await expect(page.locator('.dx-comparison-context')).toContainText('Periodo compartido documentado');
  const evidence=page.locator('a.dx-sample-all').first();
  expect(await evidence.getAttribute('href')).toMatch(/fromYear=\d+&toYear=\d+/);
  await evidence.click();await expect(page.locator('[aria-label="Filtros activos"]')).toContainText('Desde');
});

test('404 search, editorial stories and metadata review work at narrow and wide widths',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/no-existe-auditoria');
  await page.getByLabel('Buscar en el archivo').fill('Wimbledon');
  await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await expect(page).toHaveURL(/\/buscar\?q=Wimbledon/);
  for(const route of ['/historias','/cobertura','/no-existe-auditoria']){
    await page.goto(route);
    for(const width of [320,390,834,1440]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    }
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:testInfo.outputPath(route.slice(1)+'.png'),fullPage:true});
  }
  await page.goto('/players/roger-federer');
  await expect(page.locator('.ry-photo-player img').first()).toBeVisible();
  expect(errors).toEqual([]);
});
