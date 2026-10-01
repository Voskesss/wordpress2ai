/**
 * Spam-tabje in het portaal (01-10). De veiligheidssessie bouwde de
 * inhoudscontrole (lib/formulier-spam, kolommen spam/spam_reden); dit is de
 * portaalkant: spam in een eigen bak, nooit tussen de open berichten, met de
 * reden erbij en een knop "Geen spam" voor vals alarm.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { bakVan } from "../lib/inzendingen";

// 1. Het echte pad: welke bak
assert.equal(bakVan({ spam: false, gearchiveerd: false }), "open");
assert.equal(bakVan({ spam: false, gearchiveerd: true }), "afgehandeld");
assert.equal(bakVan({ spam: true, gearchiveerd: false }), "spam", "spam hoort niet bij de open berichten");
assert.equal(bakVan({ spam: true, gearchiveerd: true }), "spam", "spam gaat altijd voor, ook als hij gearchiveerd is");
assert.equal(bakVan({ gearchiveerd: false }), "open", "oude rijen zonder spamveld blijven gewoon open");

// 2. De lijst gebruikt die indeling voor de bakken én de tellers
const lijst = await readFile("app/portal/InzendingenLijst.tsx", "utf8");
assert.ok(/rijen\.filter\(\(r\) => bakVan\(r\) === bak\)/.test(lijst), "de lijst filtert de bakken niet via bakVan");
assert.ok(/openAantal = rijen\.filter\(\(r\) => bakVan\(r\) === "open"\)/.test(lijst), "de teller Open telt spam mee");
assert.ok(/\{spamAantal > 0 && \(/.test(lijst), "het Spam-tabje hoort alleen te verschijnen als er spam is");
assert.ok(/Waarom spam: \{r\.spamReden\}/.test(lijst), "de reden staat niet bij het spambericht");
assert.ok(/actie="geen-spam" label="Geen spam"/.test(lijst), "de knop 'Geen spam' ontbreekt");

// 3. De rijen komen met spamvelden uit de database
const se = await readFile("app/portal/SiteExtra.tsx", "utf8");
assert.ok(/spam: i\.spam,\s*spamReden: i\.spamReden,/.test(se), "de spamvelden gaan niet mee naar de lijst");

// 4. "Geen spam" zet het bericht terug bij de open berichten, alleen voor deze site
const acties = await readFile("app/portal/acties.ts", "utf8");
assert.ok(/actie === "geen-spam"\) \{[\s\S]{0,200}set\(\{ spam: false, gearchiveerd: false \}\)\.where\(vanDezeSite\)/.test(acties), "'Geen spam' zet het bericht niet (veilig, per site) terug");

// 5. De export noemt spam ook als spam
const exp = await readFile("app/api/portal/inzendingen-export/route.ts", "utf8");
assert.ok(/r\.spam \? "spam" : r\.gearchiveerd \? "afgehandeld" : "nieuw"/.test(exp), "de Excel-export markeert spam niet");

console.log("spam-tabje: spam in eigen bak met reden, nooit bij open, 'Geen spam' zet terug");
