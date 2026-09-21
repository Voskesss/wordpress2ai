import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Koude outreach en klantpost mogen niet vanaf hetzelfde domein.
 *
 * Koude post wordt onvermijdelijk door een deel van de ontvangers weggeklikt
 * als ongewenst. Dat zakt in de reputatie van het verzendende domein. Delen
 * beide stromen één domein, dan belandt de afspraakbevestiging van een
 * betalende klant in de spam omdat een onbekende onze koude mail wegklikte.
 * Je merkt dat pas als klanten bellen dat ze niets ontvangen, en dan is het al
 * maanden aan de gang.
 */

const acties = await readFile(new URL("../app/admin/acties.ts", import.meta.url), "utf8");
const afzender = await readFile(new URL("../lib/afzender.ts", import.meta.url), "utf8");
const klantMail = await readFile(new URL("../lib/wordswap-mail.ts", import.meta.url), "utf8");

// 1. De outreach gebruikt het outreach-adres
const { outreachAfzender, klantAfzender, outreachOpEigenDomein, alleenAdres, ANTWOORD_NAAR } =
  await import("../lib/afzender");

// 2. Zolang OUTREACH_FROM niet gezet is, valt hij terug op het klantadres:
//    liever tijdelijk één domein dan een outreach die stilvalt
delete process.env.OUTREACH_FROM;
process.env.RESEND_FROM = "WordSwap <formulier@wordswap.nl>";
assert.equal(outreachAfzender(), klantAfzender(), "zonder eigen domein hoort hij terug te vallen");
assert.equal(outreachOpEigenDomein(), false);

// 3. Met het eigen domein gaan ze uit elkaar
process.env.OUTREACH_FROM = "Jos van WordSwap <jos@post.wordswap.nl>";
assert.equal(outreachAfzender(), "Jos van WordSwap <jos@post.wordswap.nl>");
assert.notEqual(outreachAfzender(), klantAfzender(), "outreach en klantpost delen hetzelfde adres");
assert.equal(outreachOpEigenDomein(), true);
assert.equal(alleenAdres(outreachAfzender()), "jos@post.wordswap.nl");

// 4. Klantpost blijft op het hoofddomein: die code kent het outreach-adres niet
assert.ok(!/OUTREACH_FROM|outreachAfzender/.test(klantMail), "klantpost pakt het outreach-adres");

// 5. In de admin gebruiken alleen de outreach-functies het nieuwe adres.
//    De webinar-reeks gaat naar mensen die zich zélf aanmeldden: die blijft.
const perFunctie = new Map<string, string>();
let huidige = "";
for (const regel of acties.split("\n")) {
  const m = regel.match(/^export async function (\w+)/);
  if (m) huidige = m[1];
  if (/const basisFrom = /.test(regel)) perFunctie.set(huidige, regel.trim());
}
for (const fn of ["verstuurOutreach", "outreachTestmail"])
  assert.match(perFunctie.get(fn) ?? "", /outreachAfzender\(\)/, `${fn} gebruikt niet het outreach-adres`);
assert.match(perFunctie.get("webinarMailen") ?? "", /RESEND_FROM/, "de webinar-reeks hoort op het hoofddomein te blijven");

// 6. Antwoorden komen altijd in de postbus die de meekijker leest, anders
//    ziet WordSwap de reacties niet en wordt niemand ooit een lead
assert.equal(ANTWOORD_NAAR, "info@wordswap.nl");
assert.match(acties, /reply_to: \["info@wordswap\.nl"\]/, "antwoorden gaan niet naar de gelezen postbus");

// 7. Geen lange streepjes in wat hier naar buiten gaat
assert.ok(!afzender.includes("—"), "lang streepje in lib/afzender.ts");

console.log("afzender: ok");
