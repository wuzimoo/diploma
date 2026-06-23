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
  await expect(page.getByRole("heading", { name: "Anmeldung" })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  const browserErrors = (page as typeof page & { __browserErrors?: string[] }).__browserErrors || [];
  expect(browserErrors, "browser console/page errors").toEqual([]);
});

test("worker mobile flow covers calendar switching, report creation and locked final report", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole("button", { name: "Mitarbeiter" }).click();
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page.getByRole("heading", { name: /Guten Tag, Markus/ })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /Kalender/ }).click();
  await expect(page.getByRole("heading", { name: "Berichtskalender" })).toBeVisible();
  await expect(page.locator(".calendar-month-header strong")).toHaveText("Juni 2026");
  await page.getByRole("button", { name: "Vorheriger Monat" }).click();
  await expect(page.locator(".calendar-month-header strong")).toHaveText("Mai 2026");
  await page.locator(".calendar-cell").filter({ has: page.getByText(/^29$/) }).first().click();
  await expect(page.locator(".calendar-cell.warning, .calendar-cell.ok, .calendar-cell.danger").first()).toBeVisible();
  await expect(page.locator(".summary-card .section-title").first()).toBeVisible();

  await page.getByRole("link", { name: /Bericht/ }).click();
  await page.getByLabel("Arbeitspaket").selectOption("1");
  await page.getByLabel("Ausgeführte Menge").fill("12");
  await page.getByLabel("Arbeitsbeschreibung").fill("Kabeltrassen montiert, Material geprüft und die Verteilung vorbereitet.");
  await page.getByRole("button", { name: "Bericht einreichen" }).click();

  await expect(page.getByRole("heading", { name: /DR-2026-/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kommentare und Historie" })).toBeVisible();

  await page.goto("/worker/reports/29", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "DR-2026-0029" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bericht bearbeiten" })).toHaveCount(0);
});

test("foreman can approve submitted report and add comment", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: "Polier" }).click();
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: "BauPilot" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Teams/ })).toHaveCount(0);

  await page.goto("/admin/reports/31", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Wartet auf den Polier")).toBeVisible();
  await page.getByRole("button", { name: "Als Polier freigeben" }).click();
  await expect(page.getByText("Vom Polier freigegeben")).toBeVisible();
  await expect(page.getByText("Wartet auf die Verwaltung")).toBeVisible();

  await page.getByLabel("Kommentar erfassen").fill("Vor Ort geprüft, ich gebe an die Verwaltung weiter.");
  await page.getByRole("button", { name: "Kommentar speichern" }).click();
  await expect(page.getByText("Kommentar gespeichert")).toBeVisible();
  await expect(page.getByText("Vor Ort geprüft, ich gebe an die Verwaltung weiter.")).toBeVisible();
});

test("admin can final approve report, manage employee access and export payroll csv", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: "BauPilot" })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await expect(page.getByRole("link", { name: /Berlin Ost - Neubau C/ }).first()).toBeVisible();
  await page.getByRole("link", { name: /Potsdam - Halle 2/ }).first().click();
  await expect(page.locator(".progress-ring strong")).toContainText("32%");
  await expect(page.locator(".progress-ring span")).toContainText("erledigt");

  await page.goto("/admin/reports/30", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Wartet auf die Verwaltung")).toBeVisible();
  await page.getByRole("button", { name: "Final freigeben" }).click();
  await expect(page.locator(".toast").filter({ hasText: "Final freigegeben" }).first()).toBeVisible();
  await expect(page.locator(".sticky-actions .badge").first()).toContainText("Final freigegeben");

  await page.getByLabel("Kommentar erfassen").fill("Final fur die Lohnabrechnung freigegeben.");
  await page.getByRole("button", { name: "Kommentar speichern" }).click();
  await expect(page.getByText("Final fur die Lohnabrechnung freigegeben.")).toBeVisible();

  await page.getByRole("link", { name: /Mitarbeiter/ }).click();
  await page.getByLabel("Vorname").fill("Petro");
  await page.getByLabel("Nachname").fill("Demo");
  await page.getByLabel("Funktion").first().fill("Bereichsmeister");
  await page.getByLabel("Telefon").first().fill("+49 30 7000000");
  await page.getByLabel("EUR/h").fill("31");
  await page.getByLabel("Email").first().fill("petro.demo@baupilot.test");
  await page.getByLabel("Temporäres Passwort").fill("Temp12345");
  await page.getByLabel("Zugriffsrolle").first().selectOption("worker");
  await page.getByRole("button", { name: "Mitarbeiter anlegen" }).click();
  await expect(page.getByText("Mitarbeiter angelegt")).toBeVisible();
  await expect(page.getByText("Petro Demo")).toBeVisible();

  await page.getByRole("button", { name: /Bearbeiten/ }).filter({ has: page.locator("..") }).nth(0).click();
  await page.getByLabel("Neues Passwort").fill("Updated12345");
  await page.getByRole("button", { name: "Passwort aktualisieren" }).click();
  await expect(page.getByText("Passwort aktualisiert")).toBeVisible();
  await page.getByRole("button", { name: "Änderungen speichern" }).click();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.getByRole("link", { name: /Lohn/ }).click();
  await expect(page.getByRole("heading", { name: "Lohnubersicht" })).toBeVisible();
  await page.getByLabel("Modus").selectOption("payroll");
  await page.locator('input[type="month"]').fill("2026-05");
  await page.getByRole("button", { name: "Aktualisieren" }).click();
  await expect(page.getByRole("cell", { name: "Markus Meyer" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV export" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("baupilot-lohn-2026-04-21-2026-05-20.csv");
});

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
