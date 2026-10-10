import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dagenSinds, geleden } from "../lib/geleden";

/** "Laatst ingelogd" en "laatste chat" in de klantenlijst (Jos, 10-10-2026). */
const nu = new Date("2026-10-10T14:00:00+02:00");
const terug = (dagen: number, uur = 12) => new Date(Date.UTC(2026, 9, 10 - dagen, uur - 2)).toISOString();

assert.equal(geleden(null, nu), "nooit");
assert.equal(geleden("onzin", nu), "nooit");
assert.equal(geleden(terug(0, 9), nu), "vandaag");
// Gisteravond laat is "gisteren", ook al is het minder dan 24 uur geleden
assert.equal(geleden("2026-10-09T23:30:00+02:00", nu), "gisteren");
assert.equal(geleden(terug(3), nu), "3 dagen geleden");
assert.equal(geleden(terug(13), nu), "13 dagen geleden");
assert.equal(geleden(terug(14), nu), "2 weken geleden");
assert.equal(geleden(terug(45), nu), "6 weken geleden");
assert.equal(geleden(terug(90), nu), "3 maanden geleden");
assert.equal(geleden(terug(400), nu), "1 jaar geleden");
assert.equal(dagenSinds(null, nu), null);
assert.equal(dagenSinds(terug(45), nu), 45);

// Zonder de Clerk- en databasekant te laden: de bron zegt wat er geteld wordt
const bron = await readFile("lib/klant-activiteit.ts", "utf8");
assert.ok(bron.includes('eq(messages.rol, "klant")') && bron.includes("ne(messages.clerkUserId, beheerderId)"), "laatste chat telt de berichten van de beheerder of de AI mee");
assert.ok(bron.includes("Math.max(u.lastSignInAt ?? 0, u.lastActiveAt ?? 0)"), "laatst in het portaal kijkt alleen naar inloggen, niet naar laatst actief");
const pagina = await readFile("app/admin/page.tsx", "utf8");
assert.ok(pagina.includes("laatsteChatPerSite(admin.id)") && pagina.includes("laatstInPortaal("), "de klantenlijst haalt de activiteit niet op");

console.log("geleden: ok");
