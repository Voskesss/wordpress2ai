import assert from "node:assert/strict";
import { LEAD_STATUSSEN, statusInfo } from "../lib/leads";

/**
 * De leadstatus "Afspraak gepland".
 *
 * Waarom een eigen test: statusInfo() valt stil terug op de eerste status als
 * hij een waarde niet kent. Een lead met een geplande afspraak zou dan als
 * "Nieuw" op het scherm staan zonder dat er ergens een fout ontstaat. Precies
 * het soort stilte waar een gemiste afspraak in verdwijnt.
 */

const afspraak = LEAD_STATUSSEN.find((s) => s.waarde === "afspraak");
assert.ok(afspraak, 'Status "afspraak" ontbreekt in LEAD_STATUSSEN');

// statusInfo mag hem niet stilletjes op "Nieuw" laten vallen
assert.equal(statusInfo("afspraak").waarde, "afspraak", 'statusInfo("afspraak") valt terug op de eerste status');
assert.equal(statusInfo("afspraak").label, "Afspraak gepland");

// Open, anders stopt lib/leads-bijwerken.ts met opvolgen zodra er een
// afspraak staat: die leidt OPEN_STATUSSEN uit dit veld af.
assert.equal(afspraak.open, true, "Een geplande afspraak is een open lead, geen afgeronde");

// Een eigen kleur, want dat is de hele reden dat deze status bestaat: hem
// zien staan tussen de rest. Deelt hij een kleur, dan valt hij weg.
const zelfdeKleur = LEAD_STATUSSEN.filter((s) => s.kleur === afspraak.kleur);
assert.equal(
  zelfdeKleur.length,
  1,
  `Kleur van "afspraak" wordt gedeeld met: ${zelfdeKleur.map((s) => s.waarde).join(", ")}`
);
assert.match(afspraak.kleur, /orange/, "De afspraakstatus hoort oranje te zijn");

// In de trechter: na "in gesprek", voor "klant geworden". De volgorde is wat
// het uitklapmenu toont, dus die is niet vrijblijvend.
const plek = (w: string) => LEAD_STATUSSEN.findIndex((s) => s.waarde === w);
assert.ok(plek("afspraak") > plek("in_gesprek"), '"afspraak" hoort na "in gesprek" te staan');
assert.ok(plek("afspraak") < plek("klant"), '"afspraak" hoort voor "klant geworden" te staan');
