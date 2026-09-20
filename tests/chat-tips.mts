/**
 * Twee dingen die eigenaren anders niet ontdekken: dat ze hun wijziging
 * kunnen INSPREKEN (het microfoontje zat verstopt achter ⋯) en dat ze gewoon
 * mogen práten tegen de chat ("dit vind ik niet mooi"). Bronchecks.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const chat = await readFile("app/portal/Chat.tsx", "utf8");

// 1. De microfoon staat in de vaste balk, niet meer achter "meer opties"
const mic = chat.indexOf("onClick={wisselSpraak}");
const meer = chat.indexOf("{meerOpties && (<>");
assert.ok(mic > 0 && meer > 0, "microfoonknop of het meer-menu niet gevonden");
assert.ok(mic < meer, "het microfoontje zit nog achter het ⋯-menu");
assert.equal(
  (chat.match(/onClick=\{wisselSpraak\}/g) ?? []).length,
  1,
  "er staat meer dan één microfoonknop in de balk",
);
assert.ok(
  !/Meer gereedschap: inspreken/.test(chat),
  "de uitleg bij ⋯ belooft nog inspreken, terwijl dat nu in de balk staat",
);

// 2. Er zijn tips, ze wisselen, en ze zijn weg te klikken
assert.ok(/const TIPS = \[/.test(chat), "tiplijst ontbreekt");
const tips = chat.slice(chat.indexOf("const TIPS = ["), chat.indexOf("];", chat.indexOf("const TIPS = [")));
assert.ok((tips.match(/^\s{2}"/gm) ?? []).length >= 5, "te weinig tips om af te wisselen");
assert.ok(/niet mooi/.test(tips), "de tip over eerlijk zeggen wat je niet mooi vindt ontbreekt");
assert.ok(/microfoontje/.test(tips), "de tip over inspreken ontbreekt");
assert.ok(/ws-tips-weg/.test(chat), "tips zijn niet blijvend weg te klikken");
assert.ok(/setTipNr\(\(n\) => \(n \+ 1\) % TIPS\.length\)/.test(chat), "klikken geeft geen volgende tip");

console.log("chat-tips: microfoon staat in beeld en de tips wisselen, met een uitknop");
