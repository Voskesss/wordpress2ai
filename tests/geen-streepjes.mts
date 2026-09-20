import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { maakEerste, maakFormulierBericht, maakLaatste, maakOpvolger } from "../lib/lead-opvolging";
import { maakOpvolgmail } from "../lib/opvolgmail";

/**
 * Jos wil geen lange streepjes (—) in teksten die naar buiten gaan: dat leest als
 * door AI geschreven, en de leads zijn vaak juist schrijvers die dat meteen zien.
 * Deze test bewaakt dat ze niet terugsluipen in de vaste teksten en instructies.
 */

const STREEPJE = "—";

// 1. De vaste mailteksten
for (const mail of [
  maakEerste("Gerard", "gerardgroenen.nl"),
  maakEerste(null, null),
  maakOpvolger("Gerard", "gerardgroenen.nl"),
  maakLaatste("Gerard"),
  maakFormulierBericht("Gerard"),
]) {
  assert.ok(!mail.tekst.includes(STREEPJE), `Lang streepje in: ${mail.onderwerp}`);
  assert.ok(!mail.onderwerp.includes(STREEPJE), `Lang streepje in onderwerp: ${mail.onderwerp}`);
}

// 2. De site-check-mail, met en zonder gevonden gebreken
for (const scan of [
  { domein: "test.nl", bereikbaar: true, paginas: 12, laadMs: 3200, stempel: "🟠", kapot: ["dode link (/oud geeft 404)"], bevindingen: ["verouderde WordPress-versie"] },
  { domein: "test.nl", bereikbaar: true, paginas: 4, laadMs: 400, stempel: "🟢", kapot: [], bevindingen: [] },
]) {
  const m = maakOpvolgmail(scan as never, "Jan", { gebeld: true });
  assert.ok(!m.tekst.includes(STREEPJE), "Lang streepje in de site-check-mail");
  assert.ok(!m.onderwerp.includes(STREEPJE), "Lang streepje in het onderwerp van de site-check-mail");
}

// 3. De bestanden met teksten die naar klanten en leads gaan. In lead-mail-ai.ts
// staat één streepje: de regel die uitlegt dat je ze niet mag gebruiken.
for (const [bestand, toegestaan] of [
  ["lib/klant-mails.ts", 0],
  ["lib/lead-opvolging.ts", 0],
  ["lib/opvolgmail.ts", 0],
  ["lib/website-akkoord.ts", 0],
  ["lib/lead-mail-ai.ts", 1],
] as const) {
  const inhoud = await readFile(new URL(`../${bestand}`, import.meta.url), "utf8");
  const aantal = (inhoud.match(/—/g) ?? []).length;
  assert.equal(aantal, toegestaan, `${bestand}: ${aantal} lange streepjes, verwacht ${toegestaan}`);
}

// 4. En de AI krijgt de regel ook echt mee
{
  const inhoud = await readFile(new URL("../lib/lead-mail-ai.ts", import.meta.url), "utf8");
  assert.ok(inhoud.includes("GEEN LANGE STREEPJES"), "De stijlregel staat niet in de AI-instructie");
}

console.log("geen-streepjes: alle checks geslaagd");
