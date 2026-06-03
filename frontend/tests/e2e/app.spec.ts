import { expect, test } from "@playwright/test";

import { installMockApi } from "./mock-api";

test.beforeEach(async ({ page }) => {
  const browserErrors: string[] = [];
  (page as typeof page & { __browserErrors?: string[] }).__browserErrors = browserErrors;
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await installMockApi(page);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Вхід до системи" })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  const browserErrors = (page as typeof page & { __browserErrors?: string[] }).__browserErrors || [];
  expect(browserErrors, "browser console/page errors").toEqual([]);
});

test("worker mobile flow covers calendar switching, report creation and locked final report", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole("button", { name: "Worker" }).click();
  await page.getByRole("button", { name: "Увійти" }).click();

  await expect(page.getByRole("heading", { name: /Доброго дня, Markus/ })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /Календар/ }).click();
  await expect(page.getByRole("heading", { name: "Календар звітів" })).toBeVisible();
  await expect(page.getByText("Червень 2026")).toBeVisible();
  await page.getByRole("button", { name: "Попередній місяць" }).click();
  await expect(page.getByText("Травень 2026")).toBeVisible();
  await page.locator(".calendar-cell").filter({ has: page.getByText(/^29$/) }).first().click();
  await expect(page.locator(".calendar-cell.warning, .calendar-cell.ok, .calendar-cell.danger").first()).toBeVisible();
  await expect(page.locator(".summary-card .section-title").first()).toBeVisible();
  await expect(page.locator(".calendar-cell").filter({ hasText: "немає" })).toHaveCount(0);

  await page.getByRole("link", { name: /Звіт/ }).click();
  await page.getByLabel("План робіт").selectOption("1");
  await page.getByLabel("Виконаний обсяг").fill("12");
  await page.getByLabel("Опис робіт").fill("Змонтовано кабельні траси, перевірено матеріали, підготовлено щит.");
  await page.getByRole("button", { name: "Надіслати звіт" }).click();

  await expect(page.getByRole("heading", { name: /DR-2026-/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Коментарі" })).toBeVisible();

  await page.goto("/worker/reports/29", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "DR-2026-0029" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Редагувати звіт" })).toHaveCount(0);
});

test("foreman can approve submitted report and add comment", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: "Foreman" }).click();
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page.getByRole("heading", { name: "Билдер ERP" })).toBeVisible();

  await page.goto("/admin/reports/31", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Очікує бригадира")).toBeVisible();
  await page.getByRole("button", { name: "Погодити як бригадир" }).click();
  await expect(page.getByText("Звіт погоджено бригадиром")).toBeVisible();
  await expect(page.getByText("Очікує адміністратора")).toBeVisible();

  await page.getByLabel("Додати коментар").fill("Перевірено на майданчику, передаю адміну.");
  await page.getByRole("button", { name: "Додати коментар" }).click();
  await expect(page.getByText("Коментар додано")).toBeVisible();
  await expect(page.getByText("Перевірено на майданчику, передаю адміну.")).toBeVisible();
});

test("admin can final approve report, manage employee access and export payroll csv", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page.getByRole("heading", { name: "Билдер ERP" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await expect(page.getByRole("link", { name: /Berlin Ost - Neubau C/ }).first()).toBeVisible();
  await page.getByRole("link", { name: /Potsdam - Halle 2/ }).first().click();
  await expect(page.locator(".progress-ring strong")).toContainText("32%");
  await expect(page.locator(".progress-ring span")).toContainText("виконано");

  await page.goto("/admin/reports/30", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Очікує адміністратора")).toBeVisible();
  await page.getByRole("button", { name: "Фінально погодити" }).click();
  await expect(page.getByText("Звіт фінально погоджено")).toBeVisible();
  await expect(page.locator(".sticky-actions .badge").first()).toContainText("Фінально погоджено");

  await page.getByLabel("Додати коментар").fill("Фінально погоджено для нарахувань.");
  await page.getByRole("button", { name: "Додати коментар" }).click();
  await expect(page.getByText("Фінально погоджено для нарахувань.")).toBeVisible();

  await page.getByRole("link", { name: /Працівники/ }).click();
  await page.getByLabel("Ім'я").fill("Petro");
  await page.getByLabel("Прізвище").fill("Demo");
  await page.getByLabel("Роль/посада").first().fill("Майстер дільниці");
  await page.getByLabel("Телефон").first().fill("+49 30 7000000");
  await page.getByLabel("EUR/h").fill("31");
  await page.getByLabel("Email").first().fill("petro.demo@builder-erp.test");
  await page.getByLabel("Тимчасовий пароль").fill("Temp12345");
  await page.getByLabel("Роль доступу").first().selectOption("worker");
  await page.getByRole("button", { name: "Додати працівника" }).click();
  await expect(page.getByText("Працівника додано")).toBeVisible();
  await expect(page.getByText("Petro Demo")).toBeVisible();

  await page.getByRole("button", { name: /Редагувати/ }).filter({ has: page.locator("..") }).nth(0).click();
  await page.getByLabel("Новий пароль").fill("Updated12345");
  await page.getByRole("button", { name: "Змінити пароль" }).click();
  await expect(page.getByText("Пароль оновлено")).toBeVisible();
  await page.getByRole("button", { name: "Зберегти зміни" }).click();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.getByRole("link", { name: /Оплати/ }).click();
  await expect(page.getByRole("heading", { name: "Оплати" })).toBeVisible();
  await page.getByLabel("Режим").selectOption("payroll");
  await page.locator('input[type="month"]').fill("2026-05");
  await page.getByRole("button", { name: "Оновити" }).click();
  await expect(page.getByRole("cell", { name: "Markus Meyer" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("builder-erp-payroll-2026-04-21-2026-05-20.csv");
});

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
