import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectSurfaceColour(element: Locator, surface: "clay" | "hard") {
  const colours = await element.evaluate((node, expectedSurface) => {
    const style = getComputedStyle(node);
    return {
      accent: style.getPropertyValue("--event-accent").trim(),
      expected: style.getPropertyValue(`--${expectedSurface}`).trim(),
      grass: style.getPropertyValue("--grass").trim(),
    };
  }, surface);
  expect(colours.accent).toBe(colours.expected);
  expect(colours.accent).not.toBe(colours.grass);
}

async function expectNoPageOverflow(page: Page, context: string) {
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth,
  ), { message: context }).toBeLessThanOrEqual(1);
}

test("Madrid uses clay today and preserves indoor hard for its 2007 Masters edition", async ({ page }) => {
  await page.goto("/torneos");
  const madridCard = page.locator('a[href^="/torneos/madrid?"][data-event-surface]');
  await expect(madridCard).toHaveAttribute("data-event-surface", "clay");
  await expect(madridCard).toContainText("Tierra");
  await expect(madridCard).not.toContainText("Al aire libre");
  await expectSurfaceColour(madridCard, "clay");

  await page.goto("/torneos/madrid");
  const current = page.locator('[data-tournament="madrid"]');
  await expect(current).toHaveAttribute("data-event-surface", "clay");
  await expect(current.getByRole("heading", { level: 1 })).toContainText(/Madrid/i);
  await expect(current.getByRole("navigation", { name: "Ediciones del torneo" })).toBeVisible();
  await expect(current.getByText(/necesitan revisión/i)).toHaveCount(0);

  await page.goto("/torneos/madrid/2007?categoria=Masters%201000");
  const historical = page.locator('[data-tournament="madrid"]');
  await expect(historical).toHaveAttribute("data-event-surface", "hard");
  await expect(historical.getByRole("heading", { level: 1 })).toContainText("2007");
  await expectSurfaceColour(historical, "hard");
});

test("Paris preserves its hard-court classification across catalogue and detail", async ({ page }) => {
  await page.goto("/torneos");
  const parisCard = page.locator('a[href^="/torneos/paris?"][data-event-surface]');
  await expect(parisCard).toHaveAttribute("data-event-surface", "hard");
  await expect(parisCard).toContainText("Dura");

  await expectSurfaceColour(parisCard, "hard");

  await page.goto("/torneos/paris");
  await expect(page.locator('[data-tournament="paris"]')).toHaveAttribute("data-event-surface", "hard");
  await expect(page.locator('[data-event-surface="indoor"]')).toHaveCount(0);
});

test("Masters history is integrated into the edition control", async ({ page }) => {
  await page.goto("/torneos/cincinnati");
  const archive = page.getByRole("combobox", { name: "Edición del torneo" });
  await expect(archive).toBeVisible();
  await expect(archive.locator("option").first()).toHaveText("Resumen");
  await expect(archive).toHaveValue("summary");
  await expect(archive.locator("option").filter({ hasText: "1989" })).toHaveCount(1);
  await expect(page.getByRole("combobox", { name: "Etapa del torneo" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Categorías de este torneo" })).toHaveCount(0);
});

test("the tournament title keeps the same position when an edition is selected",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  const readHero=()=>page.evaluate(()=>{
    const title=document.querySelector('[data-hero-tournament-name]')?.getBoundingClientRect();
    const heading=document.querySelector('[data-hero-tournament-name]')?.parentElement?.getBoundingClientRect();
    const selector=document.querySelector('select[aria-label="Edición del torneo"]')?.getBoundingClientRect();
    return {
      title:title&&{x:title.x,y:title.y,width:title.width,height:title.height,center:title.y+title.height/2},
      heading:heading&&{x:heading.x,y:heading.y,width:heading.width,height:heading.height,bottom:heading.bottom},
      selector:selector&&{x:selector.x,y:selector.y,width:selector.width,height:selector.height,bottom:selector.bottom},
    };
  });
  await page.goto('/torneos/tokyo');
  await page.evaluate(async()=>{await document.fonts.ready;});
  await expect(page.getByRole('combobox',{name:'Edición del torneo'})).toHaveValue('summary');
  const summary=await readHero();
  await page.goto('/torneos/tokyo/2026?categoria=ATP%20500');
  await page.evaluate(async()=>{await document.fonts.ready;});
  await expect(page.getByRole('combobox',{name:'Edición del torneo'})).toHaveValue('2026::ATP 500');
  await expect.poll(async()=>{
    const current=await readHero();
    const deltas=[
      Math.abs((current.title?.x||0)-(summary.title?.x||0)),
      Math.abs((current.title?.y||0)-(summary.title?.y||0)),
      Math.abs((current.title?.width||0)-(summary.title?.width||0)),
      Math.abs((current.title?.height||0)-(summary.title?.height||0)),
      Math.abs((current.selector?.x||0)-(summary.selector?.x||0)),
      Math.abs((current.selector?.y||0)-(summary.selector?.y||0)),
    ];
    return Math.max(...deltas);
  }).toBeLessThan(4);
  const edition=await readHero();
  expect(Math.abs((edition.heading?.bottom||0)-(edition.selector?.bottom||0))).toBeLessThan(4);
});

test("Australian Open uses distinct visual forms for titles, finals and effectiveness", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/torneos/australian-open");
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect(page.getByRole("heading", { name: "Campeones de la historia" })).toBeVisible();
  const names = page.getByRole("region", { name: "Nombres que definen el torneo" });
  await expect(names).toBeVisible();
  expect(await names.getByRole("link").count()).toBeGreaterThan(3);
  const effectiveness = page.getByRole("region", { name: "Efectividad en este torneo" });
  await expect(effectiveness).toBeVisible();
  expect(await effectiveness.getByRole("link").count()).toBeGreaterThan(2);
  await expect(page.getByRole("region", { name: "El torneo, visto desde los datos" })).toBeVisible();
  await expect(page.getByText("Categoría y condiciones por época")).toHaveCount(0);
  await expect(page.getByText("El primero en este archivo")).toHaveCount(0);
  const championCards = await page.locator('[aria-label="Campeones recientes"] li a').evaluateAll((cards) =>
    cards.map((card) => ({
      name: card.getAttribute("aria-label")?.split(", campeón")[0] || "",
      src: card.querySelector("img")?.getAttribute("src") || "",
    })),
  );
  for (const name of new Set(championCards.map((card) => card.name))) {
    const photos = championCards.filter((card) => card.name === name).map((card) => card.src).filter(Boolean);
    expect(new Set(photos).size, `${name} must not repeat a champion-rail photo`).toBe(photos.length);
  }

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectNoPageOverflow(page, `Australian Open rankings at ${width}px`);
  }
  const rail = page.getByRole("region", { name: "Campeones recientes" });
  await rail.focus();
  const before = await rail.evaluate(node => node.scrollLeft);
  await rail.press("ArrowRight");
  await expect.poll(() => rail.evaluate(node => node.scrollLeft)).toBeGreaterThan(before);
});

test("mobile edition rounds keep the Partidos cards, tiebreaks and the champion path",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/torneos/roland-garros/2024');
 const bracket=page.getByRole('region',{name:'El cuadro de la edición',exact:true});
 const firstRound=bracket.getByRole('region',{name:'Ronda de 128',exact:true});
 await expect(firstRound.locator('a:visible')).toHaveCount(6);
 const reveal=bracket.getByRole('button',{name:/Ver todos los partidos/});
 await expect(reveal).toHaveCount(1);
 await reveal.click();
 await expect(reveal).toHaveCount(0);
 expect(await firstRound.locator('a:visible').count()).toBeGreaterThan(6);
 await expect(bracket.getByText('Mostrar menos')).toHaveCount(0);
 const quarterfinals=bracket.getByRole('region',{name:'Cuartos de final',exact:true});
 await expect(quarterfinals.getByRole('link')).toHaveCount(3);
 const alcaraz=quarterfinals.locator('a[href="/match/live-83847"]');
 await expect(alcaraz).toContainText('Carlos Alcaraz');
 await expect(alcaraz.locator('sup')).toHaveText('3');
 await expect(alcaraz.locator('..')).toHaveAttribute('data-champion-path','true');
 const finalRound=bracket.getByRole('region',{name:'Final',exact:true});
 await expect(finalRound.getByRole('link')).toHaveCount(1);
 await expect(finalRound.getByRole('link')).toContainText('Carlos Alcaraz');
 const score=page.getByRole('region',{name:'Final 2024'}).getByRole('link',{name:/Ver Alexander Zverev contra Carlos Alcaraz/});
 await expect(score).toContainText('Carlos Alcaraz');
 await expectNoPageOverflow(page,'Mobile edition');
});

test("every Grand Slam edition hero keeps its title, year and controls inside the viewport", async ({ page }) => {
  const paths = [
    "/torneos/australian-open/2011",
    "/torneos/roland-garros/2024",
    "/torneos/wimbledon/2026",
    "/torneos/us-open/2025",
  ];
  for (const path of paths) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Ediciones del torneo" })).toBeVisible();
      await expectNoPageOverflow(page, `${path} hero at ${viewport.width}px`);
      const boxes = await page.locator('h1, nav[aria-label="Ediciones del torneo"]').evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right, viewport: window.innerWidth };
        }),
      );
      for (const box of boxes) {
        expect(box.left, `${path} left edge at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
        expect(box.right, `${path} right edge at ${viewport.width}px`).toBeLessThanOrEqual(box.viewport + 1);
      }
    }
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`tournament gallery, overview and edition fit all supported widths and pass Axe: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const path of ["/torneos", "/torneos/australian-open", "/torneos/roland-garros/2024"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expectNoPageOverflow(page, `${path}, ${colorScheme}, ${width}px`);
      }
      // Include mobile's active-round view in the audit as well as the wide overview.
      await page.setViewportSize({ width: path.includes("/2024") ? 390 : 1440, height: 900 });
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
        .analyze();
      expect(audit.violations, `${path}, ${colorScheme}`).toEqual([]);
    }
  });
}
