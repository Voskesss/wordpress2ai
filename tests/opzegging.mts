import assert from "node:assert/strict";
import {
  STOP_MARGE_DAGEN,
  dagErbij,
  datumInWoorden,
  herstartDatum,
  maandErbij,
  magNogWerken,
  magOffline,
  opzegDatums,
  stopIncassoOp,
} from "../lib/opzegging";

// Een maand erbij, ook over het jaar heen en bij korte maanden
assert.equal(maandErbij("2026-10-12"), "2026-11-12");
assert.equal(maandErbij("2026-12-31"), "2027-01-31");
assert.equal(maandErbij("2026-01-31"), "2026-02-28"); // februari heeft geen 31e
assert.equal(maandErbij("2028-01-31"), "2028-02-29"); // schrikkeljaar
assert.equal(maandErbij("2026-08-31"), "2026-09-30");

// Dagen erbij en eraf
assert.equal(dagErbij("2026-09-17"), "2026-09-18");
assert.equal(dagErbij("2026-12-31"), "2027-01-01");
assert.equal(dagErbij("2026-03-01", -2), "2026-02-27");

// Opzeggen met een lopende incasso: werkt t/m de volgende afschrijfdatum,
// daarna nog een maand online
{
  const d = opzegDatums("2026-10-12", "2026-09-17");
  assert.deepEqual(d, { betaaldTot: "2026-10-12", offlineNa: "2026-11-12" });
}
// Zonder bekende einddatum (geen incasso): vanaf vandaag rekenen
assert.deepEqual(opzegDatums(null, "2026-09-17"), { betaaldTot: "2026-09-17", offlineNa: "2026-10-17" });
// Een datum uit het verleden telt niet mee
assert.deepEqual(opzegDatums("2026-01-01", "2026-09-17"), { betaaldTot: "2026-09-17", offlineNa: "2026-10-17" });

// De incasso wordt vlak vóór de volgende afschrijving gestopt, nooit erna
assert.equal(STOP_MARGE_DAGEN, 2);
assert.equal(stopIncassoOp("2026-10-12", "2026-09-17"), "2026-10-10");
assert.equal(stopIncassoOp("2026-10-01", "2026-09-30"), "2026-09-30"); // marge valt in het verleden → meteen
assert.equal(stopIncassoOp(null, "2026-09-17"), "2026-09-17");
{
  // Nooit later dan de afschrijving zelf: anders wordt er nog een keer afgeschreven
  const stop = stopIncassoOp("2026-10-12", "2026-09-17");
  assert.ok(stop < "2026-10-12");
}

// Werken mag tot en met de laatste betaalde dag
assert.equal(magNogWerken("2026-10-12", "2026-10-12"), true);
assert.equal(magNogWerken("2026-10-12", "2026-10-13"), false);
assert.equal(magNogWerken(null, "2026-10-13"), true); // gewone klant

// Offline mag pas vanaf de einddatum
assert.equal(magOffline("2026-11-12", "2026-11-11"), false);
assert.equal(magOffline("2026-11-12", "2026-11-12"), true);
assert.equal(magOffline(null, "2026-11-12"), false);

// Opzegging intrekken: incasso gaat verder op de eerstvolgende afschrijfdatum
assert.equal(herstartDatum("2026-10-12", "2026-09-17"), "2026-10-12");
// Is die datum al voorbij, dan pas vanaf morgen (Mollie weigert het verleden)
assert.equal(herstartDatum("2026-09-01", "2026-09-17"), "2026-09-18");
assert.equal(herstartDatum(null, "2026-09-17"), "2026-09-18");

// Leesbare datum voor mails en schermen
assert.equal(datumInWoorden("2026-10-12"), "12 oktober 2026");

console.log("PASS opzegging: einddatums, incassostop vóór de afschrijving, intrekken en maandgrenzen.");
