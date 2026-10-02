/**
 * "Kijk zelf" op Vakbeursonline (02-10), drie fouten in één beurt:
 * 1. De schermafbeelding toonde lege vakken waar foto's hoorden: Cloudflare
 *    tekent foto's met loading=lazy / decoding=async buiten het eerste scherm
 *    niet bij een opname van de hele pagina (onze nabewerking zet die op
 *    bijna elke foto). De AI "repareerde" toen foto's die niets mankeerden.
 * 2. De AI keek niet naar de klacht uit het gesprek (knop nog oranje), maar
 *    zocht zelf iets anders om te repareren.
 * 3. Een groene knopregel stond vóór de algemene oranje regel en verloor dus,
 *    terwijl de AI stellig zei "de knop is al groen".
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { htmlVoorOpname } from "../lib/schermafbeelding";

// 1. Het echte pad: de HTML voor de opname
const voor = `<html><head lang="nl"><title>x</title></head><body>
<img src="/afbeeldingen/held.webp" alt="held">
<img loading="lazy" decoding="async" src="/afbeeldingen/vrouw.webp" alt="vrouw">
<img src="/afbeeldingen/b.webp" decoding='async' loading='lazy' alt="b">
<iframe loading="lazy" src="https://x"></iframe></body></html>`;
const na = htmlVoorOpname(voor, "https://wv-voorbeeld.wordswap.workers.dev/contact/?x=1#a");
assert.ok(!/loading=["']lazy["']/.test(na.replace(/<iframe[^>]*>/g, "")), "er staat nog lui laden op een foto");
assert.ok(!/decoding=["']async["']/.test(na), "er staat nog 'later uitpakken' op een foto");
assert.ok(na.includes('<head lang="nl"><base href="https://wv-voorbeeld.wordswap.workers.dev/contact/">'), "de <base> ontbreekt of bevat nog query/hash, dan breken /afbeeldingen/-verwijzingen");
assert.ok(na.includes('src="/afbeeldingen/vrouw.webp"'), "de fotoverwijzing zelf is aangetast");
assert.equal((na.match(/<img/g) ?? []).length, 3, "er zijn foto's verdwenen");

// ... en die HTML gaat ook echt naar de opnamedienst (met terugval op de url)
const lib = await readFile("lib/schermafbeelding.ts", "utf8");
assert.ok(/bron = \{ html: htmlVoorOpname\(await pagina\.text\(\), url\) \}/.test(lib), "de opname gebruikt de voorbereide HTML niet");
assert.ok(/let bron: \{ html: string \} \| \{ url: string \} = \{ url \};/.test(lib), "zonder terugval op de url mislukt de opname als ophalen faalt");
assert.ok(/\.\.\.bron,\s*viewport:/.test(lib), "de bron (html of url) gaat niet mee naar de opnamedienst");

// 2. "Kijk zelf" begint bij de klacht en repareert niet ongevraagd andere dingen
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(/BEGIN BIJ DE KLACHT: lees in het recente gesprek/.test(route), "'Kijk zelf' begint niet bij de laatste klacht uit het gesprek");
assert.ok(/pas dat dan NIET aan: noem het in één zin en vraag of het moet/.test(route), "'Kijk zelf' mag nog ongevraagd andere dingen repareren");
assert.ok(/hernoem of vervang nooit een foto alleen omdat hij op de schermafbeelding leeg lijkt/.test(route), "de regel over lege fotovakken ontbreekt");

// 3. Huisregel: een nieuwe CSS-regel moet ook winnen, en nooit "het is al groen" zonder controle
const h = await readFile("lib/huisregels.ts", "utf8");
assert.ok(/CSS: EEN NIEUWE REGEL MOET OOK WINNEN/.test(h), "de CSS-huisregel ontbreekt");
assert.ok(/zet hem in het stylesheet ná de algemene regel die hij overschrijft/.test(h), "de volgorde-uitleg ontbreekt");
assert.ok(/Zeg nooit "de knop is al groen"/.test(h), "de regel tegen stellige beweringen zonder controle ontbreekt");
assert.ok(!/MOET OOK WINNEN[^\n]*—/.test(h), "lang streepje in de nieuwe huisregel");

console.log("kijk-zelf: foto's zichtbaar op de opname, klacht eerst, CSS-regel moet winnen");
