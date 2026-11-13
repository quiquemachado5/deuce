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
 for(const [from,to] of [['/en','/'],['/en/matches/live-216535','/match/live-216535'],['/en/players/rafael-nadal','/jugadores/rafael-nadal'],['/en/players/iga-swiatek?tour=wta','/jugadores/iga-swiatek?tour=wta'],['/en/tournaments/wimbledon/2022?tour=wta','/torneos/wimbledon/2022?cuadro=wta']]){
  const response=await request.get(from,{maxRedirects:0});expect(response.status()).toBe(308);
  const location=new URL(response.headers().location);expect(location.pathname+location.search).toBe(to);
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
 for(const label of ['Ver todos los resultados','Cerrar búsqueda']){
  const box=await page.getByRole('button',{name:label,exact:true}).boundingBox();expect(box?.width).toBeGreaterThanOrEqual(44);expect(box?.height).toBeGreaterThanOrEqual(44);
 }
});
