import assert from "node:assert/strict";
import { polsOvergangen, POLS_SET, type CheckUitslag } from "../lib/gezondheid";

const ok = (sleutel: string): CheckUitslag => ({ sleutel, naam: sleutel, status: "ok", detail: "" });
const fout = (sleutel: string, detail = "stuk"): CheckUitslag => ({ sleutel, naam: sleutel, status: "fout", detail });

// Eerste pols ooit, alles goed: niets te melden
let r = polsOvergangen(null, [ok("database"), ok("anthropic")]);
assert.equal(r.kapot.length, 0);
assert.equal(r.hersteld.length, 0);
assert.deepEqual(r.stand.fouten, {});

// Iets gaat kapot: precies één melding, en de stand onthoudt het
r = polsOvergangen(r.stand, [ok("database"), fout("anthropic", "529")]);
assert.deepEqual(r.kapot.map((c) => c.sleutel), ["anthropic"]);
assert.equal(r.hersteld.length, 0);

// Volgende pols, nog steeds kapot: GEEN tweede melding (niet elk kwartier zeuren)
const stand = r.stand;
r = polsOvergangen(stand, [ok("database"), fout("anthropic", "529")]);
assert.equal(r.kapot.length, 0);
assert.equal(r.hersteld.length, 0);

// Hersteld: één herstelmelding, stand weer schoon
r = polsOvergangen(r.stand, [ok("database"), ok("anthropic")]);
assert.equal(r.kapot.length, 0);
assert.equal(r.hersteld.length, 1);
assert.deepEqual(r.stand.fouten, {});

// Twee tegelijk kapot, dan één hersteld: herstel meldt alleen die ene
r = polsOvergangen(r.stand, [fout("database"), fout("resend")]);
assert.equal(r.kapot.length, 2);
r = polsOvergangen(r.stand, [fout("database"), ok("resend")]);
assert.equal(r.kapot.length, 0);
assert.equal(r.hersteld.length, 1);
assert.ok("database" in r.stand.fouten);

// Waarschuwingen zijn geen storingen: geen appjes om geel
r = polsOvergangen(null, [{ sleutel: "x", naam: "x", status: "waarschuwing", detail: "" }]);
assert.equal(r.kapot.length, 0);

// De polsset bevat de vitale vijf en het vastgelopen werk
for (const sleutel of ["database", "anthropic", "resend", "cloudflare", "github", "vast-bouw", "vast-whatsapp", "vast-publicatie"]) {
  assert.ok(POLS_SET.has(sleutel), sleutel);
}
// En bewust NIET de dure of trage dingen
for (const sleutel of ["mollie", "meta", "uptimerobot", "soverin"]) {
  assert.ok(!POLS_SET.has(sleutel), sleutel);
}

console.log("✓ gezondheid-pols: melden bij kapot, zwijgen zolang het kapot blijft, één herstelmelding");

// Een hapering van één meting is geen storing: externe diensten krijgen één
// tweede kans (les 14-10: Resend en Cloudflare gaven losse alarmen).
{
  const { meet } = await import("../lib/gezondheid");
  let keer = 0;
  const eenHapering = async () => (++keer === 1 ? { status: "fout" as const, detail: "Resend antwoordt 429." } : "Sleutel geldig.");
  let u = await meet("resend", "Resend", eenHapering, 1);
  assert.equal(u.status, "ok", "één hapering mag geen storing zijn");
  assert.equal(keer, 2);

  keer = 0;
  u = await meet("resend", "Resend", async () => { keer++; throw new Error("tijd op (8 s)"); }, 1);
  assert.equal(u.status, "fout", "twee keer mis is wél een storing");
  assert.match(u.detail, /tweede poging/);
  assert.equal(keer, 2);

  // Onderhoudschecks mailen of ruimen op: nooit twee keer draaien
  keer = 0;
  u = await meet("proef-ontzorgd", "Proef", async () => { keer++; return { status: "fout" as const, detail: "x" }; }, 1);
  assert.equal(u.status, "fout");
  assert.equal(keer, 1);
}
