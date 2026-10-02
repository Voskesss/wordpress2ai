import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Een geplaatste aankondiging moet je kunnen aanpassen (Jos, 02-10-2026: een
 * tekst kwam afgekapt binnen en kon alleen nog weg). Bewerken past titel,
 * tekst en link aan op dezelfde rij, zodat het wegklikken van klanten blijft.
 */
const pagina = await readFile(new URL("../app/admin/aankondigingen/page.tsx", import.meta.url), "utf8");
const acties = await readFile(new URL("../app/admin/acties.ts", import.meta.url), "utf8");

assert.ok(pagina.includes("action={aankondigingBewerken}"), "er is geen bewerkformulier per aankondiging");
for (const veld of ["defaultValue={a.titel}", "defaultValue={a.tekst}", 'defaultValue={a.link ?? ""}'])
  assert.ok(pagina.includes(veld), `het bewerkformulier vult ${veld} niet voor`);

const i = acties.indexOf("export async function aankondigingBewerken");
assert.ok(i >= 0, "de actie aankondigingBewerken bestaat niet");
const body = acties.slice(i, acties.indexOf("\n}\n", i));
assert.ok(body.includes("await requireAdmin()"), "bewerken is niet afgeschermd voor de beheerder");
assert.ok(body.includes("db.update(aankondigingen)"), "bewerken maakt geen update op dezelfde rij");
assert.ok(!body.includes("aankondigingenGezien"), "bewerken raakt het wegklikken van klanten aan");

console.log("aankondiging-bewerken: ok");
