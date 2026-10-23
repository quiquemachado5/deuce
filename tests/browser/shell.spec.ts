import { expect, test } from '@playwright/test';
test('search and mobile navigation restore keyboard focus',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/info');
  const search=page.getByRole('button',{name:'Buscar en DEUCE',exact:true});
  await search.click();await expect(page.locator('#global-search')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('.search-modal')).not.toBeVisible();await expect(search).toBeFocused();
  const menu=page.locator('.menu');await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await page.getByRole('navigation',{name:'Principal',exact:true}).getByRole('link',{name:'Jugadores',exact:true}).focus();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();
});
