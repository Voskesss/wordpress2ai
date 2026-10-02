/** Alle vier de banken (documenten, foto's, video, audio) werken hetzelfde:
 * zelf uploaden in de bank, een vaste link kopiëren als die echt werkt, een
 * waarschuwing dat het openbaar is, en zoeken op naam. Een upload overschrijft
 * nooit een bestaand bestand (anders verandert wat achter een verstuurde link
 * staat). Wens Jos, 01-10-2026, na de documentenbank voor Dirk-Jan.
 * Draaien: node --import tsx tests/banken-link-upload.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { zoekOpNaam } from "../lib/bank-zoeken";
import { schoneNaamDelen, vrijeNaam } from "../lib/document-adres";

// 1. Zoeken: hoofdletters, streepjes en spaties maken niet uit, alleen de bestandsnaam telt
const namen = ["bestanden/boekje-2025.pdf", "afbeeldingen/Kantoor_Lisse.webp", "audio/aflevering-3.mp3", "boekje/oud/x.pdf"];
assert.deepEqual(zoekOpNaam(namen, "boekje 2025", (n) => n), ["bestanden/boekje-2025.pdf"]);
assert.deepEqual(zoekOpNaam(namen, "kantoor lisse", (n) => n), ["afbeeldingen/Kantoor_Lisse.webp"]);
assert.deepEqual(zoekOpNaam(namen, "", (n) => n), namen, "leeg zoeken toont alles");
assert.deepEqual(zoekOpNaam(namen, "oud", (n) => n), [], "de map telt niet mee, alleen de naam");

// 2. Vrije namen, voor elke map
assert.equal(vrijeNaam("aflevering", ".mp3", new Set(["aflevering.mp3"])), "aflevering-2.mp3");
assert.equal(vrijeNaam("kantoor", ".webp", new Set(["afbeeldingen/kantoor.webp"]), (n) => `afbeeldingen/${n}`), "kantoor-2.webp");
assert.deepEqual(schoneNaamDelen("IMG 2041.JPG", "foto"), { stam: "img-2041", ext: ".jpg" });
assert.deepEqual(schoneNaamDelen("foto.van.het.kantoor.png", "foto"), { stam: "foto-van-het-kantoor", ext: ".png" });

// 3. Elke bank: waarschuwing, kopieerknop en zoekveld uit het gedeelde onderdeel
const bank = async (n: string) => readFile(`app/portal/${n}.tsx`, "utf8");
for (const n of ["DocumentBank", "Fotobank", "VideoBank", "AudioBank"]) {
  const b = await bank(n);
  assert.ok(b.includes("<OpenbaarMelding"), `${n}: geen waarschuwing dat het openbaar is`);
  assert.ok(b.includes("<KopieerLink"), `${n}: geen kopieerknop`);
  assert.ok(b.includes("<Zoekveld") && b.includes("zoekOpNaam("), `${n}: geen zoekveld`);
  assert.ok(b.includes("<UploadKnop"), `${n}: geen uploadknop`);
}

// 4. Uploaden: documenten, audio en foto's zelf; video via de verwerking van de chat
const audio = await bank("AudioBank");
assert.ok(audio.includes('handleUploadUrl: "/api/audio-upload"') && audio.includes('fetch("/api/audiobank"'), "audiobank uploadt niet via dezelfde weg als de chat");
const foto = await bank("Fotobank");
assert.ok(foto.includes('handleUploadUrl: "/api/foto-upload"') && foto.includes('fetch("/api/fotobank/upload"'), "fotobank uploadt niet");
assert.ok(foto.includes("{!vervangDoel && magUploaden && ("), "fotobank toont uploaden ook bij het kiezen van een vervanging of in de demo");
const video = await bank("VideoBank");
// sinds 02-10 met de gekozen naam (NaamKiezer) in plaats van het kale bestand
assert.ok(video.includes("onUpload(new File([bestand]") && video.includes("{onUpload && ("), "videobank heeft geen uploadknop");
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(chat.includes("onUpload={isDemo ? undefined : (bestand) => void videoUploaden(bestand)}"), "de videobank gebruikt de videoverwerking van de chat niet");
assert.ok(chat.includes("magUploaden={!isDemo}"), "de fotobank weet niet of uploaden mag");

// 5. Server: adres en live-stand per bestand, nooit overschrijven, direct live
const apiAudio = await readFile("app/api/audiobank/route.ts", "utf8");
assert.ok(apiAudio.includes("links[naam] = { adres, live: adres ? await staatLive(adres) : false }"), "audiobank geeft geen links mee");
assert.ok(apiAudio.includes("const vrij = vrijeNaam(") && apiAudio.includes("bewaarAudio(site.siteSlug, vrij, data)"), "audio-upload overschrijft een bestaande aflevering");
const apiVideo = await readFile("app/api/videobank/route.ts", "utf8");
assert.ok(apiVideo.includes("const adres = documentAdres(site, v.pad);"), "videobank geeft geen links mee");
const apiFoto = await readFile("app/api/fotobank/route.ts", "utf8");
assert.ok(apiFoto.includes("await livePaden(site.siteSlug)") && apiFoto.includes("live: live.has(pad)"), "fotobank weet niet wat live staat");
const fotoUpload = await readFile("app/api/fotobank/upload/route.ts", "utf8");
assert.ok(fotoUpload.includes("vrijeNaam(stam, \".webp\", bestaand"), "foto-upload kiest geen vrije naam");
assert.ok(fotoUpload.includes("await schrijfObject(`${site.siteSlug}/${pad}`, data, \"image/webp\")"), "foto-upload zet de foto niet direct live");
assert.ok(fotoUpload.includes("site.isDemo"), "foto-upload weigert de demo niet");
// Zelfde maat als een foto uit de chat
const chatRoute = await readFile("app/api/chat/route.ts", "utf8");
for (const instelling of ["resize({ width: 1600, withoutEnlargement: true })", "webp({ quality: 78 })"]) {
  assert.ok(chatRoute.includes(instelling) && fotoUpload.includes(instelling.replace(/\s+/g, " ")), `foto uit de bank wijkt af van de chat: ${instelling}`);
}
console.log("✓ banken: uploaden, link kopiëren, openbaar-melding en zoeken in alle vier");
