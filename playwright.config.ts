import { defineConfig, devices } from "@playwright/test";
import { config as laadEnv } from "dotenv";

/**
 * Smoke-tests van het portaal (tests/e2e). Draaien tegen een eigen dev-server
 * op poort 3100 met de Clerk-ontwikkelsleutels uit .env.test (pk_test/sk_test);
 * database en overige sleutels komen uit .env.local. De testgebruiker werkt op
 * de probeer-demo (eigen sandbox, wordt elk uur opgeruimd), dus geen klantsite
 * wordt geraakt. Zie docs/e2e-tests.md.
 */
laadEnv({ path: ".env.local" });
laadEnv({ path: ".env.test", override: true });

const POORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global.setup.ts",
  use: {
    baseURL: `http://localhost:${POORT}`,
    storageState: "tests/e2e/.auth/gebruiker.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npx next dev -p ${POORT}`,
    url: `http://localhost:${POORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
    },
  },
});
