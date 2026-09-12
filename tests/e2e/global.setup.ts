import { chromium, type FullConfig } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { mkdir } from "node:fs/promises";

/**
 * Eenmalig inloggen met de testgebruiker en de sessie bewaren, zodat elke test
 * direct ingelogd start (geen inlogscherm per test).
 */
export default async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  const wachtwoord = process.env.E2E_CLERK_USER_PASSWORD;
  if (!email || !wachtwoord) {
    throw new Error(
      "E2E_CLERK_USER_EMAIL en E2E_CLERK_USER_PASSWORD ontbreken (zet ze in .env.test — zie docs/e2e-tests.md)",
    );
  }
  if (!/^pk_test_/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "")) {
    throw new Error("Smoke-tests draaien alleen met Clerk-ontwikkelsleutels (pk_test_…), nooit met de live-sleutels");
  }
  await clerkSetup();

  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3100";
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseURL + "/");
  await clerk.signIn({
    page,
    signInParams: { strategy: "password", identifier: email, password: wachtwoord },
  });
  await page.goto(baseURL + "/portal");
  await page.waitForSelector("text=/Mijn website/i", { timeout: 60_000 });
  await mkdir("tests/e2e/.auth", { recursive: true });
  await page.context().storageState({ path: "tests/e2e/.auth/gebruiker.json" });
  await browser.close();
}
