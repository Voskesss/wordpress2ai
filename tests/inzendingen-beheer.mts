/** Berichten via formulieren: overzicht over de volle breedte in portaal en
 * admin, met filter per formulier, zoeken, uitklappen en bulk-acties. De
 * samenvatting per rij (van wie, waar gaat het over) komt uit lib/inzendingen.
 * Draaien: node --import tsx tests/inzendingen-beheer.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afzenderVan, filterInzendingen, kernVan, tellingPerFormulier } from "../lib/inzendingen";

// 1. Samenvatting per rij
const v1 = { Naam: "Sanne de Vries", "E-mail": "sanne@voorbeeld.nl", Bericht: "Ik wil graag een gesprek over co-ouderschap.\nWanneer kan dat?" };
assert.equal(afzenderVan(v1), "Sanne de Vries <sanne@voorbeeld.nl>");
assert.equal(kernVan(v1), "Ik wil graag een gesprek over co-ouderschap. Wanneer kan dat?");
const v2 = { telefoon: "0612345678", wens: "bellen" };
assert.equal(afzenderVan(v2), "0612345678", "zonder naam of mail telt het eerste korte veld");
assert.equal(kernVan(v2), "bellen");
assert.equal(kernVan({ naam: "A", vraag: "x".repeat(200) }).length, 140, "de kern wordt afgekapt");
assert.equal(afzenderVan({}), "");

// 2. Filteren en tellen
const rijen = [
  { formulier: "vraag", velden: v1 },
  { formulier: "contact", velden: v2 },
  { formulier: "vraag", velden: { naam: "Piet", bericht: "alimentatie" } },
];
assert.equal(filterInzendingen(rijen, { formulier: "vraag" }).length, 2);
assert.equal(filterInzendingen(rijen, { zoek: "ALIMENT" }).length, 1, "zoeken is hoofdletterongevoelig");
assert.equal(filterInzendingen(rijen, { zoek: "sanne", formulier: "contact" }).length, 0);
assert.deepEqual(tellingPerFormulier(rijen), [["vraag", 2], ["contact", 1]]);

// 3. Het blok staat over de volle breedte en gebruikt de nieuwe lijst
const se = await readFile("app/portal/SiteExtra.tsx", "utf8");
assert.ok(!/data-site-extra className="[^"]*grid-cols-2/.test(se), "het berichtenblok zit nog in een halve kolom");
assert.ok(se.includes("<InzendingenLijst siteId={siteId} rijen={rijen} />"), "SiteExtra gebruikt de berichtenlijst niet");
assert.ok(se.includes("aangemaakt: i.aangemaakt.toISOString()"), "datums gaan niet als ISO naar de client");
const admin = await readFile("app/admin/klant/[id]/page.tsx", "utf8");
assert.ok(admin.includes("<SiteExtra"), "de admin toont niet hetzelfde blok als de klant");

// 4. De lijst kan filteren, zoeken, uitklappen en in bulk werken
const lijst = await readFile("app/portal/InzendingenLijst.tsx", "utf8");
for (const eis of ['type="search"', "router.refresh()", "useTransition", "tellingPerFormulier", 'actie="terug"', 'actie="archiveer"', 'actie="verwijder"', 'name={typeof id === "number" ? "id" : "ids"}', "aria-expanded"])
  assert.ok(lijst.includes(eis), `lijst mist: ${eis}`);

// 5. De serveractie neemt meerdere ids en blijft aan de eigen site gebonden
const acties = await readFile("app/portal/acties.ts", "utf8");
const fn = acties.slice(acties.indexOf("export async function inzendingVerwerken"));
const eind = fn.indexOf("\nexport ");
assert.ok(fn.slice(0, eind).includes('formData.get("ids")'), "bulk-ids worden niet gelezen");
assert.ok(fn.slice(0, eind).includes("inArray(formulierInzendingen.id, ids), eq(formulierInzendingen.siteRepo, site.githubRepo)"), "de actie filtert niet op id én site");
console.log("✓ berichtenbeheer: samenvatting, filter, volle breedte, bulk");
