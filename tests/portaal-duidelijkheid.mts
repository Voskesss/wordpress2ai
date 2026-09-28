/**
 * Twee verwarringen van Jos (28-09, doorgegeven door de hoofdbeheer-sessie):
 * 1. "Stuur test naar mij" zei niet naar wélk adres; Jos verwachtte zijn
 *    werkadres en de mail ging naar zijn inlogadres.
 * 2. Het op de site gevonden logo leek al in gebruik, terwijl het nog niet
 *    gekozen was.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const bm = await readFile("app/portal/BevestigingsMails.tsx", "utf8");
const actie = await readFile("app/portal/acties-bevestigingen.ts", "utf8");
// Knop en bevestiging noemen het adres, uit dezelfde bron als de verzending
assert.ok(/label=\{testAdres \? `Stuur test naar \$\{testAdres\}`/.test(bm), "de testknop noemt het adres niet");
assert.ok(/klaarLabel=\{testAdres \? `✓ Verstuurd naar \$\{testAdres\}`/.test(bm), "na versturen staat er niet naar welk adres");
assert.ok(/currentUser\(\)\)\?\.emailAddresses\?\.\[0\]\?\.emailAddress/.test(bm), "het getoonde adres komt niet uit dezelfde bron als de verzending");
assert.ok(/currentUser\(\)\)\?\.emailAddresses\?\.\[0\]\?\.emailAddress/.test(actie), "de verzending gebruikt een andere bron dan het label");

const se = await readFile("app/portal/SiteExtra.tsx", "utf8");
assert.ok(/nog niet gekozen/.test(se), "het gevonden logo heeft geen 'nog niet gekozen'-label");
assert.ok(/\$\{mailLogoUrl \? "" : "opacity-50"\}/.test(se), "een nog niet gekozen logo ziet er even vol uit als een gekozen logo");
assert.ok(/maar het staat nog niet in je mails/.test(se), "de uitleg zegt niet dat het gevonden logo nog niet in de mails staat");
assert.ok(!/nog niet in je mails[^"]*—/.test(se), "lang streepje in de nieuwe uitleg");

console.log("portaal-duidelijkheid: testmail noemt het adres, gevonden logo is zichtbaar nog niet gekozen");
