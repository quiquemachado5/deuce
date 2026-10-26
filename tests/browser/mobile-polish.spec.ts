import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('mobile home has SVG actions, compact records and automatic clean slides',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.locator('.round-cta svg')).toBeVisible();
 await expect(page.locator('.simple-match-foot').first().locator('svg')).toBeAttached();
 await expect(page.locator('.media-credit,.image-caption,.photo-info,.pd-photo-credit')).toHaveCount(0);
 for(const width of [320,390]){await page.setViewportSize({width,height:844});for(const card of await page.locator('.record-showcase>a').all()){const bounds=await card.boundingBox();expect(bounds!.height).toBeLessThan(290);}expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 const slider=page.locator('.archive-slider');await slider.scrollIntoViewIfNeeded();await expect(slider.locator('.slider-ui')).toBeHidden();await expect(slider.locator('.slide-copy>span')).toHaveCount(0);
 const first=await slider.locator('.archive-slide.active').getAttribute('aria-hidden');expect(first).toBe('false');
 const before=await slider.locator('.archive-slide.active h3').innerText();await expect.poll(()=>slider.locator('.archive-slide.active h3').innerText(),{timeout:8000}).not.toBe(before);
 await page.emulateMedia({reducedMotion:'reduce'});const stopped=await slider.locator('.archive-slide.active h3').innerText();await page.waitForTimeout(5500);expect(await slider.locator('.archive-slide.active h3').innerText()).toBe(stopped);
 await page.screenshot({path:info.outputPath('slider-mobile.png')});await page.locator('.record-showcase').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('records-mobile.png')});
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
test('navigation is immediate and credits remain in the dedicated directory',async({page})=>{
 await page.goto('/');await expect(page.locator('.page-orb')).toHaveCount(0);
 await page.getByRole('navigation',{name:'Principal',exact:true}).getByRole('link',{name:'Jugadores'}).click();await expect(page).toHaveURL(/\/jugadores/);await expect(page.getByRole('heading',{level:1})).toBeVisible();
 await page.goto('/jugadores/ilie-nastase');await expect(page.locator('img[src*="documented/ilie-nastase"]')).toBeAttached();await expect(page.locator('.pd-photo-credit,.photo-info')).toHaveCount(0);
 await page.goto('/credits?q=Nastase');await expect(page.locator('.ry-photo-entry')).toContainText('CC BY-SA');
});
