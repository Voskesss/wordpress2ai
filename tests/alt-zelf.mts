/**
 * Omschrijving (alt-tekst) van een aangewezen foto zelf aanpassen, zonder AI
 * (wens Jos 02-10). Alleen precies die foto verandert: gezocht op
 * bestandsnaam én huidige omschrijving.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { telFoto, vervangAltTekst, bestandsnaamVan, alsAttribuut } from "../lib/alt-tekst";

const html = `<main>
<img src="/afbeeldingen/vr.webp" alt="Bezoeker met VR-bril op een virtuele vakbeurs" width="300">
<img loading="lazy" src="/afbeeldingen/vr.webp" alt="Andere omschrijving">
<img src="/afbeeldingen/vrouw.webp" alt="Bezoeker met VR-bril op een virtuele vakbeurs">
<img src="/afbeeldingen/zonder.webp">
<img src='/afbeeldingen/q.webp' alt='Q &amp; A'>
</main>`;

// 1. Alleen de aangewezen foto (zelfde bestand + zelfde huidige omschrijving)
assert.equal(telFoto(html, "https://wv-x.wordswap.workers.dev/afbeeldingen/vr.webp?v=2", "Bezoeker met VR-bril op een virtuele vakbeurs"), 1);
{
  const r = vervangAltTekst(html, "/afbeeldingen/vr.webp", "Bezoeker met VR-bril op een virtuele vakbeurs", "Man met VR-bril in een virtuele beurshal");
  assert.equal(r.aantal, 1, "precies één foto hoort te veranderen");
  assert.ok(r.html.includes('<img src="/afbeeldingen/vr.webp" alt="Man met VR-bril in een virtuele beurshal" width="300">'), "de omschrijving is niet (goed) vervangen");
  assert.ok(r.html.includes('alt="Andere omschrijving"'), "dezelfde foto met een andere omschrijving is ook aangepast");
  assert.ok(r.html.includes('<img src="/afbeeldingen/vrouw.webp" alt="Bezoeker met VR-bril op een virtuele vakbeurs">'), "een andere foto met dezelfde omschrijving is ook aangepast");
}
// 2. Foto zonder omschrijving krijgt er een
{
  const r = vervangAltTekst(html, "/afbeeldingen/zonder.webp", "", "Logo van de beurs");
  assert.equal(r.aantal, 1);
  assert.ok(r.html.includes('<img alt="Logo van de beurs" src="/afbeeldingen/zonder.webp">'), "een foto zonder alt krijgt geen omschrijving");
}
// 3. Entiteiten en aanhalingstekens: "Q & A" uit de browser vindt 'Q &amp; A' in het bestand,
//    en een " in de nieuwe tekst breekt het attribuut niet
{
  const r = vervangAltTekst(html, "/afbeeldingen/q.webp", "Q & A", 'Vraag "en" antwoord');
  assert.equal(r.aantal, 1, "entiteiten in de bestaande alt worden niet herkend");
  assert.ok(r.html.includes('alt="Vraag &quot;en&quot; antwoord"'), "aanhalingstekens in de nieuwe omschrijving breken het attribuut");
}
assert.equal(bestandsnaamVan("https://x.nl/a/b/foto%20een.webp?x#y"), "foto een.webp");
assert.equal(alsAttribuut('<"&>'), "&lt;&quot;&amp;&gt;");

// 4. Bedrading: route-alt-modus, knop in het aanwijspaneel, portaalkaart
const route = await readFile("app/api/tekst-wijzig/route.ts", "utf8");
assert.ok(/altLib\.telFoto\(inhoud, altVan!, oud\)/.test(route), "de route telt in alt-modus niet via lib/alt-tekst");
assert.ok(/altLib\.vervangAltTekst\(treffer\.inhoud, altVan!, oud, nieuw\)\.html/.test(route), "de route vervangt in alt-modus niet via lib/alt-tekst");
assert.ok(/\(!oud && !altVan\) \|\| !nieuw/.test(route), "een foto zonder omschrijving kan geen omschrijving krijgen");
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/📝 Omschrijving aanpassen/.test(chat), "de knop in het aanwijspaneel ontbreekt");
assert.ok(/setZelfModus\("alt"\);/.test(chat), "de knop zet de alt-stand niet");
assert.ok(/body: JSON\.stringify\(\{ siteId, oud, nieuw, pad: selectie\.pad, altVan \}\)/.test(chat), "de src gaat niet mee naar de route");
const kaart = await readFile("lib/portaal-kaart.ts", "utf8");
assert.ok(/\["Omschrijving aanpassen", "Chat\.tsx"\]/.test(kaart), "de portaalkaart kent de nieuwe knop niet");

console.log("alt-zelf: alleen de aangewezen foto, lege alt mag, entiteiten veilig, bedrading compleet");
