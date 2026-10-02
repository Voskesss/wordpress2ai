import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { MAIL_VIDEOS, staandVan, videoBlokHtml } from "../lib/mail-video";
import { sjabloonNaarHtml, type Prospect } from "../lib/outreach";
import { losseMailNaarHtml } from "../lib/mailer";
import { tekstVanHtml } from "../lib/smtp";

/**
 * Filmpjes in mails (Jos, 02-10-2026). Een video speelt in vrijwel geen
 * mailprogramma af, dus: beeld met afspeelknop dat doorlinkt naar
 * wordswap.nl/video/<naam>, plus een tekstlink voor als beelden uit staan.
 */
const p: Prospect = { id: 1, bedrijf: "Bakkerij", website: "bakkerij.nl", email: "a@b.nl", observatie: null };

for (const naam of Object.keys(MAIL_VIDEOS) as (keyof typeof MAIL_VIDEOS)[]) {
  const v = MAIL_VIDEOS[naam];
  // De bestanden die de mail en de pagina noemen, bestaan echt
  assert.ok(existsSync(`public${v.bestand}`), `${naam}: videobestand ontbreekt`);
  assert.ok(existsSync(`public${v.beeld}`), `${naam}: beeld voor de mail ontbreekt`);
  const staand = staandVan(naam);
  if (staand) assert.ok(existsSync(`public${staand}`), `${naam}: staande versie ontbreekt`);

  for (const [soort, html] of [
    ["outreach", sjabloonNaarHtml(`Hallo,\n\n[video:${naam}]\n\nGroet`, p)],
    ["mailer", losseMailNaarHtml(`Hallo,\n\n[video: ${naam}]\n\nGroet`)],
  ] as const) {
    assert.ok(html.includes(`href="https://www.wordswap.nl/video/${naam}"`), `${soort}/${naam}: geen link naar de videopagina`);
    assert.ok(html.includes(`src="https://www.wordswap.nl${v.beeld}"`), `${soort}/${naam}: geen beeld met volledig adres`);
    assert.ok(html.includes(`Bekijk de video (${v.seconden} sec)`), `${soort}/${naam}: geen tekstlink voor als beelden uit staan`);
    assert.ok(!html.includes(`[video`), `${soort}/${naam}: de code staat nog als kale tekst in de mail`);
    // De tekstversie (die gaat mee voor spamfilters en tekstlezers) heeft de link ook
    assert.ok(tekstVanHtml(html).includes(`wordswap.nl/video/${naam}`), `${soort}/${naam}: tekstversie mist de videolink`);
  }
}

// Een onbekende naam wordt geen kapot blok: de tekst blijft gewoon staan
assert.equal(videoBlokHtml("bestaat-niet"), null);
assert.ok(sjabloonNaarHtml("[video:bestaat-niet]", p).includes("[video:bestaat-niet]"), "onbekende video verdwijnt stil");

// Telefoon krijgt de staande versie (Jos 02-10-2026)
assert.ok(staandVan("website-typen"), "website-typen heeft geen staande versie meer");
const paginaBron = await readFile("app/video/[naam]/page.tsx", "utf8");
assert.ok(paginaBron.includes('media="(max-width: 640px)"') && paginaBron.indexOf("src={staand}") < paginaBron.indexOf("src={v.bestand}"), "de telefoon krijgt de staande versie niet als eerste keus");

// De pagina, de knoppen en de AI-herschrijver kennen de code
const pagina = await readFile("app/video/[naam]/page.tsx", "utf8");
assert.ok(pagina.includes("Object.keys(MAIL_VIDEOS)") && pagina.includes("muted") && pagina.includes("playsInline"), "videopagina speelt niet vanzelf af op een telefoon");
assert.ok((await readFile("app/admin/outreach/MailBewerker.tsx", "utf8")).includes("voegMarkeringIn(`[video:${naam}]`)"), "geen videoknop in de bewerker");
assert.ok((await readFile("app/api/admin/mail-verbeter/route.ts", "utf8")).includes("[video:naam]"), "de AI weet niet dat hij de videocode moet laten staan");

console.log("mail-video: ok");
