/**
 * Videobank: video's van de site terugzien, opnieuw plaatsen en opruimen.
 * Video's leven in de siterepo (anders dan audio, dat in de media-map staat),
 * dus opruimen betekent hier: uit main én de conceptbranch halen — met
 * dezelfde bescherming als de andere banken (nooit iets dat nog gebruikt
 * wordt) en inclusief het bijbehorende voorbeeldplaatje.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const route = await readFile("app/api/videobank/route.ts", "utf8");
const ui = await readFile("app/portal/VideoBank.tsx", "utf8");
const chat = await readFile("app/portal/Chat.tsx", "utf8");

// 1. Zelfde bescherming als de foto- en audiobank
assert.ok(/export async function DELETE/.test(route), "videobank mist een verwijderroute");
assert.ok(
  /openConcept\?\.branch \? \[openConcept\.branch, undefined\] : \[undefined\]/.test(route),
  "videobank controleert niet zowel het concept als de gepubliceerde versie",
);
assert.ok(route.includes("staat nog op je website"), "geen nette weigering bij een video die nog gebruikt wordt");
assert.ok(
  /for \(const tak of openConcept\?\.branch \? \["main", openConcept\.branch\] : \["main"\]\)/.test(route),
  "videobank verwijdert niet uit main én de conceptbranch",
);
assert.ok(/In de demo kun je niets verwijderen/.test(route), "demo-slot ontbreekt");

// 2. De poster hoort bij de video en gaat mee — anders blijft er een los
//    voorbeeldplaatje achter dat niemand nog kan plaatsen.
assert.ok(/const teWissen = poster \? \[pad, poster\] : \[pad\]/.test(route), "poster gaat niet mee bij het opruimen");

// 3. Opruimen wordt alleen aangeboden bij video's die niet in gebruik zijn
assert.ok(/\{!v\.inGebruik &&/.test(ui), "opruimknop wordt ook bij video's op de site getoond");

// 4. Voorbeeld en poster komen uit dezelfde bron als de lijst (de bestanden
//    van de site), niet van de gepubliceerde site — een net geüploade video
//    staat daar namelijk nog niet.
assert.ok(/site-weergave\/\$\{previewAccess\}/.test(ui), "videobank laadt voorbeelden niet via /site-weergave");

// 5. Bereikbaar via het paperclip-menu
assert.ok(chat.includes("Videobank") && /setVideoBankOpen\(true\)/.test(chat), "videobank zit niet in het bijlagemenu");

console.log("videobank: in-gebruik-slot, poster mee, voorbeeld via site-weergave en bereikbaar via het menu");

// 6. Nieuwe video's staan in de media-opslag, niet in de siterepo: anders
//    haalt élke chatbeurt ze opnieuw op met de rest van de site (20-09).
//    Oudere video's staan er nog wél in, dus de worker kijkt eerst in de site
//    en valt daarna terug op de media-map.
const media = await readFile("lib/media.ts", "utf8");
const worker = await readFile("lib/worker-r2.ts", "utf8");
assert.ok(/export async function bewaarMediaVideo/.test(media), "video kan niet in de media-opslag");
assert.ok(/pad\.startsWith\("\/video\/"\)/.test(worker), "de worker kent geen terugval naar de media-map voor video");
assert.ok(Number(worker.match(/R2_SCRIPT_VERSIE = "(\d+)"/)?.[1]) >= 6, "scriptversie niet opgehoogd: bestaande sites krijgen de terugval nooit");
assert.ok(/lijstMediaVideo/.test(route), "de bank toont de video's uit de media-opslag niet");
