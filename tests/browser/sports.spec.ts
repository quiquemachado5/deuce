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
    page.locator(".match-setboard .ry-scoreboard caption"),
  ).toContainText("6–7(5), 6–7(8)");
  await expect(
    page.locator(".match-setboard .ry-scoreboard thead th"),
  ).toHaveCount(6);
  await expect(page.locator(".match-hero-scene img")).toBeVisible();
  await expect(page.locator(".match-setboard img")).toHaveCount(0);
  await expect(page.locator(".ry-scoreboard sup")).toHaveCount(0);
  await expect(page.locator(".ry-set-tiebreak").first()).toHaveText("(5)");
  await expect(page.locator(".ds-set-picker")).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator(".ry-set-tiebreak").first()).toBeVisible();
  expect(
    await page
      .locator(".ry-set-tiebreak")
      .first()
      .evaluate((el) => getComputedStyle(el).verticalAlign),
  ).toBe("baseline");
});
test("verified game flow has readable axes, moments and an equivalent table", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/match/live-203807");
  const flow = page.locator(".ry-game-flow");
  await expect(flow).toBeVisible();
  await expect(flow.locator(".ry-game-flow-axis span")).toHaveCount(3);
  await expect(flow.getByRole("img")).toHaveAttribute(
    "aria-label",
    /eje horizontal de 0 a 20, eje vertical/,
  );
  await flow.getByText("Ver juegos en tabla").click();
  await expect(
    flow.getByRole("table", { name: /Juegos cerrados y verificados/ }),
  ).toBeVisible();
  await expect(flow.locator("tbody tr").first()).toContainText("juego");
  const moment = flow.getByRole("button", { name: /Break de/ }).first();
  await moment.click();
  await expect(flow.locator(".match-replay-moment")).toContainText("Set");
  await flow.getByRole("button", { name: "Reproducir momentos" }).click();
  await expect(
    flow.getByRole("button", { name: "Pausar momentos" }),
  ).toBeVisible();
  await flow.getByRole("button", { name: "Pausar momentos" }).click();
  await expect(moment).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
