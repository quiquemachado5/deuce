import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('home exposes useful archive entry points without repeating its content',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('h1')).toContainText('TODO EL TENIS');
 await expect(page.locator('.hero video')).toHaveAttribute('poster',/tennis-hero-poster/);
 await expect(page.locator('.home-archive-tools')).toBeVisible();
 await expect(page.locator('.home-archive-tools nav a')).toHaveCount(4);
 await expect(page.locator('.floating-results-v2 > a')).toHaveCount(3);
 await expect(page.locator('.record-showcase>a')).toHaveCount(3);
 await expect(page.locator('.global-scoreboard--overlay,.photo-grid')).toHaveCount(0);
 await expect(page.locator('.archive-slide')).toHaveCount(4);
});
test('five-set score keeps full names, aligned columns and small tiebreak superscripts',async({page})=>{
 await page.goto('/match/archive-148401');
 const score=page.locator('.deuce-match-detail > .global-scoreboard');
 await expect(score.locator('.global-player')).toHaveCount(2);
 await expect(score.locator('.global-player').first().locator('.global-set')).toHaveCount(5);
 await expect(score.locator('sup').first()).toHaveCSS('font-size','10px');
 await expect(score.locator('sup').first()).toHaveText('5');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('match measurement tabs preserve the real numeric comparison',async({page})=>{
 await page.goto('/match/live-203807');
 await expect(page.getByRole('heading',{name:'El partido en cifras'})).toBeVisible();
 await page.getByRole('tab',{name:'Medidas',exact:true}).click();
 const measures=page.locator('.match-measurements');
 await expect(measures.getByRole('heading',{name:'Medidas del partido'})).toBeVisible();
 await expect(measures.locator('.measure-row').first().getByRole('cell')).toHaveCount(2);
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations).toEqual([]);
});
test('record cards retain their radius and categories filter by URL',async({page})=>{
 await page.goto('/records');const card=page.locator('.records-feature-card').first();
 const radius=await card.evaluate(el=>getComputedStyle(el).borderRadius);await card.hover();await expect(card).toHaveCSS('border-radius',radius);
 await page.getByRole('navigation',{name:'Familias de estadísticas'}).getByRole('link',{name:'Saque',exact:true}).click();
 await expect(page).toHaveURL(/grupo=Saque/);await expect(page.locator('.records-family').first()).toBeVisible();
});
test('result rows align both sides and contain no portrait placeholders',async({page})=>{
 await page.goto('/match/archive-139865?vista=alrededor');
 const row=page.locator('.simple-result').first();await expect(row).toBeVisible();
 await expect(row.locator('.global-player')).toHaveCount(2);await expect(row.locator('.player-avatar')).toHaveCount(0);
 const edges=await row.locator('.global-sets').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().right));expect(Math.abs(edges[0]-edges[1])).toBeLessThan(1);
});
test('Australian draw and walkover details remain truthful',async({page})=>{
 await page.goto('/australian-open/2026');const picker=page.getByRole('group',{name:'Elegir ronda del cuadro'});
 await expect(picker.getByRole('button',{name:/^Final/})).toContainText('1');await expect(picker.getByRole('button',{name:/^Semifinal/})).toContainText('2');
 for(const id of ['live-37395','reference-ao-2026-mensik-withdrawal','reference-ao-2026-ms701']){const response=await page.goto('/match/'+id);expect(response?.status()).toBe(200);await expect(page.locator('.deuce-match-detail')).toBeVisible();}
 await page.goto('/match/reference-ao-2026-mensik-withdrawal');const walkover=page.locator('.deuce-match-detail > .global-scoreboard');await expect(walkover.locator('.score-status')).toContainText('W/O');await expect(walkover.locator('.global-set')).toHaveCount(0);
});
test('match header keeps the result and omits redundant metadata actions',async({page})=>{
 await page.goto('/match/reference-ao-2026-ms701');
 await expect(page.locator('.deuce-match-detail > .global-scoreboard .global-player')).toHaveCount(2);
 await expect(page.locator('.deuce-match-detail>h1')).toHaveClass(/nc-sr/);
 await expect(page.getByText('Fecha del partido')).toHaveCount(0);
 await expect(page.getByText('Información y cobertura')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Compartir partido',exact:true})).toHaveCount(0);
});
