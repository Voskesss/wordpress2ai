import assert from "node:assert/strict";
import { metSlotWacht } from "../lib/slot-wacht";

const bezet = () => new Response(JSON.stringify({ slot: true }), { status: 409 });
const geenSlot409 = () => new Response(JSON.stringify({ melding: "Rond eerst af" }), { status: 409 });
const ok = () => new Response(JSON.stringify({ ok: true }), { status: 200 });
const snel = { pauzeMs: 1, slaap: async () => {} };

// Bezet slot → wacht en probeert opnieuw tot het lukt
{
  const antwoorden = [bezet(), bezet(), ok()];
  let wachtMeldingen = 0;
  const res = await metSlotWacht(async () => antwoorden.shift()!, {
    ...snel,
    opWacht: () => wachtMeldingen++,
  });
  assert.equal(res.status, 200);
  assert.equal(wachtMeldingen, 2);
  assert.equal(antwoorden.length, 0);
}

// Een 409 zonder slot (andere reden) → niet opnieuw proberen
{
  let aanroepen = 0;
  const res = await metSlotWacht(async () => (aanroepen++, geenSlot409()), snel);
  assert.equal(res.status, 409);
  assert.equal(aanroepen, 1);
  assert.equal(((await res.json()) as { melding: string }).melding, "Rond eerst af");
}

// Blijft bezet → geeft na maxPogingen op en geeft het laatste antwoord terug
{
  let aanroepen = 0;
  const res = await metSlotWacht(async () => (aanroepen++, bezet()), { ...snel, maxPogingen: 3 });
  assert.equal(res.status, 409);
  assert.equal(aanroepen, 4);
  // de body is nog leesbaar voor de aanroeper
  assert.equal(((await res.json()) as { slot: boolean }).slot, true);
}

// Meteen gelukt → één aanroep, geen wachtmelding
{
  let aanroepen = 0;
  let gewacht = false;
  const res = await metSlotWacht(async () => (aanroepen++, ok()), { ...snel, opWacht: () => (gewacht = true) });
  assert.equal(res.status, 200);
  assert.equal(aanroepen, 1);
  assert.equal(gewacht, false);
}

console.log("slot-wacht: alle tests geslaagd");
