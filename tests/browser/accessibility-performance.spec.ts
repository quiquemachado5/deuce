import { expect, test } from '@playwright/test';

test('global search traps focus and returns it on close',async({page})=>{
  await page.goto('/');
  const trigger=page.getByRole('button',{name:'Buscar en DEUCE'});
  await trigger.focus();await page.keyboard.press('Enter');
  const field=page.getByRole('searchbox',{name:'Buscar jugadores, partidos o torneos'});
  await expect(field).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(()=>Boolean(document.activeElement?.closest('form[role="search"],#global-search-results')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('mobile menu traps focus and returns it on Escape',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  const menu=page.getByRole('button',{name:'Abrir menú'});await menu.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation',{name:'Principal'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(menu).toBeFocused();
});

test('200 percent reflow keeps the main landmarks usable',async({page})=>{
  // A 320 CSS-pixel viewport represents a 640px window viewed at 200%.
  await page.setViewportSize({width:320,height:900});await page.goto('/cobertura');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('reduced motion does not download or play the hero film',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await expect(page.locator('.hero-film video')).toHaveCount(0);
});

test('home LCP stays inside the regression budget',async({page})=>{
  await page.addInitScript(()=>{
    (window as typeof window&{__deuceLcp?:number}).__deuceLcp=0;
    new PerformanceObserver(list=>{for(const entry of list.getEntries())(window as typeof window&{__deuceLcp?:number}).__deuceLcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
  });
  await page.goto('/');await page.waitForTimeout(2500);
  const lcp=await page.evaluate(()=>(window as typeof window&{__deuceLcp?:number}).__deuceLcp||0);
  expect(lcp).toBeGreaterThan(0);expect(lcp).toBeLessThan(4_000);
});
