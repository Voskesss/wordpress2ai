/**
 * Hoofdadres per site: met of zonder www (29-09, aanleiding joostmarchal.nl
 * en route B bij hosters met gewone DNS). Standaard zonder www, zodat
 * bestaande sites niets merken. Het veld `domein` blijft altijd kaal; een
 * per ongeluk meegeplakte "www" mag een site nooit omgooien.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { doorstuurAdres, hoofdBinding, kaalDomein, publiekAdres } from "../lib/hoofdadres";
import { regelsVoorHoster } from "../lib/route-b";

// 1. Standaard: zonder www, ook als iemand www in het domeinveld plakt
assert.equal(publiekAdres({ domein: "roelart.nl" }), "roelart.nl");
assert.equal(publiekAdres({ domein: "https://WWW.RoelArt.nl/pad", hoofdadresWww: false }), "roelart.nl", "een geplakte www maakt de site stiekem een www-site");
assert.equal(doorstuurAdres({ domein: "roelart.nl" }), "www.roelart.nl");
assert.equal(hoofdBinding({ domein: "roelart.nl" }), "kaal");

// 2. Met het vinkje: de site toont zich op www, kaal stuurt door
const jm = { domein: "joostmarchal.nl", hoofdadresWww: true };
assert.equal(publiekAdres(jm), "www.joostmarchal.nl");
assert.equal(doorstuurAdres(jm), "joostmarchal.nl");
assert.equal(kaalDomein(jm), "joostmarchal.nl", "het domeinveld zelf hoort kaal te blijven");
assert.equal(hoofdBinding(jm), "www");

// 3. Een tijdelijk workers.dev-adres heeft geen hoofdadres
assert.equal(publiekAdres({ domein: "klant.wordswap.workers.dev", hoofdadresWww: true }), null);
assert.equal(hoofdBinding({ domein: "klant.wordswap.workers.dev", hoofdadresWww: true }), "kaal");
assert.equal(publiekAdres({ domein: null, hoofdadresWww: true }), null);

// 4. Het site-script: standaard kaal, workers.dev krijgt nooit www
const script = await readFile("lib/worker-r2.ts", "utf8");
assert.ok(script.includes('env.HOOFD === \\"www\\" && !url.hostname.endsWith(\\".workers.dev\\")') || script.includes(`env.HOOFD === "www" && !url.hostname.endsWith(".workers.dev")`), "het script kent het hoofdadres niet, of zet www op een workers.dev-adres");
assert.ok(Number(script.match(/R2_SCRIPT_VERSIE = "(\d+)"/)?.[1]) >= 8, "scriptversie niet opgehoogd: bestaande sites krijgen het hoofdadres nooit");

// 5. De uitrol geeft het hoofdadres door en publiceert opnieuw als het wijzigt
const cf = await readFile("lib/cloudflare.ts", "utf8");
assert.ok(cf.includes('{ type: "plain_text", name: "HOOFD", text: hoofd }'), "de worker krijgt het hoofdadres niet mee");
assert.ok(cf.includes("hoofdNu === hoofd"), "een gewijzigd hoofdadres leidt niet tot een nieuwe publicatie van de worker");
assert.ok(cf.includes('naam.startsWith("wv-") ? "kaal"'), "de werkversie kan een www-hoofdadres krijgen");

// 6. Opslaan: domein blijft kaal, het vinkje staat los, en wijzigen rolt opnieuw uit
const acties = await readFile("app/admin/acties.ts", "utf8");
assert.ok(acties.includes('.replace(/^www\\./, "")'), "bewaarSite strijkt www niet meer uit het domeinveld");
assert.ok(acties.includes('formData.get("hoofdadresWww") === "ja"') && acties.includes("nieuwDomein !== vorige.domein || hoofdGewijzigd"), "het vinkje wordt niet opgeslagen of rolt de site niet opnieuw uit");

// 7. Route B: de hoster krijgt de juiste uitleg bij het kale adres
const kaalRegel = regelsVoorHoster("klant.nl", "www").find((r) => r.naam === "klant.nl")!;
assert.ok(kaalRegel.uitleg.includes("https://www.klant.nl"), "bij een www-site ontbreekt de uitweg voor het adres zonder www");
assert.ok(regelsVoorHoster("klant.nl").find((r) => r.naam === "klant.nl")!.uitleg.includes("nameservers"), "bij een kale site ontbreekt de eerlijke waarschuwing");

console.log("hoofdadres: ok");
