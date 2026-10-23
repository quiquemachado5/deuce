/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS QA runner. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const output = path.resolve('outputs/handoff-qa');
async function run() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext({reducedMotion:'reduce'});
  const page = await context.newPage();
  const issues = [], results = [];
  page.on('pageerror',error=>issues.push({type:'exception',url:page.url(),message:error.message}));
  page.on('console',msg=>{if(msg.type()==='error')issues.push({type:'console',url:page.url(),message:msg.text()});});
  page.on('response',response=>{if(response.status()>=400)issues.push({type:'http',url:response.url(),status:response.status()});});
  const routes = (process.env.QA_ROUTES || '/,/buscar,/records,/jugadores,/tournaments,/comparar').split(',');
  const widths = (process.env.QA_WIDTHS || '320,390,768,1024,1440,1920').split(',').map(Number);
  for(const route of routes) {
    await page.goto('http://localhost:3000'+route,{waitUntil:'networkidle',timeout:120000});
    for(const width of widths) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(async()=>{for(const image of document.images)image.loading='eager';await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));scrollTo(0,0);});
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForTimeout(150);
      const layout=await page.evaluate(()=>({
        title:document.querySelector('h1')?.textContent,
        width:innerWidth,scroll:document.documentElement.scrollWidth,
        overflow:[...document.querySelectorAll('main *')].filter(el=>{
          const r=el.getBoundingClientRect();
          if(!el.checkVisibility()||el.closest('.slider-window,.hero-media,.table-scroll,[aria-hidden="true"]'))return false;
          return r.width&&r.right>innerWidth+1;
        }).slice(0,8).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right})),
        brokenImages:[...document.images].filter(img=>img.complete&&!img.naturalWidth).map(img=>img.src),
        fonts:{body:getComputedStyle(document.body).fontFamily,heading:getComputedStyle(document.querySelector('h1')).fontFamily},
      }));
      const name=(route==='/'?'inicio':route.replace(/[/?=&]/g,'-'))+'-'+width;
      await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
      await page.screenshot({path:path.join(output,name+'-viewport.png')});
      results.push({route,width,...layout});
      console.log(JSON.stringify({route,width,scroll:layout.scroll,overflow:layout.overflow.length,images:layout.brokenImages.length}));
    }
  }
  await fs.writeFile(path.join(output,'responsive.json'),JSON.stringify({results,issues},null,2));
  await browser.close();
}
run().catch(error=>{console.error(error);process.exitCode=1;});
