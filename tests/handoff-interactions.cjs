/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS QA runner. */
const {chromium,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const fs=require('node:fs/promises');
const path=require('node:path');
const output=path.resolve('outputs/handoff-qa');
async function run(){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage(),checks=[],errors=[],accessibility=[];
 page.on('pageerror',error=>errors.push(error.message));
 const go=async(route)=>{const response=await page.goto('http://localhost:3000'+route,{waitUntil:'networkidle',timeout:120000});expect(response.status()).toBe(200);};
 await go('/');
 const featured=await page.locator('.global-scoreboard--overlay').getAttribute('href');
 expect(await page.locator('video').getAttribute('src')).toBeNull();
 checks.push('Reduced motion: poster only, no video download');
 await page.keyboard.press('Tab');
 await expect(page.locator('.skip-link')).toBeFocused();
 await page.keyboard.press('Control+k');
 await expect(page.locator('#global-search')).toBeFocused();
 await page.locator('#global-search').fill('Alcaraz');
 await expect(page.locator('.deuce-search-results')).toContainText('Carlos Alcaraz',{timeout:30000});
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Buscar en DEUCE'})).toBeFocused();
 checks.push('Cmd/Ctrl+K, API search, Escape and restored keyboard focus');
 await page.getByRole('button',{name:'Menú',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'Principal'})).toBeVisible();
 await page.getByRole('navigation',{name:'Principal'}).getByRole('link',{name:'Partidos',exact:true}).click();
 await expect(page).toHaveURL(/\/buscar/);
 await expect(page.getByRole('button',{name:'Menú',exact:true})).toHaveAttribute('aria-expanded','false');
 await page.locator('#match-search').fill('Alcaraz');
 await page.locator('#match-search').press('Enter');
 await expect(page).toHaveURL(/q=Alcaraz/);
 await expect(page.locator('.match-archive-grid')).toContainText('Carlos Alcaraz',{timeout:30000});
 await page.getByLabel('Superficie',{exact:true}).first().click();
 await page.getByRole('button',{name:'Tierra',exact:true}).click();
 await expect(page).toHaveURL(/surface=clay/);
 await expect(page.getByRole('button',{name:'Quitar filtro Tierra'})).toBeVisible();
 await page.reload({waitUntil:'networkidle'});
 await expect(page.getByRole('button',{name:'Quitar filtro Tierra'})).toBeVisible();
 checks.push('Mobile menu, real player search, immediate surface filter and shared URL reload');
 await go('/buscar?fiveSets=true');
 await expect(page.locator('.global-player').first().locator('.global-set')).toHaveCount(5);
 await go('/records');
 await page.getByText('Superficie',{exact:true}).first().click();
 await page.getByRole('button',{name:'Hierba',exact:true}).click();
 await expect(page).toHaveURL(/surface=grass/);
 await expect(page.locator('.catalog-card').first()).toBeVisible({timeout:30000});
 checks.push('Five-set scores and real record recalculation by surface');
 await go('/');
 const slider=page.locator('.archive-slider');
 await slider.scrollIntoViewIfNeeded();
 const before=await slider.locator('.slider-count').textContent();
 await slider.getByRole('button',{name:'Torneo siguiente',exact:true}).click();
 expect(await slider.locator('.slider-count').textContent()).not.toBe(before);
 await slider.getByRole('button',{name:'Torneo siguiente',exact:true}).press('ArrowLeft');
 expect(await slider.locator('.slider-count').textContent()).toBe(before);
 await page.waitForTimeout(5400);
 expect(await slider.locator('.slider-count').textContent()).toBe(before);
 checks.push('Slider next/previous, keyboard and stopped automatic motion');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>scrollTo(0,0));
 await page.waitForFunction(()=>document.querySelector('video').readyState>=2,{},{timeout:30000});
 expect(await page.locator('video').evaluate(v=>v.muted)).toBe(true);
 await page.locator('.hero .round-cta').click();
 await expect(page.locator('.page-orb')).toHaveClass(/cover/);
 await expect(page).toHaveURL(/\/buscar/,{timeout:30000});
 await expect(page.locator('.page-orb')).toHaveClass(/reveal/,{timeout:30000});
 checks.push('Local silent video and circular route transition');
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const route of ['/', '/buscar','/records','/jugadores','/tournaments','/comparar',featured,'/players/novak-djokovic','/torneos/wimbledon','/wimbledon/2025']){
   await go(route);
   const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).disableRules(['color-contrast']).analyze();
   accessibility.push({route,violations:audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});
   const slug=route.replace(/[/?=&]/g,'-')||'inicio';
   if(!['/','/buscar','/records','/jugadores','/tournaments','/comparar'].includes(route)){
     for(const width of [320,390,768,1024,1440,1920]){
       await page.setViewportSize({width,height:900});
       await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
       const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);
       expect(scroll,route+' '+width).toBeLessThanOrEqual(width);
       await page.screenshot({path:path.join(output,slug+'-'+width+'.png'),fullPage:true});
     }
   }
   console.log(JSON.stringify({route,violations:accessibility.at(-1).violations}));
 }
 await fs.writeFile(path.join(output,'interactions.json'),JSON.stringify({checks,errors,accessibility},null,2));
 await browser.close();
 expect(errors).toEqual([]);
 expect(accessibility.flatMap(result=>result.violations)).toEqual([]);
}
run().catch(error=>{console.error(error);process.exitCode=1;});
