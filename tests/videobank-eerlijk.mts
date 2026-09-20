/**
 * De videobank mag nooit meer stil liegen (20-09: de bank-POST faalde, de
 * chat zei tóch "staat in je videobank", en de video liftte als chip mee met
 * een pdf-vraag). Vier vangrails:
 * 1. De portaalkant kijkt naar het antwoord van de bank en herkanst.
 * 2. Lukt de bank, dan GEEN chip aan het volgende bericht; lukt hij niet,
 *    dan juist wél (vangnet) — met een eerlijke melding.
 * 3. De poster-push kan de bankactie (en de berichten) niet meer meesleuren.
 * 4. Het voorbeeldvenster kent /video/ uit de media-opslag, en de AI krijgt
 *    de videobank-paden aangereikt zodat "zet deze video op X" zonder chip werkt.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const chat = await readFile("app/portal/Chat.tsx", "utf8");

// 1. Herkansing én het antwoord echt lezen
const klaarBlok = chat.slice(chat.indexOf("let inBank = false"), chat.indexOf("if (vervang) {"));
assert.ok(klaarBlok.length > 100, "het inBank-blok in volgVideo ontbreekt");
assert.ok(/poging < 4/.test(klaarBlok), "de bank-POST krijgt geen herkansingen meer");
assert.ok(/inBank = Boolean\(r\?\.ok\)/.test(klaarBlok), "het antwoord van de videobank wordt genegeerd");

// 2. Chip alleen als vangnet bij een mislukte bankactie
const succesBlok = chat.slice(chat.indexOf("if (inBank) {"), chat.indexOf("setChatOpen(true);", chat.indexOf("if (inBank) {")));
assert.ok(succesBlok.includes("staat in je videobank"), "de succes-melding ontbreekt");
const succesTak = succesBlok.slice(0, succesBlok.indexOf("} else {"));
assert.ok(!succesTak.includes("setVideoKlaar({"), "na een geslaagde bankactie wordt de video tóch als chip aan het volgende bericht gehangen");
const faalTak = succesBlok.slice(succesBlok.indexOf("} else {"));
assert.ok(faalTak.includes("setVideoKlaar({ commandId, naam })"), "bij een mislukte bankactie ontbreekt het chip-vangnet");
assert.ok(/lukte nog niet/.test(faalTak), "bij een mislukte bankactie ontbreekt de eerlijke melding");

// 3. Poster-push is niet meer fataal voor de bankberichten
const bank = await readFile("app/api/videobank/route.ts", "utf8");
const posterStart = bank.indexOf("Poster is mooi meegenomen");
assert.ok(posterStart > 0, "de poster-vangrail-uitleg ontbreekt in de videobank-route");
const posterBlok = bank.slice(posterStart, bank.indexOf("videoUploads", posterStart));
assert.ok(/try \{/.test(posterBlok) && /catch \(e\) \{/.test(posterBlok), "de poster-push staat niet in een eigen try/catch");
assert.ok(
  bank.indexOf("pushBestanden(site.githubRepo, posterBestand") < bank.indexOf("insert(messages)"),
  "de bankberichten staan vóór de poster-push — dan klopt de volgorde-aanname van deze test niet meer, kijk even mee",
);

// 4a. Voorbeeldvenster: /video/ valt terug op de werkversie-worker
const weergave = await readFile("app/site-weergave/[siteId]/[[...pad]]/route.ts", "utf8");
assert.ok(
  /!gevonden && pad\.startsWith\("video\/"\) && site\.siteSlug/.test(weergave),
  "site-weergave kent geen terugval voor /video/ uit de media-opslag — een geplaatste video is dan een 404 in het voorbeeld",
);
assert.ok(
  weergave.indexOf('pad.startsWith("video/")') > weergave.indexOf("vindSiteBestand"),
  "de video-terugval zit vóór de repo-check: oude sites met video's in de repo zouden dan omgeleid worden",
);

// 4b. De AI krijgt de videobank situationeel aangereikt
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(/let videoBank: string\[\] \| null = null/.test(route), "de situationele videobank-lijst ontbreekt in de chatroute");
assert.ok(/recentOverVideo/.test(route), "de videobank triggert niet op het recente gesprek");
assert.ok(/VIDEOBANK van deze site/.test(route), "de VIDEOBANK-contextregel voor de AI ontbreekt");
assert.ok(/lijstMediaVideo/.test(route), "de chatroute haalt de media-video's niet op");

console.log("videobank-eerlijk: bankmelding is eerlijk, chip alleen als vangnet, voorbeeld en AI kennen /video/");
