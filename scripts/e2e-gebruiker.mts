/**
 * Maakt (eenmalig) de e2e-testgebruiker aan in de Clerk-DEVELOPMENT-instantie.
 *   npx tsx --env-file=.env.test scripts/e2e-gebruiker.mts
 */
import { createClerkClient } from "@clerk/backend";
const sk = process.env.CLERK_SECRET_KEY ?? "";
if (!sk.startsWith("sk_test_")) { console.error("Alleen met sk_test_… (Development-instantie)"); process.exit(1); }
const email = process.env.E2E_CLERK_USER_EMAIL, wachtwoord = process.env.E2E_CLERK_USER_PASSWORD;
if (!email || !wachtwoord) { console.error("E2E_CLERK_USER_EMAIL / E2E_CLERK_USER_PASSWORD ontbreken"); process.exit(1); }
const clerk = createClerkClient({ secretKey: sk });
const bestaand = await clerk.users.getUserList({ emailAddress: [email] });
if (bestaand.data.length > 0) { console.log("bestaat al:", bestaand.data[0].id); process.exit(0); }
const u = await clerk.users.createUser({ emailAddress: [email], password: wachtwoord, firstName: "E2E", lastName: "Test", skipPasswordChecks: false });
console.log("aangemaakt:", u.id);
