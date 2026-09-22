import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * De demo is uitgekleed, en de harde eis daarbij was: dit mag de klantchat op
 * geen enkele manier raken. Daarom staat alles wat weggaat achter `isDemo` in
 * het scherm (weglaten, niet omschakelen), zit publiceren ook aan de
 * serverkant dicht, en bewaakt deze test dat het zo blijft.
 *
 * Publiceren blijft in de demo een echt moment: de status gaat om en de badge
 * slaat om. Wat verdween is de tweede worker (wvl-...) die per bezoeker werd
 * uitgerold terwijl hij zijn wijziging al in het voorbeeld zag staan.
 */

const publiceer = await readFile(new URL("../app/api/publiceer/route.ts", import.meta.url), "utf8");
const chat = await readFile(new URL("../app/portal/Chat.tsx", import.meta.url), "utf8");
const portaal = await readFile(new URL("../app/portal/page.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");

// 1. Geen tweede worker meer in de demo, nergens: niet bij publiceren, niet
//    bij ongedaan maken, en niet in het portaal
const ongedaan = await readFile(new URL("../app/api/ongedaan/route.ts", import.meta.url), "utf8");
for (const [bestand, inhoud] of [["publiceer", publiceer], ["portaal", portaal], ["ongedaan", ongedaan]] as const) {
  assert.ok(!inhoud.includes("demoLiveWorker"), `${bestand} rolt nog een tweede demo-worker uit`);
}
// De naam blijft wel bestaan, zodat achtergebleven workers opgeruimd worden
const cloudflare = await readFile(new URL("../lib/cloudflare.ts", import.meta.url), "utf8");
assert.ok(cloudflare.includes("`wvl-${repo}-`"), "achtergebleven wvl-workers worden niet meer opgeruimd");

// 2. Maar publiceren blijft wél iets doen: de status gaat om
assert.ok(publiceer.includes('.set({ status: "gepubliceerd" })'), "publiceren legt niets meer vast");

// 3. En een klantsite wordt nog gewoon uitgerold
const publiceerBlok = publiceer.slice(publiceer.indexOf("if (rij.site.isDemo) {"), publiceer.indexOf("status: \"gepubliceerd\""));
assert.ok(publiceerBlok.includes("} else {"), "de klant-tak is verdwenen");
assert.ok(publiceerBlok.includes("siteSlug"), "een klantsite wordt niet meer uitgerold");

// 4. Schermdelen die weg zijn, zijn wéggelaten (niet omgeschakeld), zodat een
//    klant precies dezelfde code houdt
assert.ok(chat.includes("{liveUrl && !isDemo && ("), "de demo toont nog een link naar de live site");
assert.ok(chat.includes("{!isDemo && (<>\n              <Tip tekst=\"Titel, Google-omschrijving"), "de SEO-knop staat nog in de demo");

// 5. En de banken zaten er al niet in; dat blijft zo
for (const bank of ["Videobank", "Audiobank", "Documentenbank"]) {
  // Elke bank moet ná de opening van het !isDemo-blok staan en ervóór afgesloten
  const opening = chat.indexOf("{!isDemo && (\n                        <>");
  assert.ok(opening > 0, "het !isDemo-blok in het bijlagemenu is verdwenen");
  const sluiting = chat.indexOf("</>\n                      )}", opening);
  const plek = chat.indexOf(`>${bank}</span>`);
  assert.ok(plek > opening && plek < sluiting, `${bank} staat buiten het !isDemo-blok en is dus zichtbaar in de demo`);
}

// 6. De demo-AI maakt geen nieuwe pagina's en laat het menu met rust
const regels = route.slice(route.indexOf("const DEMO_REGELS"), route.indexOf("function systeemPrompt"));
assert.ok(/GEEN NIEUWE PAGINA/i.test(regels), "de demo mag nog nieuwe pagina's maken");
assert.ok(/menu niet/i.test(regels), "de demo mag het menu nog verbouwen");
// en die regels gelden alleen daar
assert.ok(route.includes("${isDemo ? DEMO_REGELS : \"\"}"), "de demo-regels lekken naar klantsites");

console.log("demo-slank: ok");
