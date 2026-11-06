import { expect, test } from '@playwright/test';
test('search and mobile navigation restore keyboard focus',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/info');
  const search=page.getByRole('button',{name:'Buscar en DEUCE',exact:true});
  await search.click();await expect(page.locator('#global-search')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('#global-search-results')).toHaveCount(0);await expect(search).toBeFocused();
  const menu=page.locator('[data-deuce-topbar] button[aria-controls="deuce-mobile-navigation"]');await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await page.getByRole('navigation',{name:'Principal',exact:true}).getByRole('button',{name:'Jugadores',exact:true}).focus();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();
});

test('global search coexists with directory controls and fills the topbar',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/jugadores');
  await expect(page.locator('.player-directory input[type="search"]')).toHaveCount(1);
  await page.locator('.player-directory summary').filter({hasText:'Filtros'}).click();
  await expect(page.getByRole('combobox',{name:'Ordenar'})).toBeVisible();
  await page.getByRole('button',{name:'Buscar en DEUCE',exact:true}).click();
  await expect.poll(async()=>page.locator('[data-deuce-topbar], [data-deuce-topbar] form[role="search"]').evaluateAll(nodes=>{
    const [topbar,form]=nodes.map(node=>node.getBoundingClientRect());
    return form.width>topbar.width*.72&&Math.abs(form.right-topbar.right)<12;
  })).toBe(true);
  const results=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/search'&&new URL(response.url()).searchParams.get('q')==='Nadal'&&response.ok()&&response.headers()['x-deuce-search-mode']==='compact',{timeout:15_000});
  await page.locator('#global-search').fill('Nadal');
  await results;
  await expect(page.getByRole('region',{name:'Jugadores',exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Partidos',exact:true})).toBeVisible();

  await page.setViewportSize({width:390,height:844});
  await page.goto('/buscar');
  await expect(page.locator('.deuce-search input[type="search"]')).toHaveCount(0);
  const filters=page.getByRole('button',{name:'Filtros · Filtrar partidos',exact:true});
  await expect(filters).toBeVisible();
  await filters.click();
  await expect(page.getByRole('button',{name:'Cerrar filtros',exact:true})).toBeVisible();
  await expect(page.locator('[class*="portalFilters"][data-visible]').getByLabel('Temporada')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});
