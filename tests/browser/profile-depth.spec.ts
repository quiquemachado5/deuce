import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const profile = "/players/novak-djokovic?year=2014";
const currentFact = '.pd-discovery-body[data-current="true"]';

test("player discovery is available without JavaScript and Otro dato changes the observation without moving the panel", async ({
  browser,
  page,
  baseURL,
}) => {
  const serverContext = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const serverPage = await serverContext.newPage();
    await serverPage.goto(profile);
    const discovery = serverPage.locator(".pd-discovery");
    await expect(discovery).toBeVisible();
    await expect(discovery).toHaveAttribute("data-discovery-id", /\S+/);
    await expect(discovery.locator(currentFact)).toHaveCount(1);
    await expect(discovery.locator(`${currentFact} h3`)).not.toBeEmpty();
    await expect(
      discovery.locator(`${currentFact} .pd-discovery-value strong`),
    ).not.toBeEmpty();
    await expect(
      discovery.locator(`${currentFact} .pd-discovery-sample`),
    ).not.toBeEmpty();
    await expect(discovery.locator(`${currentFact} a`)).toHaveAttribute(
      "href",
      /^\/(match\/|buscar\?)/,
    );
  } finally {
    await serverContext.close();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(profile);
  const discovery = page.locator(".pd-discovery");
  await discovery.scrollIntoViewIfNeeded();
  // The one-time hydration randomization and font loading finish before measuring.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  const initialId = await discovery.getAttribute("data-discovery-id");
  const initialBox = await discovery.boundingBox();
  expect(initialBox).not.toBeNull();

  await discovery
    .getByRole("button", { name: "Otro dato", exact: true })
    .click();
  await expect(discovery).not.toHaveAttribute("data-discovery-id", initialId!);
  await expect(discovery.locator(currentFact)).toHaveCount(1);
  await expect(discovery.locator(currentFact)).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  const currentTitle = await discovery.locator(`${currentFact} h3`).innerText();
  await expect(discovery.getByRole("status")).toContainText(currentTitle);
  await expect(
    discovery.locator(`${currentFact} .pd-discovery-sample`),
  ).not.toBeEmpty();
  await expect(discovery.locator(`${currentFact} a`)).toHaveAttribute(
    "href",
    /^\/(match\/|buscar\?)/,
  );
  const changedBox = await discovery.boundingBox();
  expect(changedBox).not.toBeNull();
  expect(Math.abs(changedBox!.height - initialBox!.height)).toBeLessThan(1);
});

test("player bio names the country without a flag and the mobile calendar identifies champion, finalist and semifinalist with direct evidence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(profile);
  // The country remains readable while flags are removed from the visual layout.
  const country = page.locator(".ry-player-bio .pd-country");
  await expect(country).toHaveText("Serbia");
  await expect(country.locator("img")).toHaveCount(0);

  const calendar = page.getByRole("region", { name: "Calendario del archivo" });
  await expect(calendar.locator(".ry-selected-season")).toHaveText("2014");
  await expect(
    calendar
      .getByRole("navigation", { name: "Temporada del jugador" })
      .getByRole("link", { name: "2014", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  const results = [
    {
      outcome: "champion",
      tournament: "Wimbledon",
      label: "Campeón",
      href: "/match/archive-166247",
      fill: "--pd-gold-bg",
    },
    {
      outcome: "finalist",
      tournament: "Roland Garros",
      label: "Finalista",
      href: "/match/archive-165980",
      fill: "--pd-silver-bg",
    },
    {
      outcome: "semifinalist",
      tournament: "Abierto de Estados Unidos",
      label: "Semifinalista",
      href: "/match/archive-166843",
      fill: "--pd-semi-bg",
    },
  ];
  const colors: string[] = [];
  for (const result of results) {
    const cell = calendar
      .locator(`.ry-circuit-cell[data-player-outcome="${result.outcome}"]`)
      .filter({ hasText: result.tournament });
    await cell.scrollIntoViewIfNeeded();
    await expect(cell.locator("strong")).toHaveText(result.label);
    await expect(cell.getByRole("link")).toHaveAttribute("href", result.href);
    await expect(cell.locator(".pd-calendar-balance")).toHaveText(
      /\d+–\d+ · \d+ partidos/,
    );
    const expectedFill = await page
      .locator(".ry-player-page")
      .evaluate(
        (element, token) =>
          getComputedStyle(element).getPropertyValue(token).trim(),
        result.fill,
      );
    expect(expectedFill).not.toBe("");
    expect(
      await cell.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--pd-result-bg").trim(),
      ),
    ).toBe(expectedFill);
    colors.push(
      await cell.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    );
  }
  // Text identifies each outcome, and distinct fills preserve gold/silver/semifinal separation.
  expect(new Set(colors).size).toBe(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("mobile comparison keeps the selected pair visible while editing a rival and submits the current choice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/comparar?a=Novak%20Djokovic&b=Rafael%20Nadal");
  const form = page.locator("#player-comparison-form");
  const rival = form.getByLabel("Jugador 2", { exact: true });
  const dock = page.locator(".pd-compare-dock");
  await rival.fill("Roger Federer");
  await expect(rival).toBeFocused();
  await expect(dock).toBeVisible();
  await expect(
    dock.locator(".pd-compare-dock-person").nth(0).locator("strong"),
  ).toHaveText("Novak Djokovic");
  await expect(
    dock.locator(".pd-compare-dock-person").nth(1).locator("strong"),
  ).toHaveText("Roger Federer");

  // Keep the input focused while its form leaves the viewport: the pair remains available.
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(rival).toBeFocused();
  await expect(dock).toBeVisible();
  await expect(dock).toHaveCSS("position", "fixed");
  const box = await dock.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await Promise.all([
    page.waitForURL(
      (url) =>
        url.pathname === "/comparar" &&
        url.searchParams.get("a") === "Novak Djokovic" &&
        url.searchParams.get("b") === "Roger Federer",
    ),
    dock.getByRole("button", { name: "Comparar", exact: true }).click(),
  ]);
  await expect(page.locator(".dx-comparison-players strong")).toHaveText([
    "Novak Djokovic",
    "Roger Federer",
  ]);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`player discovery, photos and calendar remain accessible without document overflow: ${colorScheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.addInitScript(
      (theme) => localStorage.setItem("deuce-rally-theme", theme),
      colorScheme,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(profile);
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      colorScheme,
    );
    await expect(page.locator(".pd-discovery")).toBeVisible();
    await expect(page.locator(".pd-portrait > img")).toBeVisible();
    await page
      .locator(".pd-discovery")
      .getByRole("button", { name: "Otro dato", exact: true })
      .click();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Player profile at ${width}px in ${colorScheme}`,
      ).toBe(true);
    }
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}
