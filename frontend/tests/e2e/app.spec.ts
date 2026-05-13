import { expect, test } from "@playwright/test";

import { installMockApi } from "./mock-api";

test.beforeEach(async ({ page }) => {
  const browserErrors: string[] = [];
  (page as typeof page & { __browserErrors?: string[] }).__browserErrors = browserErrors;
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.text().includes("Failed to load resource") && message.text().includes("401")) return;
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await installMockApi(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Вхід до системи" })).toBeVisible();
  test.info().annotations.push({ type: "browser-errors", description: browserErrors.join("\n") });
});

test.afterEach(async ({ page }) => {
  const browserErrors = (page as typeof page & { __browserErrors?: string[] }).__browserErrors || [];
  expect(browserErrors, "browser console/page errors").toEqual([]);
});

test("worker can login, navigate mobile contour, create report and logout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole("button", { name: "Worker" }).click();
  await page.getByRole("button", { name: "Увійти" }).click();

  await expect(page.getByRole("heading", { name: /Доброго дня, Markus/ })).toBeVisible();
  await expect(page.getByText("Робочі години в системі")).toBeVisible();
  await expect(page.getByText("Berlin Mitte - Haus A")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /Звіт/ }).click();
  await expect(page.getByRole("heading", { name: "Заповнення щоденного звіту" })).toBeVisible();
  await page.getByLabel("Опис робіт").fill("Змонтовано кабельні траси, перевірено матеріали, підготовлено щит.");
  await expect(page.getByText("8.00 h")).toBeVisible();
  await page.getByRole("button", { name: "Надіслати звіт" }).click();

  await expect(page.getByRole("heading", { name: "DR-2026-0099" })).toBeVisible();
  await expect(page.getByText("Змонтовано кабельні траси")).toBeVisible();

  await page.getByRole("link", { name: /Календар/ }).click();
  await expect(page.getByRole("heading", { name: "Календар звітів" })).toBeVisible();
  await expect(page.getByText("2026-03-21")).toBeVisible();

  await page.getByRole("link", { name: /Ще/ }).click();
  await expect(page.getByText("worker@romans-erp.demo")).toBeVisible();
  await page.getByRole("button", { name: /Вийти/ }).click();
  await expect(page.getByRole("heading", { name: "Вхід до системи" })).toBeVisible();
});

test("admin can use dashboard, filters, report approval and directory pages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Увійти" }).click();

  await expect(page.getByRole("heading", { name: "Roman's ERP" })).toBeVisible();
  await expect(page.getByText("Аналітика по об'єктах")).toBeVisible();
  await expect(page.getByText("Загальні витрати: EUR 1046.50")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /Звіти/ }).click();
  await expect(page.getByRole("heading", { name: "Список звітів" })).toBeVisible();
  await page.getByLabel("Статус").selectOption("review");
  await expect(page.getByRole("row", { name: /Markus Meyer/ })).toBeVisible();
  await expect(page.getByText("Jonas Klein")).not.toBeVisible();

  await page.getByRole("link", { name: "Відкрити" }).first().click();
  await expect(page.getByRole("heading", { name: /Щоденний звіт DR-2026-0031/ })).toBeVisible();
  await page.getByRole("button", { name: "Погодити" }).click();
  await expect(page.getByText("Погоджено")).toBeVisible();

  await page.getByRole("link", { name: /Працівники/ }).click();
  await expect(page.getByRole("heading", { name: "Працівники" })).toBeVisible();
  await page.getByLabel("Пошук").fill("Markus");
  await expect(page.getByText("Markus Meyer")).toBeVisible();

  await page.getByRole("link", { name: /Об'єкти/ }).click();
  await expect(page.getByRole("heading", { name: "Будівельні об'єкти" })).toBeVisible();
  await expect(page.getByText("Berlin Mitte - Haus A")).toBeVisible();
  await expect(page.getByText("Potsdam - Halle 2")).toBeVisible();
});

test("login error is clear when API rejects credentials", async ({ page }) => {
  await page.unroute("**/api/**");
  await page.route("**/api/auth/login", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Incorrect email or password" }) }));
  await page.getByLabel("Email").fill("wrong@example.com");
  await page.getByLabel("Пароль").fill("bad-password");
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page.getByText("Не вдалося увійти")).toBeVisible();
});

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
