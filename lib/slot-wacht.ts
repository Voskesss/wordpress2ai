/** Wachttekst zolang een andere bewerking het slot van de site nog heeft. */
export const SLOT_WACHTTEKST =
  "Er wordt nog aan je website gewerkt — ik wacht even en ga daarna vanzelf verder...";

/**
 * Doet een verzoek en wacht rustig als de server "slot bezet" (409 + slot)
 * teruggeeft: elke `pauzeMs` opnieuw, hooguit `maxPogingen` keer. Het slot
 * vernieuwt zichzelf en valt na een crash binnen ±1,5 minuut vrij, dus met de
 * standaardwaarden (11 × 10 s) proberen we lang genoeg voordat we opgeven.
 * Draait in de browser én in tests: geen serverafhankelijkheden.
 */
export async function metSlotWacht(
  doe: () => Promise<Response>,
  opts: {
    opWacht?: (poging: number) => void;
    pauzeMs?: number;
    maxPogingen?: number;
    slaap?: (ms: number) => Promise<void>;
  } = {},
): Promise<Response> {
  const pauze = opts.pauzeMs ?? 10_000;
  const max = opts.maxPogingen ?? 11;
  const slaap = opts.slaap ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let res = await doe();
  for (let poging = 0; res.status === 409 && poging < max; poging++) {
    const data = (await res
      .clone()
      .json()
      .catch(() => ({}))) as { slot?: boolean };
    if (!data.slot) break;
    opts.opWacht?.(poging);
    await slaap(pauze);
    res = await doe();
  }
  return res;
}
