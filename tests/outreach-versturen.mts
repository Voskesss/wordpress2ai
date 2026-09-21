import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Om één koude mail de deur uit te doen waren vier klikken en twee herladingen
 * nodig: openklappen, nog eens openklappen, opslaan, versturen. Erger nog: de
 * tekst die je las en de tekst die verstuurd werd kwamen uit twee verschillende
 * plekken, dus een niet-opgeslagen bewerking ging stilletjes verloren.
 *
 * Nu staat de mail die eruit gaat in één klik open, bewerkbaar, met de
 * verstuurknop eronder. Versturen bewaart eerst wat er staat en verstuurt
 * daarna precies dat.
 */

const pagina = await readFile(new URL("../app/admin/outreach/page.tsx", import.meta.url), "utf8");
const acties = await readFile(new URL("../app/admin/acties.ts", import.meta.url), "utf8");

// 1. Er is nog maar één plek waar je een mail bewerkt
assert.equal(
  (pagina.match(/<MailBewerker/g) ?? []).length,
  1,
  "meer dan één bewerkvak op de outreachpagina: dan gaan twee versies uit elkaar lopen"
);

// 2. Dat vak zit in het formulier dat ook verstuurt
const vak = pagina.slice(pagina.indexOf("lezen, aanpassen en versturen"));
assert.ok(vak.includes("action={verstuurOutreach}"), "het bewerkvak verstuurt niet zelf");
assert.ok(vak.includes("<MailBewerker"), "het verstuurformulier bevat geen bewerkvak");
assert.ok(/name="nummer"/.test(vak), "het verstuurformulier geeft geen mailnummer mee");

// 3. De verstuurknop noemt het adres, zodat je nooit blind verstuurt
assert.ok(
  /label=\{`Verstuur mail \$\{volgende\} naar \$\{p\.email\}`\}/.test(vak),
  "de verstuurknop noemt het ontvangende adres niet"
);

// 4. Versturen bewaart eerst wat er in het vak staat
const fn = acties.slice(acties.indexOf("export async function verstuurOutreach"));
const eind = fn.indexOf("\nexport async function", 1);
const verstuur = eind === -1 ? fn : fn.slice(0, eind);
assert.ok(verstuur.includes('formData.get("onderwerp")'), "verstuurOutreach leest het bewerkte onderwerp niet");
assert.ok(verstuur.includes('formData.get("tekst")'), "verstuurOutreach leest de bewerkte tekst niet");
assert.ok(
  verstuur.indexOf("insert(prospectMails)") < verstuur.indexOf("kiesMail("),
  "de bewerkte tekst wordt pas na het kiezen van de mail bewaard: dan gaat de oude versie uit"
);
assert.ok(
  verstuur.indexOf("kiesMail(") < verstuur.indexOf("api.resend.com"),
  "de mail wordt samengesteld na het versturen"
);

// 5. De niet-mailen-rem staat nog steeds vóór alles
assert.ok(
  verstuur.indexOf('"niet_mailen"') < verstuur.indexOf("api.resend.com"),
  "de niet-mailen-rem staat niet meer vóór het versturen"
);

// 6. Eén knop om de site van de prospect te openen
assert.ok(pagina.includes("🔗 Site bekijken"), "geen knop om de site van de prospect te openen");

// 7. Gegevens en knoppen staan niet in dezelfde flexrij. Deden ze dat wel,
//    dan duwden de lange knoplabels de tekstkolom tot niets samen en viel
//    het mailadres letter voor letter uit elkaar.
const kop = pagina.slice(pagina.indexOf("<div key={p.id}"), pagina.indexOf("🔗 Site bekijken"));
assert.ok(!kop.includes("min-w-0 flex-1"), "de gegevens staan weer in dezelfde flexrij als de knoppen");
assert.ok(!kop.includes("break-all"), "break-all breekt een mailadres per letter af: gebruik break-words");
assert.ok(
  kop.includes('<div className="mt-3 flex flex-wrap items-center gap-2">'),
  "de knoppen hebben geen eigen rij meer"
);

console.log("outreach-versturen: ok");
