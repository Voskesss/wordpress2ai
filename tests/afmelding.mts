import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isAfmelding, eigenDeel } from "../lib/afmelding";
import { fragmentUitBron } from "../lib/soverin";

/**
 * Wie terugmailde werd een warme lead. Ook wie terugmailde om met rust
 * gelaten te worden: die belandde met een 🎉 tussen de echte leads, met
 * opvolging en al.
 *
 * De valkuil zat in de aanhaling: onze eigen mail staat vaak onder het
 * antwoord, en daar staat de knop "Val mij niet meer lastig" in. Telde die
 * mee, dan gold élke reactie als afmelding en stopte de hele outreach.
 */

// 1. Echte afmeldverzoeken worden herkend
for (const zin of [
  "Graag verwijderen uit jullie bestand.",
  "haal me van die lijst aub",
  "Ik wil geen mail meer ontvangen",
  "Niet meer mailen alsjeblieft",
  "Stop met mailen.",
  "unsubscribe",
  "Please remove me from your list",
  "Afmelden graag",
]) {
  assert.ok(isAfmelding(null, zin), `niet herkend als afmelding: ${JSON.stringify(zin)}`);
}

// 2. Onze eigen knoptekst in de aanhaling telt niet mee
const metOnzeMail = `Hoi Jos, klinkt interessant. Kun je bellen?

Op 21 september 2026 schreef Jos van WordSwap:
Val mij niet meer lastig
Eén klik en je hoort nooit meer iets van ons`;
assert.equal(isAfmelding("Re: Even over je website", metOnzeMail), false,
  "onze eigen knoptekst in de aanhaling maakt van een geïnteresseerde een afmelding");

// 3. Ook zonder ">" maar mét een Van:-blok van Outlook
const outlook = `Ja hoor, graag meer informatie.

Van: Jos van WordSwap
Verzonden: maandag 21 september
Onderwerp: Even over je website
Val mij niet meer lastig`;
assert.equal(isAfmelding(null, outlook), false, "een Outlook-aanhaling wordt niet weggeknipt");
assert.ok(!eigenDeel(outlook).includes("val mij niet"), "eigenDeel laat de aanhaling staan");

// 4. Gewone reacties blijven gewone reacties
for (const zin of [
  "Interessant, wanneer kun je bellen?",
  "Wij hebben net een nieuwe site laten maken, maar bedankt.",
  "Kun je me wat meer vertellen over de kosten?",
  "Ik ben op vakantie tot 3 oktober.",
]) {
  assert.equal(isAfmelding(null, zin), false, `onterecht als afmelding gezien: ${JSON.stringify(zin)}`);
}

// 5. Een lege reactie is geen afmelding
assert.equal(isAfmelding(null, null), false);
assert.equal(isAfmelding("", "   "), false);

// 6. De promotie maakt er geen lead van maar zet hem op niet-mailen
const promotie = await readFile(new URL("../lib/prospect-promotie.ts", import.meta.url), "utf8");
const blok = promotie.slice(promotie.indexOf("isAfmelding(item"), promotie.indexOf("const [nieuweLead]"));
assert.ok(blok.includes('"niet_mailen"'), "een afmelding komt niet op de niet-mailen-lijst");
assert.ok(blok.includes("continue;"), "na een afmelding wordt alsnog een lead aangemaakt");
assert.ok(
  promotie.indexOf("isAfmelding(item") < promotie.indexOf("insert(leads)"),
  "de afmeldcontrole staat na het aanmaken van de lead"
);

// 7. Jos ziet het terug in het verslag van de ronde
const bijwerken = await readFile(new URL("../lib/leads-bijwerken.ts", import.meta.url), "utf8");
assert.ok(bijwerken.includes("uitslag.afgemeld.length"), "afmeldingen worden niet gemeld in het verslag");

// 8. Een beleefd nee telt ook: Harry schreef "geen interesse" en werd een
//    warme lead met een feestje erbij
for (const zin of ["Geen interesse, bedankt.", "Hier hebben wij geen behoefte aan.", "Nee bedankt", "Niet nodig, we hebben net een nieuwe site."]) {
  assert.ok(isAfmelding(null, zin), `een nee wordt niet herkend: ${JSON.stringify(zin)}`);
}
// en een antwoord dat ergens "interesse" noemt zonder nee blijft een reactie
assert.equal(isAfmelding(null, "Ja, ik heb wel interesse. Bel me maar."), false);

// 9. Een ECHTE mail door het ECHTE pad. Alleen HTML, zoals Harry's
//    mailprogramma hem stuurde, met onze eigen mail als aanhaling eronder.
//    Dit is de test die ik in v1.14.0 had moeten schrijven.
const harry = [
  "From: Harry <info@vanderveenschilderwerken.nl>",
  "To: Jos <info@wordswap.nl>",
  "Subject: Re: Even gekeken naar vanderveenschilderwerken.nl",
  "Content-Type: text/html; charset=utf-8",
  "",
  "<html><body><div>Geen interesse, bedankt.</div><br>",
  '<div>Op 21 september 2026 schreef Jos van WordSwap:</div>',
  '<blockquote>Hoi Harry, wie zet jullie projecten op de site? ... <a href="#">Val mij niet meer lastig</a></blockquote>',
  "</body></html>",
].join("\r\n");
const fragment = await fragmentUitBron(harry);
assert.ok(fragment && fragment.includes("Geen interesse"), `de tekst van een HTML-mail wordt niet gelezen: ${JSON.stringify(fragment)}`);
assert.ok(isAfmelding("Re: Even gekeken naar vanderveenschilderwerken.nl", fragment), "Harry's nee wordt door het echte pad niet herkend");

// 9b. En het omgekeerde, ook als echte HTML-mail: een ja blijft een reactie
const ja = harry.replace("Geen interesse, bedankt.", "Ja, klinkt interessant. Bel me morgen even?");
const fragmentJa = await fragmentUitBron(ja);
assert.ok(fragmentJa && fragmentJa.includes("interessant"), "de tekst van de ja-mail wordt niet gelezen");
assert.equal(isAfmelding(null, fragmentJa), false, "een ja met onze knop in de aanhaling telt als afmelding");

// 10. Een lead verwijderen maakt eerst de outreach-koppeling los, anders
//     weigert de database (prospects_lead_id_fkey)
const acties = await readFile(new URL("../app/admin/acties-leads.ts", import.meta.url), "utf8");
const verwijder = acties.slice(acties.indexOf("export async function leadVerwijderen"), acties.indexOf("export async function leadsNuBijwerken"));
assert.ok(verwijder.includes("set({ leadId: null })"), "de prospect blijft naar de verwijderde lead wijzen");
assert.ok(verwijder.indexOf("set({ leadId: null })") < verwijder.indexOf("delete(leads)"), "de koppeling wordt pas losgemaakt na het verwijderen");

// 11. Zes echte mailvormen door het echte pad. Alleen de vijfde maakte het
//     fragment leeg, en dat was Harry: hij typte zijn nee tussen onze
//     aangehaalde tekst, en alle regels met ">" werden weggegooid.
const kop = ["From: a@b.nl", "To: c@d.nl", "Subject: Re: x", "Content-Type: text/html; charset=utf-8", ""].join("\r\n");
const onze = 'Hoi Harry, wie zet jullie projecten op de site?<br>Val mij niet meer lastig';
const vormen: Record<string, string> = {
  "boven, gmail": `<div>NEE</div><div class="gmail_quote">Op ma 21 sep 2026 om 10:00 schreef Jos van WordSwap:<blockquote>${onze}</blockquote></div>`,
  "onder, gmail": `<div class="gmail_quote">Op ma 21 sep 2026 om 10:00 schreef Jos van WordSwap:<blockquote>${onze}</blockquote></div><div>NEE</div>`,
  "boven, outlook": `<div>NEE</div><hr><div><b>Van:</b> Jos van WordSwap<br><b>Verzonden:</b> maandag</div><div>${onze}</div>`,
  "onder, outlook": `<hr><div><b>Van:</b> Jos van WordSwap<br><b>Verzonden:</b> maandag</div><div>${onze}</div><div>NEE</div>`,
  "in de aanhaling (Harry)": `<blockquote>Hoi Harry, wie zet jullie projecten op de site?<br><br>NEE<br><br>Val mij niet meer lastig</blockquote>`,
  "Op-regel bovenaan": `<div>Op 21 sep 2026 schreef Jos van WordSwap:</div><div>NEE</div>`,
};
for (const [naam, html] of Object.entries(vormen)) {
  const nee = await fragmentUitBron(`${kop}\r\n<html><body>${html.replace("NEE", "Geen interesse, bedankt.")}</body></html>`);
  assert.ok(nee && /geen interesse/i.test(nee), `vorm "${naam}": de tekst van het nee gaat verloren (${JSON.stringify(nee)})`);
  assert.ok(isAfmelding("Re: x", nee), `vorm "${naam}": het nee wordt niet herkend`);
  const ja = await fragmentUitBron(`${kop}\r\n<html><body>${html.replace("NEE", "Ja, klinkt goed, bel me morgen.")}</body></html>`);
  assert.equal(isAfmelding("Re: x", ja), false, `vorm "${naam}": een ja telt als afmelding (onze eigen knoptekst lekt door)`);
}

console.log("afmelding: ok");
