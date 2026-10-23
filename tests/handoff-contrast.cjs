/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS QA runner. */
const {chromium}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();
 const report=[];
 for(const route of ['/','/buscar','/records','/jugadores','/tournaments','/comparar']){
  await page.goto('http://localhost:3000'+route,{waitUntil:'networkidle',timeout:120000});
  const result=await new AxeBuilder({page}).withRules(['color-contrast']).analyze();
  report.push({route,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
  console.log(JSON.stringify(report.at(-1)));
 }
 await fs.writeFile('outputs/handoff-qa/contrast.json',JSON.stringify(report,null,2));
 await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
