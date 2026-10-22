import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("navigation merges rivals into players and the match index browses editions", async ({
  page,
}) => {
  await page.goto("/buscar");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(
    nav.getByRole("link", { name: "Cara a cara", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".season-event")).not.toHaveCount(0);
  await expect(page.locator(".nc-match-row")).toHaveCount(25);
  await page.getByText("Explorar campeonatos por temporada", { exact: true }).click();
  await page.locator(".season-event").first().click();
  await expect(page.locator(".match-year")).toHaveCount(1);
  await expect(page.locator(".match-edition[open]")).not.toHaveCount(0);
  await expect(page.locator(".nc-match-row").first()).toBeVisible();
});

test("the tournament gallery follows the circuit and keeps categories", async ({
  page,
}) => {
  await page.goto("/tournaments");
  const names = await page
    .locator("#temporada .ry-photo-tournament-copy>strong")
    .allTextContents();
  expect(names.slice(0, 3)).toEqual([
    "Abierto de Australia",
    "Indian Wells",
    "Miami",
  ]);
  expect(names.indexOf("Roland Garros")).toBeLessThan(
    names.indexOf("Wimbledon"),
  );
  expect(names.indexOf("Shanghái")).toBeLessThan(names.indexOf("París"));
});

test("gallery, official videos and surface comparisons are interactive", async ({
  page,
}) => {
  await page.goto("/");
  const surface = page.getByRole("group", {
    name: "Superficie del cara a cara",
  });
  await surface.getByRole("button", { name: "Tierra", exact: true }).click();
  await expect(page.locator(".surface-duel-result")).toContainText("18");
  const gallery = page.locator(".court-gallery");
  const old = await gallery.locator("h3").innerText();
  await gallery.getByRole("button", { name: "Imagen siguiente" }).click();
  await expect(gallery.locator("h3")).not.toHaveText(old);
  await expect(gallery.getByRole("button", { name: "Ampliar fotografía" })).toHaveCount(0);
  await expect(gallery.getByRole("link", { name: "Ver torneo y resultados" })).toBeVisible();
  await gallery.getByRole("button", { name: "Vídeos", exact: true }).click();
  await expect(gallery.locator("iframe")).toHaveCount(0);
  await gallery.getByRole("button", { name: /Reproducir/ }).click();
  await expect(gallery.locator("iframe")).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/eRbTHj2KLro/,
  );
});

test("glass screens remain accessible at narrow and tablet widths", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/buscar",
    "/tournaments",
    "/match/archive-148401",
  ]) {
    await page.goto(path);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} ${width}`,
      ).toBe(true);
    }
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
});
