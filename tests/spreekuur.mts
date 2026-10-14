/**
 * Avondspreekuur (14-10-2026): vanaf 1 november belt Jos alleen op maandag,
 * woensdag en vrijdag van 17:00 tot 20:00. De site mag dus nergens meer
 * "binnen één werkdag" of "je krijgt Jos aan de lijn" beloven, en het
 * contactformulier mag geen ochtend of middag als belmoment aanbieden.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SPREEKUUR, REACTIETERMIJN } from "../lib/contactgegevens";

const NIET_OPENBAAR = ["app/admin", "app/portal", "app/api"];
function bestanden(map: string): string[] {
  return readdirSync(map).flatMap((n) => {
    const pad = join(map, n);
    if (NIET_OPENBAAR.some((x) => pad.startsWith(x))) return [];
    return statSync(pad).isDirectory() ? bestanden(pad) : /\.tsx?$/.test(n) ? [pad] : [];
  });
}

const fout: string[] = [];
for (const f of [...bestanden("app"), "lib/aanbod.ts", "lib/seo-paginas.ts", "lib/webinar-reeks.ts"]) {
  const s = readFileSync(f, "utf8");
  if (/binnen (één|een|1)\s+werkdag/i.test(s)) fout.push(`${f}: belooft nog "binnen één werkdag"`);
  if (/aan de lijn/i.test(s)) fout.push(`${f}: belooft nog dat je Jos direct aan de lijn krijgt`);
}
assert.deepEqual(fout, [], fout.join("\n"));

const contact = readFileSync("app/contact/page.tsx", "utf8");
assert.ok(contact.includes("SPREEKUUR"), "de contactpagina noemt het avondspreekuur niet");
const voorkeur = readFileSync("app/contact/ContactVoorkeur.tsx", "utf8");
assert.ok(!/"ochtend"|"middag"/.test(voorkeur), "het formulier biedt nog ochtend of middag als belmoment aan");
const layout = readFileSync("app/layout.tsx", "utf8");
assert.ok(layout.includes("hoursAvailable") && layout.includes("SPREEKUUR.kort"), "spreekuur ontbreekt in de footer of de bedrijfsgegevens voor Google");
assert.deepEqual([...SPREEKUUR.schemaDagen], ["Monday", "Wednesday", "Friday"]);
assert.equal(REACTIETERMIJN, "binnen twee werkdagen");

console.log("spreekuur: ok");
