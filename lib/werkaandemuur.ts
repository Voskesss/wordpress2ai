/**
 * Koppeling met Werk aan de Muur (platform OhMyPrints): de werken van een
 * kunstenaar ophalen, zodat ze op zijn eigen WordSwap-site kunnen staan.
 *
 * Achtergrond: kunstenaars tonen hun werk nu met de officiële WordPress-plugin.
 * Die werkt niet op een statische site, maar gebruikt onder water deze REST-API.
 * De API weigert onbekende clients met een 404, dus we sturen exact dezelfde
 * gegevens mee als de plugin: Basic-auth, een dagelijks wisselende sessiecookie,
 * een eigen User-Agent en een Referer.
 *
 * Fair use: Werk aan de Muur knijpt intensief gebruik af en beveelt caching zelf
 * aan (werken worden handmatig geüpload en veranderen dus zelden). Ophalen hoort
 * daarom in een cron te zitten die statische pagina's maakt — nooit per bezoeker.
 */

const BASIS = "https://www.werkaandemuur.nl/api/";
const PLUGIN_VERSIE = "1.5.1";

export type Kunstwerk = {
  id: string | number | null;
  titel: string;
  link: string;
  beelden: Record<string, string>;
};

export type Inloggegevens = {
  /** Artist ID uit het Werk aan de Muur-dashboard van de kunstenaar */
  artistId: string;
  /** Persoonlijke API-sleutel uit datzelfde dashboard */
  apiKey: string;
  /** Wordt als Referer meegestuurd; de site waarvoor we ophalen */
  siteUrl?: string;
};

/**
 * De sessiecookie die de plugin meestuurt: md5 van sleutel + artist-id + de
 * datum van vandaag. Wisselt dus elke dag.
 */
export async function sessieCookie(g: Inloggegevens, vandaag: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("md5").update(`${g.apiKey}${g.artistId}${vandaag}`).digest("hex");
}

/** Datum in het formaat dat de plugin gebruikt (YYYY-MM-DD, Nederlandse tijd). */
export function vandaagNl(nu: Date = new Date()): string {
  return nu.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

/** Eén los werk uit het API-antwoord omzetten naar onze vorm. */
export function leesKunstwerk(ruw: unknown): Kunstwerk | null {
  const w = ruw as { id?: string | number; artId?: string | number; title?: string; link?: string; imagesHttps?: Record<string, string> };
  if (!w?.title || !w?.link) return null;
  return {
    id: w.id ?? w.artId ?? null,
    titel: String(w.title),
    link: String(w.link),
    beelden: w.imagesHttps ?? {},
  };
}

/** Het grootste beeld dat beschikbaar is (formaten heten "500x500", "950x600", ...). */
export function grootsteBeeld(beelden: Record<string, string>): string | null {
  const opp = (maat: string) => {
    const m = maat.match(/^(\d+)x(\d+)$/);
    return m ? Number(m[1]) * Number(m[2]) : 0;
  };
  const beste = Object.keys(beelden).sort((a, b) => opp(b) - opp(a))[0];
  return beste ? beelden[beste] : null;
}

async function haalOp(g: Inloggegevens, parameters: Record<string, string | number>): Promise<unknown> {
  const url = new URL(BASIS);
  for (const [sleutel, waarde] of Object.entries(parameters)) url.searchParams.set(sleutel, String(waarde));
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${g.artistId}:${g.apiKey}`).toString("base64")}`,
      Cookie: `PHPSESSID=${await sessieCookie(g, vandaagNl())}`,
      "User-Agent": `WadM Wordpress plugin/${PLUGIN_VERSIE} (Wordpress 6.7, cURL)`,
      Referer: g.siteUrl ?? "https://wordswap.nl",
    },
  });
  const tekst = await res.text();
  if (!res.ok || !tekst.trimStart().startsWith("{")) {
    throw new Error(
      `Werk aan de Muur gaf ${res.status} terug${res.status === 404 ? " (bij deze API betekent dat meestal: sleutel of artist-id klopt niet)" : ""}`,
    );
  }
  return JSON.parse(tekst);
}

/** Eén pagina met werken (perPage max wat de API toestaat; de plugin gebruikt 12). */
export async function haalWerkenPagina(
  g: Inloggegevens,
  pagina = 1,
  perPagina = 24,
): Promise<{ werken: Kunstwerk[]; ruw: unknown }> {
  const data = await haalOp(g, { action: "artlist", userId: g.artistId, perPage: perPagina, page: pagina });
  const lijst = (data as { artworks?: unknown[]; items?: unknown[]; data?: unknown[] });
  const rij = lijst.artworks ?? lijst.items ?? lijst.data ?? [];
  return { werken: (Array.isArray(rij) ? rij : []).map(leesKunstwerk).filter((w): w is Kunstwerk => w !== null), ruw: data };
}

/** Alle werken, pagina voor pagina (stopt vanzelf als er niets meer komt). */
export async function haalAlleWerken(g: Inloggegevens, maxPaginas = 40): Promise<Kunstwerk[]> {
  const alle: Kunstwerk[] = [];
  const gezien = new Set<string>();
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const { werken } = await haalWerkenPagina(g, pagina);
    const nieuw = werken.filter((w) => !gezien.has(w.link));
    if (nieuw.length === 0) break;
    for (const w of nieuw) gezien.add(w.link);
    alle.push(...nieuw);
  }
  return alle;
}
