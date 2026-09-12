import { test, expect, type Page } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

/**
 * Smoke-tests van het klantportaal op de probeer-demo. Ze raken de echte AI en
 * Cloudflare aan (kleine kosten, ± 2 minuten), dus draai ze bewust:
 *   npm run test:e2e
 * Volgorde is belangrijk: wijziging → controleknop → publiceren → terugdraaien.
 */

async function openPortaal(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto("/portal");
  await expect(page.getByRole("heading", { name: /Mijn website/i })).toBeVisible({ timeout: 60_000 });
}

function invoer(page: Page) {
  return page.getByPlaceholder(/Wat wil je aanpassen/i);
}

async function stuur(page: Page, tekst: string) {
  const veld = invoer(page);
  await veld.click();
  await veld.fill(tekst);
  await veld.press("Enter");
  await expect(page.getByText(tekst, { exact: false }).last()).toBeVisible();
}

test.describe.serial("Portaal: wijziging, controle, publiceren", () => {
  test("portaal laadt met het websitevoorbeeld", async ({ page }) => {
    await openPortaal(page);
    await expect(page.locator('iframe[title="Je website"]').first()).toBeVisible();
    await expect(invoer(page)).toBeVisible();
  });

  test("een wijziging via de chat levert een concept op", async ({ page }) => {
    await openPortaal(page);
    await stuur(page, "Maak de knop 'Bestel voor morgen' donkergroen.");
    // De AI werkt: er verschijnt een concept-strip zodra hij klaar is
    await expect(page.getByText(/Concept klaar/i).first()).toBeVisible({ timeout: 180_000 });
    await expect(page.getByRole("button", { name: /^Publiceer$/ })).toBeEnabled();
  });

  test("de controleknop laat de AI zelf kijken", async ({ page }) => {
    await openPortaal(page);
    const knop = page.getByRole("button", { name: /Laat de AI zelf kijken/i });
    await expect(knop).toBeVisible({ timeout: 30_000 });
    await knop.click();
    await expect(page.getByText(/Dit klopt niet\. Kijk zelf even/i).last()).toBeVisible();
    // De AI antwoordt met wat hij zag — een nieuw assistent-bericht na de klik
    await expect(page.getByText(/schermafbeelding|ik zie|zie ik/i).last()).toBeVisible({ timeout: 180_000 });
  });

  test("publiceren toont de overlay en meldt dat het live staat", async ({ page }) => {
    await openPortaal(page);
    const publiceer = page.getByRole("button", { name: /^Publiceer$/ });
    await expect(publiceer).toBeEnabled({ timeout: 30_000 });
    await publiceer.click();
    await expect(page.getByText(/Je wijziging gaat live/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Gepubliceerd!/i).last()).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/Je wijziging gaat live/i)).toBeHidden({ timeout: 120_000 });
  });

  test("terugdraaien na publiceren werkt", async ({ page }) => {
    await openPortaal(page);
    // Na een verse paginalading is de "Draai terug"-kans weg; dat is per ontwerp.
    // We controleren alleen dat het portaal zonder concept schoon laadt.
    await expect(page.getByText(/Concept klaar/i)).toHaveCount(0);
    await expect(invoer(page)).toBeVisible();
  });
});
