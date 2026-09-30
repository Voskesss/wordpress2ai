/**
 * WordPress-kopieën staan tijdelijk klaar (30 dagen), met één herinnering een
 * week vooraf, daarna automatisch weg. Kopieën van vóór de invoering tellen
 * vanaf de invoering (die klanten hoorden destijds "altijd").
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { BEWAAR_DAGEN, HERINNER_DAGEN_VOORAF, INGEVOERD_OP, beoordeelKopie, dagenOver, verlooptOp } from "../lib/backups";
import { bouwKopieHerinnering, bouwLiveMail } from "../lib/klant-mails";

const DAG = 86_400_000;
const t0 = new Date("2026-10-05T10:00:00+02:00");
assert.equal(BEWAAR_DAGEN, 30);
// 1. Termijn en beslissing
assert.equal(dagenOver(t0, new Date(t0.getTime() + 10 * DAG)), 20);
assert.equal(beoordeelKopie(t0, false, new Date(t0.getTime() + 10 * DAG)), "bewaren");
assert.equal(beoordeelKopie(t0, false, new Date(t0.getTime() + (BEWAAR_DAGEN - HERINNER_DAGEN_VOORAF) * DAG + 1000)), "herinneren");
assert.equal(beoordeelKopie(t0, true, new Date(t0.getTime() + 25 * DAG)), "bewaren", "een tweede herinnering is spam");
assert.equal(beoordeelKopie(t0, true, new Date(t0.getTime() + 30 * DAG + 1000)), "verwijderen");
assert.equal(beoordeelKopie(t0, false, new Date(t0.getTime() + 31 * DAG)), "verwijderen", "zonder herinnering toch verwijderen als de termijn echt om is");
// 2. Oude kopieën tellen vanaf de invoering, niet met terugwerkende kracht
const oud = new Date("2026-09-15T12:00:00+02:00");
assert.equal(verlooptOp(oud).getTime(), INGEVOERD_OP.getTime() + BEWAAR_DAGEN * DAG, "een kopie van vóór de invoering zou meteen verwijderd worden");
assert.equal(beoordeelKopie(oud, false, new Date("2026-10-01T00:00:00+02:00")), "bewaren");
// 3. Mails: termijn genoemd, geen lange streepjes, wachtwoord of link naar het bestand zelf
const h = bouwKopieHerinnering({ naam: "Roelie Reiling", bestandsnaam: "kopie.zip", verlooptOp: verlooptOp(oud) });
assert.ok(h.onderwerp.includes("oktober") && h.html.includes("Hoi Roelie,") && h.html.includes("Je website en gegevens meenemen"), "herinnering mist datum, naam of vindplaats");
assert.ok(!/[—–]/.test(h.html));
const live = bouwLiveMail({ siteNaam: "X", naam: "A", adres: "klant.nl", kopieTot: verlooptOp(t0) });
assert.ok(live.html.includes("staat tot <strong>4 november</strong>"), "de livemail noemt de einddatum van de kopie niet: " + (live.html.match(/staat tot <strong>[^<]*<\/strong>/) ?? "")[0]);
assert.ok(!bouwLiveMail({ siteNaam: "X", naam: "A", adres: "klant.nl" }).html.includes("Je oude WordPress-site"), "zonder kopie toch een kopie-alinea");
// 4. De uploadmail zegt het meteen, portaal en admin tonen de datum, de cron ruimt op
const upload = await readFile("app/api/admin/backup-upload/route.ts", "utf8");
assert.ok(upload.includes("${BEWAAR_DAGEN} dagen") && upload.includes("verlooptOp(new Date())"), "de uploadmail noemt de termijn niet");
assert.ok(!upload.includes("altijd zelf downloaden"), "de uploadmail belooft nog steeds 'altijd'");
assert.ok((await readFile("app/portal/MeenemenBlok.tsx", "utf8")).includes("staat klaar tot {datumNl(verlooptOp(b.aangemaakt))}"), "het portaal toont de einddatum niet");
assert.ok((await readFile("app/admin/klant/[id]/BackupUpload.tsx", "utf8")).includes("daarna automatisch weg"), "de admin toont de einddatum niet");
const gez = await readFile("lib/gezondheid.ts", "utf8");
assert.ok(gez.includes('meet("wp-kopieen"') && gez.includes("onderhoudKopieen()"), "de dagelijkse cron ruimt niet op");
const lib = await readFile("lib/backups.ts", "utf8");
assert.ok(lib.includes("await del(rij.url, { token })") && lib.includes("db.delete(wpBackups)"), "verwijderen haalt niet zowel het bestand als de rij weg");
console.log("wp-kopie-termijn: ok");
