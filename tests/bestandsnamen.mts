/** Bestandsnamen bij elke upload (Jos, 02-10-2026): bij foto, video, audio en
 * pdf, zowel in de banken als bij de gewone upload in de chat, kies je eerst
 * de naam. De automatische naam is altijd netjes (kleine letters, streepje
 * voor elke spatie of elk vreemd teken, accenten weg, geen tijdstempel of
 * willekeurige code). En geen enkele upload overschrijft een bestaand bestand.
 * Draaien: node --import tsx tests/bestandsnamen.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { naamZonderOpslagRuis, schoneNaamDelen, vrijeNaam } from "../lib/bestandsnaam";
import { kiesVideoNaam } from "../lib/media";

// 1. De automatische naam is altijd netjes
const stam = (n: string) => schoneNaamDelen(n, "x").stam;
assert.equal(stam("IMG 2041.JPG"), "img-2041");
assert.equal(stam("Één  Twee__Drie!!.png"), "een-twee-drie");
assert.equal(stam("Café de Paris (zomer).jpeg"), "cafe-de-paris-zomer");
assert.equal(stam("foto.van.het.kantoor.png"), "foto-van-het-kantoor");
assert.deepEqual(schoneNaamDelen("---.png", "foto"), { stam: "foto", ext: ".png" }, "alleen tekens wordt de standaardnaam, met extensie");
assert.deepEqual(schoneNaamDelen("verslag.", "document"), { stam: "verslag", ext: "" });
assert.equal(stam(`${"a".repeat(79)} b.png`), "a".repeat(79), "na het inkorten geen streepje aan het eind");

// 2. Tijdstempel en code van de opslag komen niet in de naam
assert.equal(naamZonderOpslagRuis("chat/1727981234567-team-foto-AbCdEfGhIjKlMnOpQrSt.jpg"), "team-foto.jpg");
assert.equal(naamZonderOpslagRuis("team-foto-2024.jpg"), "team-foto-2024.jpg", "een gewoon jaartal blijft staan");
assert.equal(stam(naamZonderOpslagRuis("bank/1727981234567-IMG 2041.JPG")), "img-2041");

// 3. Video: code eraf, herhaling herkennen, anders -2
const vrij = (s: string, e: string, b: Set<string>) => vrijeNaam(s, e, b);
assert.deepEqual(kiesVideoNaam("rondleiding-v1a2b3c4.mp4", [], 1000, vrij), { naam: "rondleiding.mp4", nieuw: true });
assert.deepEqual(kiesVideoNaam("rondleiding-v1a2b3c4.mp4", [{ naam: "rondleiding.mp4", bytes: 1000 }], 1000, vrij), { naam: "rondleiding.mp4", nieuw: false }, "dezelfde video twee keer opslaan geeft geen dubbele");
assert.deepEqual(kiesVideoNaam("rondleiding-v9z8y7x6.mp4", [{ naam: "rondleiding.mp4", bytes: 1000 }], 2222, vrij), { naam: "rondleiding-2.mp4", nieuw: true }, "een andere video met dezelfde naam overschrijft niets");
assert.deepEqual(kiesVideoNaam("rondleiding-v9z8y7x6.mp4", [{ naam: "rondleiding.mp4", bytes: 1000 }, { naam: "rondleiding-2.mp4", bytes: 2222 }], 2222, vrij), { naam: "rondleiding-2.mp4", nieuw: false });

// 4. Server: chat maakt nette namen en overschrijft nooit een bestaande foto
const chatRoute = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(chatRoute.includes("schoneNaamDelen(naamZonderOpslagRuis(bestandsnaam)"), "de chat maakt de fotonaam niet met dezelfde regels");
assert.ok(chatRoute.includes("if (!existsSync(path.join(wm, foto.naam))) continue;") && chatRoute.includes("foto.naam = nieuw;"), "de chat kan een bestaande foto overschrijven");
assert.ok(chatRoute.includes("bewaarVideoZonderDubbel(site.siteSlug, ruweNaam"), "de chat bewaart video niet via de gedeelde naamgeving");
assert.ok((await readFile("app/api/videobank/route.ts", "utf8")).includes("bewaarVideoZonderDubbel(site.siteSlug, ruw, data)"), "de videobank gebruikt de gedeelde naamgeving niet");
assert.ok((await readFile("app/api/video-upload/route.ts", "utf8")).includes("schoneNaamDelen("), "video-upload maakt de naam niet met dezelfde regels");

// 5. Naam kiezen: in de chat (paperclip en slepen) en in alle vier de banken
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(chat.includes("vraagNamen(gekozen, (alles) => {"), "de paperclip vraagt geen naam");
assert.ok(chat.includes("vraagNamen(welkom, (alles) => {"), "slepen vraagt geen naam");
assert.ok(chat.includes("verder(lijst.map(({ bestand, naam }) => hernoemd(bestand, naam)));"), "de gekozen naam wordt niet doorgegeven");
for (const bank of ["DocumentBank", "Fotobank", "AudioBank", "VideoBank"])
  assert.ok((await readFile(`app/portal/${bank}.tsx`, "utf8")).includes("<NaamKiezer"), `${bank}: geen naamkiezer`);
console.log("✓ bestandsnamen: netjes, zonder opslagruis, nooit overschrijven, naam kiezen overal");
