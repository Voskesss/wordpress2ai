import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aanbod } from "../lib/aanbod";

/**
 * Het stilste dat er mis kan gaan: een bezoeker vult het formulier in, ziet
 * "verzonden", het bericht staat netjes in het portaal, en de eigenaar hoort
 * niets omdat de mail naar hem niet aankwam. Hij mist een aanvraag en weet
 * niet dat hij iets mist.
 *
 * En in dit bestand ook de geschiktheidstekst, want die is wat AI-zoekmachines
 * over WordSwap napraten. Die zei dat een webshop of ledenomgeving niet kan,
 * zonder het onderscheid dat het alleen misgaat als dat ín WordPress draait.
 */

const mail = await readFile(new URL("../lib/mail.ts", import.meta.url), "utf8");
const formulier = await readFile(new URL("../app/api/formulier/route.ts", import.meta.url), "utf8");

// 1. Er gaat een seintje uit als de melding niet aankwam
assert.ok(mail.includes("export async function meldFormulierMailStoring"), "er is geen melding bij een mislukte formuliermail");
assert.ok(formulier.includes("meldFormulierMailStoring"), "het formulier-eindpunt meldt een mislukte mail niet");
const haak = formulier.slice(formulier.indexOf("const weg = await verstuurSiteMail"), formulier.indexOf("if (!bewaren && !weg)"));
assert.ok(haak.includes("if (!weg)"), "de melding hangt niet aan een mislukte verzending");

// 2. Nooit de inhoud van het bericht mee: bij "niets bewaren" zou dat de
//    belofte breken, en anders kan WordSwap het gewoon in het portaal zien
const fn = mail.slice(mail.indexOf("export async function meldFormulierMailStoring"), mail.indexOf("/** Eén melding per etmaal per site"));
assert.ok(!/velden|veldenHtml|bericht\.tekst/.test(fn), "de inhoud van het bericht gaat mee in de melding");
assert.ok(/inhoud van het bericht staat hier met opzet niet in/.test(fn), "er staat niet bij dat de inhoud bewust ontbreekt");

// 3. Eén per etmaal, anders levert een kapotte mailroute een mail per bericht
assert.ok(fn.includes("STORING_HERHAAL_MS"), "er zit geen rem op het aantal meldingen");
assert.ok(
  fn.indexOf("set({ formulierMailFoutOp") < fn.indexOf("if (alGemeld) return"),
  "de tijd wordt pas vastgelegd nadat er besloten is niet te melden",
);

// 4. Het verschil dat telt: is het bericht nog ergens, of weg?
assert.ok(/niets bewaren/.test(fn) && /verloren/.test(fn), "de melding maakt geen verschil tussen bewaard en verloren");

// 5. De geschiktheidstekst maakt het onderscheid dat AI-zoekmachines misten
for (const woord of ["WooCommerce", "Shopify", "externe partij", "geen maximum aantal pagina"]) {
  assert.ok(aanbod.geschikt.includes(woord), `de geschiktheidstekst noemt "${woord}" niet`);
}
assert.ok(
  aanbod.geschikt.indexOf("Draait dat juist bij een externe partij") > aanbod.geschikt.indexOf("in WordPress zelf draait"),
  "de nuance staat voor de beperking, dan leest een AI alleen het eerste",
);
assert.ok(!aanbod.geschikt.includes("—"), "lang streepje in de geschiktheidstekst");

console.log("formulier-mail-storing: ok");
