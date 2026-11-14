import {test,expect} from '@playwright/test';

const routes=['/','/partidos?tour=wta','/jugadores','/jugadores/rafael-nadal','/torneos','/torneos/wimbledon','/comparar?a=Roger+Federer&b=Rafael+Nadal','/records','/records?dato=victorias','/cobertura'];
for(const width of [390,1440])for(const route of routes)test(`${width}px current release: ${route}`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(route);expect(response?.status()).toBe(200);
  await expect(page.locator('main').first()).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
  const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');expect(canonical).toBeTruthy();
  const broken=await page.locator('main img').evaluateAll(images=>images.filter(i=>(i as HTMLImageElement).complete&&!(i as HTMLImageElement).naturalWidth).map(i=>i.getAttribute('src')));expect(broken).toEqual([]);
});
test('published generation, circuit isolation and cron protection',async({request})=>{
  const overview=await request.get('/api/overview');expect(overview.status()).toBe(200);const summary=await overview.json();expect(summary.matches).toBeGreaterThan(70000);
  for(const tour of ['atp','wta']){const response=await request.get(`/api/matches?tour=${tour}&limit=5`);expect(response.status()).toBe(200);const payload=await response.json();expect(payload).toBeTruthy();}
  expect((await request.get('/api/cron/refresh')).status()).toBe(401);
});
test('global search opens, finds Nadal and closes with Escape',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Buscar en DEUCE',exact:true}).click();
 const input=page.getByRole('searchbox').first();await input.fill('Nadal');await expect(page.getByText('Rafael Nadal',{exact:true}).first()).toBeVisible();await input.press('Escape');await expect(page.getByRole('button',{name:'Buscar en DEUCE',exact:true})).toBeVisible();
});

test('English URLs redirect permanently to their Spanish entity',async({request})=>{
 for(const [from,to] of [['/en','/'],['/en/robots.txt','/robots.txt'],['/en/matches/live-216535','/match/live-216535'],['/en/players/rafael-nadal','/jugadores/rafael-nadal'],['/en/players/iga-swiatek?tour=wta','/jugadores/iga-swiatek?tour=wta'],['/en/tournaments/wimbledon/2022?tour=wta','/torneos/wimbledon/2022?cuadro=wta']]){
  const response=await request.get(from,{maxRedirects:0});expect(response.status()).toBe(308);
  const location=new URL(response.headers().location,response.url());expect(location.pathname+location.search).toBe(to);
 }
});
test('Spanish SEO and totals agree with the selected generation',async({page,request})=>{
 const summary=await(await request.get('/api/overview')).json();
 expect(summary.totalMatches).toBe(summary.totalsByTour.atp+summary.totalsByTour.wta);
 expect(summary.freshness.publishedAt).toBe(summary.generatedAt);
 await page.goto('/');expect(await page.locator('link[hreflang]').count()).toBe(0);
 const dataset=await page.locator('script[type="application/ld+json"]').evaluateAll(scripts=>scripts.map(script=>JSON.parse(script.textContent||'{}')).find(data=>data['@type']==='Dataset'));
 expect(dataset.size).toBe(summary.totalMatches);expect(dataset.version).toBe(summary.datasetVersion);
 const sitemap=await(await request.get('/sitemap.xml')).text();expect(sitemap).not.toContain('/en/');expect(sitemap).not.toContain('hreflang');
 expect((await request.get('/cobertura/correcciones')).status()).toBe(200);
});
test('mobile topbar search controls have a 44px touch target',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:'Buscar en DEUCE',exact:true}).click();
 await page.getByRole('searchbox').first().fill('Nadal');
 for(const label of ['Ver todos los resultados','Borrar búsqueda']){
  const box=await page.getByRole('button',{name:label,exact:true}).boundingBox();expect(box).not.toBeNull();
  // CSS transforms can report 43.999998 for a 44px control in Chromium.
  expect(Math.round(box!.width*100)/100).toBeGreaterThanOrEqual(44);expect(Math.round(box!.height*100)/100).toBeGreaterThanOrEqual(44);
 }
});

test('winner ticks stay next to names, including five sets and long names',async({page})=>{
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/laboratorio/marcadores');
  const winners=page.locator('[data-score-player][data-winner]');expect(await winners.count()).toBeGreaterThan(5);
  for(const row of await winners.all()){
   const name=await row.locator('[data-score-name]').boundingBox(),tick=await row.locator('[data-score-winner-mark]').boundingBox();
   expect(name).not.toBeNull();expect(tick).not.toBeNull();
   expect(tick!.x-(name!.x+name!.width)).toBeGreaterThanOrEqual(0);
   expect(tick!.x-(name!.x+name!.width)).toBeLessThanOrEqual(10);
   expect(Math.abs(tick!.y+tick!.height/2-(name!.y+name!.height/2))).toBeLessThan(2);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});

test('invalid player profiles return a real 404 before streaming',async({request})=>{
 const response=await request.get('/jugadores/jugador-inexistente-auditoria');expect(response.status()).toBe(404);
 expect(await response.text()).toContain('Este enlace no está en el archivo');
});
test('strict script CSP preserves search and has a fresh nonce per response',async({page,request})=>{
 const one=await request.get('/records?dato=victorias'),two=await request.get('/records?dato=victorias');
 const policy=one.headers()['content-security-policy'];expect(policy).toBeTruthy();
 const scripts=policy.split(';').find(value=>value.trim().startsWith('script-src '))!;
 expect(scripts).toContain("'nonce-");expect(scripts).not.toContain("'unsafe-inline'");
 expect(two.headers()['content-security-policy']).not.toBe(policy);
 await page.goto('/records?dato=victorias');
 await page.getByRole('searchbox',{name:'Buscar en toda la clasificación'}).fill('Nadal');
 await page.getByRole('button',{name:'Buscar',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'resultados para'})).toContainText('Nadal');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await expect(page.locator('tbody tr')).toContainText('Rafael Nadal');
 await page.getByRole('link',{name:'Sobre los datos y el cálculo',exact:true}).click();
 await expect(page.locator('#estadistica')).toContainText('Más victorias en este archivo');
});
