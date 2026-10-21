import { expect, test } from "@playwright/test";

test("la búsqueda y el menú móvil devuelven el foco al cerrarse", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/info");

  const searchButton = page.getByRole("button", { name: "Buscar en DEUCE" });
  await searchButton.click();
  await expect(page.locator("#ry-search-dialog")).toBeVisible();
  await expect(page.locator("#ry-search-query")).toBeFocused();
  await expect(searchButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#ry-search-dialog")).toBeHidden();
  await expect(searchButton).toBeFocused();
  await expect(searchButton).toHaveAttribute("aria-expanded", "false");

  const menuButton = page.getByRole("button", { name: "Abrir menú" });
  await menuButton.click();
  await expect(page.locator("#ry-menu-dialog")).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#ry-menu-dialog")).toBeHidden();
  await expect(menuButton).toBeFocused();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});
