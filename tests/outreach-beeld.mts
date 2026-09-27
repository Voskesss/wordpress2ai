/**
 * Afbeeldingen in outreach-mails (vondst Jos 27-09): de bewerker voegde een
 * [afbeelding: ...]-markering in, maar alleen de vrije Mailer kende die;
 * het outreach-verzendpad (sjabloonNaarHtml) zette hem als kale tekst in de
 * mail. Plus: voorbeeld en proefmail tonen voortaan precies de bewerkte
 * tekst, niet de standaardopbouw.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sjabloonNaarHtml } from "../lib/outreach";

const prospect = { id: 7, bedrijf: "Test BV", website: "www.test.nl", email: "x@test.nl", observatie: null };

// 1. Door het echte pad: markering op eigen regel wordt een echt beeld
const html = sjabloonNaarHtml(
  "Hallo,\n\nKijk eens naar dit voorbeeld:\n\n[afbeelding: https://wordswap.nl/mail/beeld.png]\n\nMooi toch?",
  prospect,
);
assert.ok(html.includes('<img src="https://wordswap.nl/mail/beeld.png"'), "de markering wordt geen beeld in de outreach-mail");
assert.ok(!html.includes("[afbeelding"), "de kale markering staat nog in de mail");
assert.ok(/max-width:560px/.test(html), "het beeld mist de mailveilige maat");

// 2. Zonder markering geen extra beeld (de handtekening heeft er zelf al een)
const kaal = sjabloonNaarHtml("Hallo,\n\nGewoon tekst.", prospect);
const tel = (h: string) => (h.match(/<img /g) ?? []).length;
assert.equal(tel(html), tel(kaal) + 1, "het aantal beelden klopt niet: de markering hoort er precies één toe te voegen");
assert.ok(!kaal.includes("beeld.png"), "er verschijnt een beeld waar geen markering staat");

// 3. De voorbeeld/proef-route bestaat, gebruikt de bewerkte tekst en
//    weigert proefmails naar vreemde adressen
const route = await readFile("app/api/admin/outreach-voorbeeld/route.ts", "utf8");
assert.ok(route.includes("sjabloonNaarHtml(vulIn(tekst, voorbeeld)"), "het voorbeeld gebruikt niet de bewerkte tekst");
assert.ok(route.includes("@wordswap\\.nl$"), "de proefmail kan naar een vreemd adres");
assert.ok(route.includes("[PROEF]"), "de proefmail is niet als proef gemarkeerd");

// 4. De bewerker heeft de twee knoppen en stuurt de vak-inhoud mee
const bewerker = await readFile("app/admin/outreach/MailBewerker.tsx", "utf8");
assert.ok(bewerker.includes("Bekijk hoe hij eruitgaat") && bewerker.includes("Proef naar mijzelf"), "de knoppen ontbreken");
assert.ok(bewerker.includes('form.action = "/api/admin/outreach-voorbeeld"'), "de knoppen wijzen niet naar de voorbeeldroute");

// 5. De AI-verbeterknop weet dat de markering heilig is
const verbeter = await readFile("app/api/admin/mail-verbeter/route.ts", "utf8");
assert.ok((verbeter.match(/Laat zo'n regel EXACT staan/g) ?? []).length === 2, "de markering-regel ontbreekt in een van de twee verbeter-prompts");

console.log("outreach-beeld: ok");
