/** Deploy-slot: per worker hooguit één deploy tegelijk. Twee deploys die
 * tegelijk naar dezelfde R2-map schrijven kunnen anders elkaars bestanden en
 * manifest door elkaar halen, of een oudere versie over een nieuwere zetten.
 * De logica is los van database en Cloudflare, zodat hij testbaar is. */

type Vrijgeven = () => Promise<void>;

export class DeploySlotBezet extends Error {
  constructor(naam: string) {
    super(`Er loopt al te lang een andere deploy voor ${naam}.`);
    this.name = "DeploySlotBezet";
  }
}

/** Probeert het slot te pakken en wacht (pollend) tot het vrij is. Een
 * gecrashte deploy laat het slot hooguit ±1,5 minuut staan, dus de standaard
 * maximale wachttijd van 4 minuten is ruim genoeg. */
export async function wachtOpSlot(
  pak: () => Promise<Vrijgeven | null>,
  naam: string,
  opts: { pauzeMs?: number; maxWachtMs?: number; slaap?: (ms: number) => Promise<void> } = {},
): Promise<Vrijgeven> {
  const pauze = opts.pauzeMs ?? 2_000;
  const maxWacht = opts.maxWachtMs ?? 240_000;
  const slaap = opts.slaap ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let gewacht = 0;
  for (;;) {
    const vrij = await pak();
    if (vrij) return vrij;
    if (gewacht >= maxWacht) throw new DeploySlotBezet(naam);
    await slaap(pauze);
    gewacht += pauze;
  }
}

/** Voert `werk` uit met het slot in handen, en geeft het daarna altijd vrij. */
export async function metSlot<T>(
  pak: () => Promise<Vrijgeven | null>,
  naam: string,
  werk: () => Promise<T>,
  opts?: Parameters<typeof wachtOpSlot>[2],
): Promise<T> {
  const vrijgeven = await wachtOpSlot(pak, naam, opts);
  try {
    return await werk();
  } finally {
    await vrijgeven().catch(() => {});
  }
}

/** Deployt een exacte commit en controleert daarna of de branch intussen
 * verder is gegaan (bv. een push tijdens de deploy). Zo ja: nog een ronde met
 * de nieuwste commit, zodat de site nooit op een oudere versie blijft staan.
 * Kan de commit niet bepaald worden, dan één gewone deploy zonder controle. */
export async function deployTotActueel<T>(deps: {
  leesSha: () => Promise<string | null>;
  deploy: (sha: string | null) => Promise<T>;
  maxRondes?: number;
}): Promise<T> {
  const max = deps.maxRondes ?? 3;
  let sha = await deps.leesSha();
  let uitkomst = await deps.deploy(sha);
  for (let ronde = 1; sha && ronde < max; ronde++) {
    const nu = await deps.leesSha();
    if (!nu || nu === sha) break;
    sha = nu;
    uitkomst = await deps.deploy(sha);
  }
  return uitkomst;
}
