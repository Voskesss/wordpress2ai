/**
 * Video's houden hun geluid. Het compressie-recept kwam uit de huisregels
 * voor achtergrondvideo's en gooide met `-an` het geluidsspoor weg — maar
 * klanten sturen ook gewone video's met gesproken tekst mee, en die kwamen
 * stil op de site terecht (gezien 20-09). Een hero-video speelt toch muted,
 * dus geluid in het bestand kost alleen een paar honderd kB.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { VIDEO_MAX_SECONDEN } from "../lib/video-grens";

const rendi = await readFile("lib/rendi.ts", "utf8");
const opdracht = rendi.match(/ffmpeg_command:\s*`?"?([^`"]+)/)?.[1] ?? "";
assert.ok(opdracht, "ffmpeg-opdracht niet gevonden");

// 1. Geen -an meer (dat verwijdert het geluidsspoor)
assert.ok(!/\s-an(\s|$)/.test(opdracht), "het recept gooit het geluid nog steeds weg (-an)");

// 2. Wel een audiocodec, anders laat ffmpeg het geluid alsnog vallen bij mp4
assert.ok(/-c:a aac/.test(opdracht), "geen audiocodec: het geluid overleeft het comprimeren niet");

// 3. De duurgrens is ruim genoeg voor een uitlegvideo, niet eindeloos
assert.ok(VIDEO_MAX_SECONDEN >= 120 && VIDEO_MAX_SECONDEN <= 600, `duurgrens ${VIDEO_MAX_SECONDEN}s is niet realistisch`);
assert.ok(
  opdracht.includes("-t ${VIDEO_MAX_SECONDEN}") || opdracht.includes(`-t ${VIDEO_MAX_SECONDEN}`),
  "de opdracht gebruikt de duurgrens niet",
);

// 4. Wat de klant en de AI te horen krijgen klopt met wat er gebeurt
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/geluid blijft bewaard/.test(chat), "de klant hoort niet dat het geluid bewaard blijft");
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(!/gecomprimeerd tot een korte loop zonder geluid/.test(route), "de AI krijgt nog de oude uitleg (zonder geluid)");
const huis = await readFile("lib/huisregels.ts", "utf8");
assert.ok(!/zonder geluidsspoor/.test(huis), "de huisregels eisen nog een video zonder geluidsspoor");

// 5. Lange video's: de klant krijgt vóór het uploaden te horen dat er wordt
//    ingekort, met de tip om YouTube of Vimeo te gebruiken (cookie-vrij).
assert.ok(/videoDuur/.test(chat), "de duur van een gekozen video wordt niet gemeten");
assert.ok(/YouTube of Vimeo/.test(chat), "de tip om een lange video elders te hosten ontbreekt in de chat");
assert.ok(/YouTube of Vimeo/.test(huis), "de huisregels adviseren geen YouTube/Vimeo voor lange video's");

console.log(`video-geluid: geluid blijft behouden, max ${VIDEO_MAX_SECONDEN}s, teksten kloppen`);
