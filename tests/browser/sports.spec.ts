import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('home highlights rotate, pause, and summarize the archive accessibly',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Cada partido.');
  const carousel=page.getByRole('region',{name:'Historias del archivo'});
  const title=await carousel.locator('h2').textContent();
  await page.mouse.move(0,0);
  await expect(carousel.locator('h2')).not.toHaveText(title!,{timeout:18000});
  await carousel.getByRole('button',{name:'Pausar destacados'}).click();
  await expect(carousel.getByRole('button',{name:'Reanudar destacados'})).toBeVisible();
  const dots=carousel.locator('button[aria-pressed]');
  await dots.nth(0).click();await expect(dots.nth(0)).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('.ds-scorecard').count()).toBe(3);
  await page.screenshot({path:test.info().outputPath('home-desktop.png')});
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','best-practice']).analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({path:test.info().outputPath('home-mobile.png')});
});
test('tiebreaks do not change score alignment; sets have understandable controls',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(process.env.PLAYWRIGHT_BASE_URL?'/match/live-205270':'/match/archive-148401');
  await expect(page.locator('.ry-scoreboard .ds-game sup').first()).toBeVisible();
  const ratio=await page.locator('.ry-scoreboard .ds-game sup').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)/parseFloat(getComputedStyle(el.parentElement!).fontSize));
  expect(ratio).toBeLessThan(.6);
  const picker=page.getByRole('group',{name:'Seleccionar set'}).first();
  await picker.getByRole('button').nth(1).click();
  await expect(picker.getByRole('button').nth(1)).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.ds-match-story').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath('match-story-mobile.png')});
});
