import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("home shows a recent tournament, photography and verified discoveries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const hero = page.locator(".ds-hero-record");
  await expect(hero.getByRole("heading", { level: 2 })).not.toBeEmpty();
  await expect(hero.locator(".ds-hero-champion")).toContainText(/Campeón|Ganador del último partido/);
  await expect(
    hero.getByRole("link", { name: "Ver el partido", exact: true }),
  ).toHaveAttribute("href", /\/match\//);
  await expect(hero.locator(".ds-hero-court img")).toBeVisible();
  await expect(page.locator(".ds-results-list .nc-match-row")).toHaveCount(5);
  const discoveries = page.getByRole("region", {
    name: "Siempre hay otro dato.",
  });
  await expect(discoveries.locator(".ds-story")).toHaveCount(6);
  const featuredName = await discoveries.locator(".ds-discovery-copy h3").innerText();
  await expect(discoveries.locator(".ds-story").filter({ hasText: featuredName })).toHaveCount(0);
  const initial = await discoveries
    .locator(".ds-discovery-copy")
    .getAttribute("data-discovery-id");
  await discoveries.getByRole("button", { name: "Otro dato" }).click();
  await expect(discoveries.locator(".ds-discovery-copy")).not.toHaveAttribute(
    "data-discovery-id",
    initial!,
  );
  await expect(discoveries.locator(".ds-discovery-copy>a")).toHaveAttribute(
    "href",
    /\/records\?dato=/,
  );
  await page.screenshot({ path: test.info().outputPath("home-desktop.png") });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("home-mobile.png") });
});
test("five-set score stays readable without duplicate photos or an invented sequence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/match/archive-148401");
  await expect(
    page.locator(".match-setboard .set-scoreboard table caption"),
  ).toContainText("6–7(5), 6–7(8)");
  await expect(
    page.locator(".match-setboard .set-scoreboard table thead th"),
  ).toHaveCount(7);
  await expect(page.locator(".match-hero-scene img")).toBeVisible();
  await expect(page.locator(".match-setboard img")).toHaveCount(0);
  await expect(page.locator(".set-scoreboard table sup")).toHaveCount(0);
  await expect(page.locator(".set-tie").first()).toHaveText("(5)");
  await expect(page.locator(".ds-set-picker")).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator(".set-tie").first()).toBeVisible();
  expect(
    await page
      .locator(".set-tie")
      .first()
      .evaluate((el) => getComputedStyle(el).verticalAlign),
  ).toBe("baseline");
});
test("match measures compare actual values without a redundant replay or filled winning sets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/match/live-203807");
  await expect(page.getByRole("heading", { name: "El partido en cifras" })).toBeVisible();
  await expect(page.getByText("Así se decidió", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Roto", { exact: true })).toHaveCount(0);
  for (const cell of await page.locator('.set-scoreboard [data-set-won="true"]').all()) {
    await expect(cell).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
  await page.getByRole("tab", { name: "Medidas", exact: true }).click();
  const measures = page.locator(".match-measurements");
  await expect(measures.getByRole("heading", { name: "Medidas del partido" })).toBeVisible();
  await expect(measures.locator(".measure-row").first()).toBeVisible();
  await expect(measures.locator(".measure-row").first().getByRole("cell")).toHaveCount(2);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]).analyze();
  expect(audit.violations).toEqual([]);
});
test("records have straight separators, rounded hover and a visible family navigation", async ({ page }) => {
  await page.goto("/records");
  await expect(page.locator(".rv-family-nav")).toHaveCSS("position", "sticky");
  await expect(page.locator(".rv-family-nav [aria-current=location]")).toHaveCount(1);
  await expect(page.locator(".ry-header")).toHaveCSS("backdrop-filter", "none");
  const row = page.locator(".rv-catalogue-row").first();
  await expect(row).toHaveCSS("border-bottom-left-radius", "0px");
  await row.hover();
  await expect(row).toHaveCSS("border-top-left-radius", "24px");
  await expect(row).toHaveCSS("border-bottom-left-radius", "0px");
  await expect(row).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});
test('every match row aligns players with individual set columns and labels the early rounds',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/match/archive-139865?vista=alrededor');const row=page.locator('.match-history-meeting .nc-match-row').first();await expect(row).toHaveCSS('display','grid');await expect(row.locator('.nc-row-round')).toContainText('ronda');await expect(row.locator('.row-score-line')).toHaveCount(3);for(let i=0;i<2;i++){const person=await row.locator('.nc-row-person').nth(i).boundingBox(),score=await row.locator('.row-score-line').nth(i+1).boundingBox();expect(Math.abs(person!.y+person!.height/2-score!.y-score!.height/2)).toBeLessThan(2)}await page.goto('/match/archive-139865');await expect(page.locator('.match-photo-initials')).toContainText('IL');await expect(page.locator('.match-contender-name .pd-country-flag')).toHaveCount(2);await expect(page.getByText('Ivan Ljubicic remontó el primer set en semifinal.',{exact:true})).toHaveCount(0);
});

test('completed Australian draw and non-played results open real detail pages',async({page})=>{await page.goto('/australian-open/2026');const picker=page.getByRole('group',{name:'Elegir ronda del cuadro'});await expect(picker.getByRole('button',{name:/^Final/})).toContainText('1');await expect(picker.getByRole('button',{name:/^Semifinal/})).toContainText('2');for(const id of ['live-37395','reference-ao-2026-mensik-withdrawal','reference-ao-2026-ms701']){const response=await page.goto('/match/'+id);expect(response?.status()).toBe(200);await expect(page.locator('.match-hero')).toBeVisible();}await expect(page.locator('.match-total')).toContainText('3–1');await page.goto('/match/reference-ao-2026-mensik-withdrawal');await expect(page.locator('.match-event-status')).toHaveText('Sin jugar');await expect(page.locator('.match-total')).toContainText('W/O');});

test('sharing uses the column scoreboard and exports a real PNG',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/match/reference-ao-2026-ms701');await page.getByRole('button',{name:'Compartir partido',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Compartir partido'});await expect(dialog.getByRole('table')).toBeVisible();await expect(dialog.getByRole('table').getByRole('rowheader')).toHaveCount(2);const download=page.waitForEvent('download');await dialog.getByRole('button',{name:/Cuadrado/}).click();const file=await download;expect(file.suggestedFilename()).toContain('1080x1080.png');expect(await file.failure()).toBeNull();await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:'Compartir partido',exact:true})).toBeFocused();});
