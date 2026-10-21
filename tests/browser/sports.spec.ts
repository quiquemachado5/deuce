import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("home shows a recent tournament, photography and verified discoveries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const hero = page.locator(".ds-hero-record");
  await expect(hero.getByRole("heading", { level: 2 })).not.toBeEmpty();
  await expect(hero).toContainText("Ganador del último encuentro");
  await expect(
    hero.getByRole("link", { name: "Ver el partido", exact: true }),
  ).toHaveAttribute("href", /\/match\//);
  await expect(hero.locator(".ds-hero-court img")).toBeVisible();
  await expect(page.locator(".ds-results-list .nc-match-row")).toHaveCount(5);
  const discoveries = page.getByRole("region", {
    name: "Siempre hay otro dato.",
  });
  await expect(discoveries.locator(".ds-story")).toHaveCount(6);
  await expect(discoveries.locator(".ds-story").first()).toContainText(
    "Andy Murray",
  );
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
test("records have straight separators, rounded hover and opaque navigation without sticky categories", async ({ page }) => {
  await page.goto("/records");
  await expect(page.locator(".rv-family-nav")).toHaveCSS("position", "static");
  await expect(page.locator(".ry-header")).toHaveCSS("backdrop-filter", "none");
  const row = page.locator(".rv-catalogue-row").first();
  await expect(row).toHaveCSS("border-bottom-left-radius", "0px");
  await row.hover();
  expect(await row.evaluate(el => getComputedStyle(el, "::before").borderRadius)).toBe("16px");
  expect(await row.evaluate(el => getComputedStyle(el, "::before").backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
});
