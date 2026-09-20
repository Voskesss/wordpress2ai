/**
 * Audiobank: podcasts in de media-map in R2, buiten GitHub en buiten de
 * deploy-sync. Bewaakt de naamschoonmaak, de workerroute (live én werkversie
 * lezen dezelfde map) en de bedrading in de chatroute.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { AUDIO_EXTENSIES, schoneAudioNaam } from "../lib/media";
import { R2_SCRIPT_VERSIE, R2_WORKER_SCRIPT } from "../lib/worker-r2";

// 1. Bestandsnamen worden veilig en voorspelbaar
assert.equal(schoneAudioNaam("Aflevering 3 – Café De Zon.MP3"), "aflevering-3-cafe-de-zon.mp3");
assert.equal(schoneAudioNaam("../../geheim/../x.mp3"), "x.mp3", "padklimmen moet eruit gestript");
assert.equal(schoneAudioNaam(".mp3"), "aflevering.mp3", "lege stam krijgt een naam");
assert.ok(!AUDIO_EXTENSIES.test("virus.exe") && !AUDIO_EXTENSIES.test("stiekem.mp3.html"), "alleen echte audio-extensies");
assert.ok(AUDIO_EXTENSIES.test("podcast.m4a") && AUDIO_EXTENSIES.test("intro.WAV"));

// 2. De worker serveert /audio/* uit de gedeelde media-map, en de
//    werkversie (wv-) leest DEZELFDE map als live — anders is een aflevering
//    niet te zien in het voorbeeld of moet hij dubbel opgeslagen.
assert.ok(R2_WORKER_SCRIPT.includes('pad.startsWith("/audio/")'), "workerroute voor /audio/ ontbreekt");
assert.ok(
  R2_WORKER_SCRIPT.includes('"media/" + env.PREFIX.replace(/^wv-/, "")'),
  "wv-voorvoegsel wordt niet gestript: werkversie zou een eigen (lege) media-map lezen",
);
assert.ok(Number(R2_SCRIPT_VERSIE) >= 5, "scriptversie niet opgehoogd: bestaande workers krijgen de route nooit");

// 3. De media-map ligt búíten het site-voorvoegsel dat de deploy-sync beheert
//    (de sync verwijdert alles onder <prefix>/ dat niet uit de repo komt).
const media = await readFile("lib/media.ts", "utf8");
assert.ok(/`media\/\$\{slug\}\/audio\/`/.test(media), "audio hoort onder het aparte top-voorvoegsel media/");

// 4. Chatroute: situationeel audioblok (lijst alleen ophalen als het bericht
//    over audio gaat) en een eerlijk antwoord bij een lege bank.
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(/audio\|podcast\|aflever/.test(route), "situationele audio-herkenning ontbreekt in de route");
assert.ok(route.includes("AUDIOBANK van deze site"), "audiobank-context voor de agent ontbreekt");
assert.ok(route.includes("verzin nooit zelf een audio-adres"), "lege-bank-instructie ontbreekt");

console.log("audiobank: naamschoonmaak, workerroute, media-voorvoegsel en route-bedrading kloppen");
