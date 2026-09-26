/**
 * Wens Jos 26-09: "we moeten een mailtje sturen als mensen over hun budget
 * heen gaan". De klant krijgt bij een vol maandbudget al een nette melding
 * met het verzoek te mailen, maar deed hij dat niet, dan zag Jos het alleen
 * toevallig in de admin. Nu gaat er één mail per scope per maand naar
 * info@wordswap.nl. Plus: de lange streepjes uit de WhatsApp-klantteksten
 * (afspraak geen-lange-streepjes geldt ook daar).
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// 1. De mailfunctie bestaat, mailt WordSwap en claimt de gemeld-kolom
// atomair (alleen de eerste weigering van de maand mag een mail geven)
const mail = await readFile("lib/mail.ts", "utf8");
assert.ok(/export async function meldBudgetOp/.test(mail), "de budget-op-melding ontbreekt in lib/mail.ts");
{
  const blok = mail.slice(mail.indexOf("export async function meldBudgetOp"));
  assert.ok(/budget_op_gemeld_op = now\(\)/.test(blok), "de gemeld-kolom wordt niet gezet");
  assert.ok(/budget_op_gemeld_op IS NULL/.test(blok), "de claim is niet beperkt tot de eerste keer (elke poging zou mailen)");
  assert.ok(/RETURNING scope/.test(blok) && /claim\.rows\.length === 0\) return/.test(blok), "de mail hangt niet aan de atomaire claim");
  assert.ok(/to: \["info@wordswap\.nl"\]/.test(blok), "de melding gaat niet naar info@wordswap.nl");
  assert.ok(/Maandbudget op bij/.test(blok), "het onderwerp zegt niet waar het over gaat");
}

// 2. De chatroute roept hem aan bij een vol budget, alleen voor klantsites,
// zonder dat de klant op de mail hoeft te wachten
const route = await readFile("app/api/chat/route.ts", "utf8");
{
  const van = route.indexOf("reserveAiBudget(scope, requestBudgetUsd");
  const blok = route.slice(van, route.indexOf("status: 429", van));
  assert.ok(/if \(!site\.isDemo\)/.test(blok), "de melding zou ook voor demo-bezoekers afgaan (of ontbreekt)");
  assert.ok(/void meldBudgetOp\(site, scope, maand, kanaal\)/.test(blok), "de route stuurt de budget-op-melding niet (of laat de klant erop wachten)");
}

// 3. Kolom in schema én migratie, zodat dev en prod gelijk lopen
const schema = await readFile("db/schema.ts", "utf8");
assert.ok(/budgetOpGemeldOp: timestamp\("budget_op_gemeld_op"\)/.test(schema), "de gemeld-kolom ontbreekt in het schema");
const migratie = await readFile("db/migrations/20260926-budget-op-melding.sql", "utf8");
assert.ok(/alter table ai_budget_reservations add column if not exists budget_op_gemeld_op timestamptz/.test(migratie), "de migratie ontbreekt of wijkt af");

// 4. Geen lange streepjes meer in wat klanten te lezen krijgen: de vaste
// WhatsApp-teksten en de vaste chat-antwoorden (429 en slot-melding)
const STREEPJE = "—";
for (const pad of ["lib/whatsapp/verwerk.ts"]) {
  const bron = await readFile(pad, "utf8");
  for (const [i, regel] of bron.split("\n").entries()) {
    if (regel.includes(STREEPJE) && /["'`].*—.*["'`]/.test(regel) && !/^\s*(\/\/|\*|\/\*)/.test(regel))
      assert.fail(`Lang streepje in klanttekst ${pad}:${i + 1}`);
  }
}
{
  const berichten = await readFile("lib/whatsapp/berichten.ts", "utf8");
  assert.ok(!/Je hoort het zodra het klaar is\.`;/.test(berichten) || !/— je hoort/.test(berichten), "de werkmelding heeft zijn lange streepje terug");
}
assert.ok(!/gewerkt — meer dan er in het pakket past/.test(route), "de budget-melding aan de klant heeft zijn lange streepje terug");
assert.ok(!/kun je verder — mocht er iets/.test(route), "de slot-melding aan de klant heeft zijn lange streepje terug");

console.log("Budget-op-melding: mail naar WordSwap, eenmalig per maand, en de streepjes zijn weg");
