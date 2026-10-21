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
  await page.goto("/tournaments");
  const madridCard = page.locator('.ry-photo-tournament-tile[href="/torneos/madrid"]');
  await expect(madridCard).toHaveAttribute("data-event-surface", "clay");
  await expect(madridCard).toContainText("Tierra");
  await expect(madridCard).toContainText("Al aire libre");
  await expectSurfaceColour(madridCard, "clay");

  await madridCard.click();
  await expect(page).toHaveURL(/\/torneos\/madrid$/);
  const current = page.locator(".td-tournament");
  await expect(current).toHaveAttribute("data-event-surface", "clay");
  await expect(current.locator(".td-hero-court")).toContainText("Tierra");
  await expect(current.locator(".td-hero-court")).toContainText("Al aire libre");

  await page.goto("/madrid/2007?categoria=Masters%201000");
  const historical = page.locator(".td-edition");
  await expect(historical).toHaveAttribute("data-event-surface", "hard");
  await expect(historical.locator(".td-hero-court")).toContainText("Dura");
  await expect(historical.locator(".td-hero-court")).toContainText("Bajo techo");
  await expect(historical.locator(".td-hero-court")).not.toContainText("Tierra");
  await expectSurfaceColour(historical, "hard");
  // The present clay venue must not be presented as a photograph of Madrid Arena in 2007.
  await expect(historical.locator(".td-edition-hero img")).toHaveCount(0);
});

test("Paris labels indoor conditions independently of its hard court surface", async ({ page }) => {
  await page.goto("/tournaments");
  const parisCard = page.locator('.ry-photo-tournament-tile[href="/torneos/paris"]');
  await expect(parisCard).toHaveAttribute("data-event-surface", "hard");
  await expect(parisCard).toContainText("Dura · Bajo techo");
  await expect(parisCard.locator(".nc-dot-hard")).toHaveCount(1);
  await expectSurfaceColour(parisCard, "hard");

  await parisCard.click();
  const court = page.locator(".td-hero-court");
  await expect(court).toContainText("Dura");
  await expect(court).toContainText("Bajo techo");
  await expect(page.locator(".td-tournament")).toHaveAttribute("data-event-surface", "hard");
  await expect(page.locator('[data-event-surface="indoor"]')).toHaveCount(0);
});

test("Australian Open rankings keep position, name, detail and values in aligned columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/torneos/australian-open");
  await page.evaluate(async () => { await document.fonts.ready; });
  const panels = page.locator(".td-tournament-rankings > section");
  await expect(panels).toHaveCount(2);
  await expect(panels.nth(0).getByRole("heading", { name: "Más títulos", exact: true })).toBeVisible();
  await expect(panels.nth(1).getByRole("heading", { name: "Más finales", exact: true })).toBeVisible();

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const panel of await panels.all()) {
      const rows = panel.locator(".nc-ranking-row");
      await expect(rows).toHaveCount(8);
      const rightEdges: number[] = [];
      for (let index = 0; index < 3; index++) {
        const row = rows.nth(index);
        await expect(row.locator(".nc-rank-name")).toBeVisible();
        await expect(row.locator(".nc-rank-detail")).not.toBeEmpty();
        await expect(row.locator(".nc-rank-value")).toBeVisible();
        const layout = await row.evaluate((node) => {
          const position = node.querySelector(".nc-rank-position")!.getBoundingClientRect();
          const person = node.querySelector(".nc-rank-person")!.getBoundingClientRect();
          const name = node.querySelector(".nc-rank-name")!.getBoundingClientRect();
          const detail = node.querySelector(".nc-rank-detail")!.getBoundingClientRect();
          const value = node.querySelector(".nc-rank-value")!.getBoundingClientRect();
          return {
            height: node.getBoundingClientRect().height,
            positionRight: position.right, personLeft: person.left, personRight: person.right,
            nameBottom: name.bottom, detailTop: detail.top,
            valueLeft: value.left, valueRight: value.right,
          };
        });
        expect(layout.height).toBeGreaterThanOrEqual(60);
        expect(layout.personLeft - layout.positionRight).toBeGreaterThanOrEqual(6);
        expect(layout.valueLeft - layout.personRight).toBeGreaterThanOrEqual(6);
        expect(layout.detailTop).toBeGreaterThanOrEqual(layout.nameBottom);
        rightEdges.push(layout.valueRight);
      }
      expect(Math.max(...rightEdges) - Math.min(...rightEdges)).toBeLessThanOrEqual(1);
    }
    await expectNoPageOverflow(page, `Australian Open rankings at ${width}px`);
  }
});

test("mobile edition rounds show actual results, accessible tiebreaks and the champion's path", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/roland-garros/2024");
  const bracket = page.getByRole("region", { name: "Cuadro registrado", exact: true });
  const picker = bracket.getByRole("group", { name: "Elegir ronda del cuadro" });
  const quarterfinals = bracket.getByRole("region", { name: "Cuartos de final", exact: true });
  await expect(quarterfinals).toBeVisible();
  // Three quarterfinals are registered; the absent fourth result must not become an invented slot.
  await expect(quarterfinals.locator(".td-bracket-match")).toHaveCount(3);
  const alcarazQuarterfinal = quarterfinals.locator('a[href="/match/live-83847"]');
  await expect(alcarazQuarterfinal).toHaveAccessibleName(
    "Cuartos de final: Carlos Alcaraz contra Stefanos Tsitsipas, 6–3, 7–6(3), 6–4. Ganador: Carlos Alcaraz",
  );
  await expect(alcarazQuarterfinal).toHaveAttribute("data-champion-path", "true");
  await expect(alcarazQuarterfinal.locator(".td-bracket-result")).toContainText("Camino del campeón");
  await expect(quarterfinals.locator('a[href="/match/live-84298"]')).toHaveAttribute("data-champion-path", "false");

  const finalButton = picker.getByRole("button", { name: /^Final/ });
  await finalButton.focus();
  await page.keyboard.press("Enter");
  await expect(finalButton).toHaveAttribute("aria-pressed", "true");
  const final = bracket.getByRole("region", { name: "Final", exact: true });
  await expect(final).toBeVisible();
  await expect(quarterfinals).not.toBeVisible();
  await expect(final.locator(".td-bracket-match")).toHaveCount(1);
  const actualFinal = final.locator('a[href="/match/live-85844"]');
  await expect(actualFinal).toHaveAccessibleName(
    "Final: Alexander Zverev contra Carlos Alcaraz, 3–6, 6–2, 7–5, 1–6, 2–6. Ganador: Carlos Alcaraz",
  );
  await expect(actualFinal).toHaveAttribute("data-champion-path", "true");
  await expect(actualFinal.locator('[data-winner="true"]')).toContainText("Carlos Alcaraz");

  const scoreboard = page.getByRole("region", { name: "Final · 2024", exact: true }).getByRole("table");
  await expect(scoreboard).toHaveAccessibleName(/Alexander Zverev contra Carlos Alcaraz.*3–6, 6–2, 7–5, 1–6, 2–6/);
  await expect(scoreboard.getByRole("columnheader")).toHaveCount(7);
  await expect(scoreboard.getByRole("rowheader", { name: /Carlos Alcaraz.*Ganador/ })).toBeVisible();

  await picker.getByRole("button", { name: /^Octavos de final/ }).click();
  const fourthRound = bracket.getByRole("region", { name: "Octavos de final", exact: true });
  await expect(fourthRound).toBeVisible();
  await expect(final).not.toBeVisible();
  await expect(fourthRound.locator(".td-bracket-match")).toHaveCount(8);
  await expect(fourthRound.locator('a[href="/match/live-83157"]')).toHaveAccessibleName(
    /Carlos Alcaraz contra Félix Auger-Aliassime, 6–3, 6–3, 6–1/,
  );
  await expectNoPageOverflow(page, "Mobile edition after switching rounds");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`tournament gallery, overview and edition fit all supported widths and pass Axe: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const path of ["/tournaments", "/torneos/australian-open", "/roland-garros/2024"]) {
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
