/**
 * De klant hoort het niet toevallig te ontdekken (wens Jos 26-09): zet je het
 * nieuwe ontwerp zichtbaar, dan gaat er standaard een mailtje mee, met een
 * eigen opmerking van Jos bovenaan en een voorbeeldknop vooraf. En de melding
 * over het mailen mag niet door het foutvangnet worden opgeslokt.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bouwOntwerpKlaar } from "../lib/klant-mails";

// 1. De mail zelf: geruststelling voorop, knop naar het ontwerp, opmerking bovenaan
const mail = bouwOntwerpKlaar({
  siteNaam: "Van den Berg Mediation",
  naam: "Dirk-Jan van den Berg",
  ontwerpUrl: "https://ontwerp-abc.wordswap.workers.dev",
  eigenTekst: "Ik ben benieuwd wat je van de nieuwe kleuren vindt!",
});
assert.equal(mail.onderwerp, "Je nieuwe ontwerp staat klaar om te bekijken");
assert.ok(mail.html.includes("Hoi Dirk-Jan,"), "voornaam ontbreekt");
assert.ok(mail.html.indexOf("nieuwe kleuren") < mail.html.indexOf("staat voor je klaar"), "de eigen opmerking staat niet bovenaan");
assert.ok(mail.html.includes("https://ontwerp-abc.wordswap.workers.dev"), "de ontwerp-link ontbreekt");
assert.ok(mail.html.includes("alleen kijken") && mail.html.includes("blijft precies zoals hij is"), "de geruststelling (niets staat live) ontbreekt");
assert.ok(mail.html.includes("nog niet zelf via de chat"), "de vaste zin over de ontwerpfase-chat ontbreekt");
assert.ok(!mail.html.includes("—"), "lang streepje in de klantmail");

// 2. Zonder opmerking: geen lege alinea-resten
const kaal = bouwOntwerpKlaar({ siteNaam: "X", ontwerpUrl: "https://o.wordswap.workers.dev" });
assert.ok(kaal.html.includes("Hoi daar,") || /Hoi [A-Za-z]/.test(kaal.html), "aanhef zonder naam klopt niet");

// 3. De actie: mailen standaard aan, melding buiten het vangnet om
const acties = await readFile(new URL("../app/admin/acties.ts", import.meta.url), "utf8");
const fn = acties.split("export async function ontwerpZichtbaarheid")[1].split("export async function")[0];
assert.ok(fn.includes('formData.get("mailen") === "ja"'), "de mailen-keuze wordt niet gelezen");
assert.ok(fn.includes("let mailMelding"), "de meldingsvariabele is verdwenen");
assert.ok(!/try {[\s\S]*redirect\(`\/admin\/klant\/\$\{siteId\}\?ontwerp=\$\{encodeURIComponent\(gelukt/.test(fn), "de mail-redirect zit weer ín het foutvangnet");
assert.ok(fn.indexOf("if (mailMelding)") > fn.indexOf("catch"), "de melding wordt niet ná het vangnet doorgestuurd");

// 4. Het formulier: vinkje standaard aan, opmerking-veld en voorbeeldknop
const blok = await readFile(new URL("../app/admin/klant/[id]/OntwerpBlok.tsx", import.meta.url), "utf8");
assert.ok(/name="mailen" value="ja" defaultChecked/.test(blok), "het mail-vinkje staat niet standaard aan");
assert.ok(blok.includes('name="opmerking"'), "het opmerking-veld ontbreekt");
assert.ok(blok.includes('"ontwerp-klaar"') && blok.includes("MailVoorbeeldKnop"), "de voorbeeldknop ontbreekt");
assert.ok(/velden=\{\[\["opmerking", "bericht"\]\]\}/.test(blok), "de voorbeeldknop neemt de getypte opmerking niet mee");

// 5. De voorbeeldroute kent de soort
const voorbeeld = await readFile(new URL("../app/api/admin/mail-voorbeeld/route.ts", import.meta.url), "utf8");
assert.ok(voorbeeld.includes('soort === "ontwerp-klaar"'), "de voorbeeldroute kent ontwerp-klaar niet");

// 6. Ook bij verbergen: eerlijke mail (dode link benoemd), beide richtingen in het formulier
import { bouwOntwerpTeruggetrokken } from "../lib/klant-mails";
const terug = bouwOntwerpTeruggetrokken({ siteNaam: "X", naam: "Dirk-Jan", eigenTekst: null });
assert.ok(terug.html.includes("doet het daardoor tijdelijk niet"), "de dode-link-uitleg ontbreekt in de terugtrek-mail");
assert.ok(terug.html.includes("draait gewoon door"), "de geruststelling ontbreekt in de terugtrek-mail");
assert.ok(!terug.html.includes("\u2014"), "lang streepje in de terugtrek-mail");
assert.ok(blok.includes('"ontwerp-terug"') && blok.includes("even is teruggetrokken"), "de verberg-richting ontbreekt in het formulier");
assert.ok(voorbeeld.includes('soort === "ontwerp-terug"'), "de voorbeeldroute kent ontwerp-terug niet");
const verbergDeel = fn.split("verbergOntwerp(site)")[1] ?? "";
assert.ok(verbergDeel.includes("bouwOntwerpTeruggetrokken"), "verbergen stuurt geen mail meer");

// 7. Verbergen verwisselt het adres (nieuw geheim adres eerst, dan pas het
//    oude weg): de klant-link sterft, de beheerder kan altijd blijven kijken
const ontwerp = await readFile(new URL("../lib/ontwerp.ts", import.meta.url), "utf8");
const verbergFn = ontwerp.split("export async function verbergOntwerp")[1].split("export async function")[0];
assert.ok(verbergFn.includes("nieuweOntwerpNaam"), "verbergen maakt geen nieuw geheim adres meer");
assert.ok(verbergFn.indexOf("deployRepoNaarCloudflareRef") < verbergFn.indexOf("verwijderCloudflareSite"), "het oude adres wordt weggegooid vóór het nieuwe er staat");

// 8. Het oude adres wordt een nette vervallen-melding, geen kale fout
assert.ok(/zetLinkVervallenPagina/.test(verbergFn), "verbergen zet geen vervallen-melding meer op het oude adres");
assert.ok(ontwerp.includes("Deze link is vervangen") && ontwerp.includes("jos@wordswap.nl"), "de vervallen-pagina mist de uitleg of het contactadres");
assert.ok(ontwerp.includes('name="robots" content="noindex'), "de vervallen-pagina is niet op noindex gezet");

console.log("ontwerp-mail: ok");
