/**
 * "Overal doorvoeren" mechanisch: vondsten van het vangnet letterlijk
 * toepassen, tolerant voor de HTML-varianten die de normalisatie gelijktrekt
 * (&nbsp;, regelovergangen, krullende aanhalingstekens). Aanleiding 19-09:
 * de AI "controleerde" na een prijswijziging en beweerde dat € 64 nergens
 * meer stond, terwijl hij twee keer op de homepage stond.
 */
import { mkdtemp, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { tolerantPatroon, voerVondstenDoor } from "../lib/doorvoeren";
import { dubbelingsRapport } from "../lib/consistentie";

// 1. Het tolerante patroon vindt de echte HTML-varianten van een
//    genormaliseerd fragment — en matcht niet over tags heen.
assert.ok(tolerantPatroon("€ 64 per les").test("<small>€ 64 per les</small>"), "platte tekst niet gevonden");
assert.ok(tolerantPatroon("€ 64 per les").test("€&nbsp;64 per\n  les"), "&nbsp;/regelovergang niet gevonden");
assert.ok(tolerantPatroon("zo'n mooie 'aanbieding'").test("zo’n mooie ‘aanbieding’"), "krullende aanhalingstekens niet gevonden");
assert.ok(!tolerantPatroon("€ 64 per les").test("€ 64 <b>per</b> les"), "hoort niet over tags heen te matchen");

// 2. Doorvoeren op echte bestanden: twee plekken in één bestand, één in een
//    tweede bestand, en een eerlijke rest voor een vondst zonder 'nieuw'.
const map = await mkdtemp(path.join(tmpdir(), "doorvoer-"));
await mkdir(path.join(map, "lessen"), { recursive: true });
await writeFile(
  path.join(map, "index.html"),
  `<p><small>€&nbsp;64 per les</small></p><span class="prijs">€ 64 per les</span>`,
);
await writeFile(path.join(map, "lessen/tarieven.html"), `<li>€ 64 per les</li>`);
const uitkomst = await voerVondstenDoor(map, [
  { soort: "tekst", oud: "€ 64 per les", nieuw: "€ 70 per les", paden: ["index.html", "lessen/tarieven.html"] },
  { soort: "beeld", oud: "afbeeldingen/oud.webp", nieuw: null, paden: ["index.html"] },
]);
assert.equal(uitkomst.gedaan.length, 2, "verwacht 2 gelukte bestanden");
assert.equal(uitkomst.gedaan.find((g) => g.pad === "index.html")?.keer, 2, "beide plekken op index vervangen");
assert.equal(uitkomst.rest.length, 1, "vondst zonder nieuw hoort eerlijk in de rest");
assert.equal(uitkomst.rest[0].reden, "geen-nieuw");
const na = await readFile(path.join(map, "index.html"), "utf8");
assert.ok(!/64/.test(na) && na.split("€ 70 per les").length === 3, "index.html niet volledig doorgevoerd");

// 3. Het vangnet levert de vondsten gepaard aan (oud → nieuw), zodat het
//    doorvoeren überhaupt mechanisch kán. Nagespeeld: prijs gewijzigd op de
//    automaatpagina, homepage heeft de oude prijs nog.
const site = await mkdtemp(path.join(tmpdir(), "vangnet-"));
const oudBlok = `<p>Automaatles bij ons kost gewoon een vaste prijs.</p><p>€ 64 per les</p>`;
await writeFile(path.join(site, "automaat.html"), `<p>Automaatles bij ons kost gewoon een vaste prijs.</p><p>€ 70 per les</p>`);
await writeFile(path.join(site, "index.html"), `<main><span>€ 64 per les</span></main>`);
const rapport = await dubbelingsRapport({
  werkmap: site,
  gewijzigd: ["automaat.html"],
  oudeInhoud: async (p) => (p === "automaat.html" ? oudBlok : null),
});
const vondst = rapport.vondsten.find((v) => v.oud.includes("64"));
assert.ok(vondst, "vangnet vond de achtergebleven prijs niet");
assert.equal(vondst!.nieuw, "€ 70 per les", "vangnet paart oud niet aan nieuw");
assert.ok(vondst!.paden.includes("index.html"), "vangnet noemt de homepage niet");

// 4. En de keten sluit: die vondst is direct mechanisch door te voeren.
const keten = await voerVondstenDoor(site, rapport.vondsten.filter((v) => v.nieuw));
assert.ok(keten.gedaan.some((g) => g.pad === "index.html"), "vondst uit het vangnet niet doorgevoerd");
assert.ok(!(await readFile(path.join(site, "index.html"), "utf8")).includes("64"), "oude prijs staat er nog");

// 5. Route-bedrading: het doorvoer-pad bestaat, slaat vondsten op bij het
//    concept en ruimt ze op bij "alleen hier".
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(route.includes('bericht.trim() === "Overal doorvoeren"'), "route mist het doorvoer-pad");
assert.ok(route.includes("voerVondstenDoor(werkmap, vondsten)"), "route voert vondsten niet mechanisch door");
assert.ok(/vangnetVondsten: meldingen\.length \? vondsten : null/.test(route), "route bewaart vondsten niet bij het concept");
assert.ok(/onderdrukt door alleen-hier[\s\S]{0,400}vangnetVondsten: null/.test(route), "alleen-hier ruimt oude vondsten niet op");

console.log("doorvoeren: patroon, bestanden, vangnet-paring en route-bedrading kloppen");
