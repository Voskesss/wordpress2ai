/**
 * Leads ophalen uit Meta (Lead Ads) via de Graph API: alle leadformulieren van
 * de WordSwap-pagina, met de ingevulde antwoorden. Alleen-lezen; de sleutel is
 * een System User-token met leads_retrieval (META_LEADS_TOKEN in Vercel).
 */

const GRAPH = "https://graph.facebook.com/v21.0";
const WORDSWAP_PAGINA = "1261110577088888";

export type MetaLead = {
  metaId: string;
  naam: string;
  email: string | null;
  telefoon: string | null;
  website: string | null;
  aangemaakt: Date;
};

type RuwVeld = { name?: string; values?: string[] };
type RuweLead = { id: string; created_time?: string; field_data?: RuwVeld[] };

export function metaIngesteld(): boolean {
  return Boolean(process.env.META_LEADS_TOKEN);
}

function waarde(velden: RuwVeld[], zoek: (naam: string) => boolean): string | null {
  const veld = velden.find((v) => v.name && zoek(v.name.toLowerCase()));
  const w = veld?.values?.[0]?.trim();
  return w || null;
}

/** Zelfde opschoning als het domeinveld in de admin: protocol, www en pad eraf. */
export function schoonDomein(invoer: string | null): string | null {
  if (!invoer) return null;
  const schoon = invoer
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  return schoon.includes(".") && !schoon.includes("@") && !schoon.includes(" ") ? schoon : null;
}

/** Antwoorden van één Meta-lead omzetten naar onze leadvelden (puur, getest). */
export function mapMetaLead(ruw: RuweLead): MetaLead | null {
  const velden = ruw.field_data ?? [];
  const naam = waarde(velden, (n) => n === "full_name" || n === "name" || n.includes("naam"));
  const email = waarde(velden, (n) => n.includes("email") || n.includes("e-mail"));
  const telefoon = waarde(velden, (n) => n.includes("phone") || n.includes("telefoon"));
  // De websitevraag heet per formulier anders; terugval: het eerste antwoord dat op een domein lijkt
  const website =
    schoonDomein(waarde(velden, (n) => n.includes("website") || n.includes("site"))) ??
    schoonDomein(velden.map((v) => v.values?.[0] ?? "").find((w) => schoonDomein(w)) ?? null);
  if (!naam && !email) return null; // zonder naam én mail valt er niets op te volgen
  return {
    metaId: ruw.id,
    naam: naam ?? email ?? "Onbekend",
    email,
    telefoon,
    website,
    aangemaakt: ruw.created_time ? new Date(ruw.created_time) : new Date(),
  };
}

async function graph<T>(pad: string, sleutel: string): Promise<T> {
  const scheiding = pad.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}${pad}${scheiding}access_token=${encodeURIComponent(sleutel)}`);
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || data.error) throw new Error(`Meta ${pad.split("?")[0]}: ${data.error?.message ?? res.status}`);
  return data;
}

/**
 * Van bedrijfssleutel naar paginasleutel.
 *
 * Dit kostte een avond en daarom staat het hier uitgeschreven. Meta kent twee
 * soorten sleutels en /leadgen_forms accepteert er maar één:
 *
 * - Een SYSTEEMGEBRUIKER-sleutel werkt op bedrijfsniveau. Die maak je in
 *   Business Settings en die zet Jos in META_LEADS_TOKEN.
 * - Een PAGINA-sleutel hoort bij één pagina. Alleen die mag leadformulieren
 *   lezen; met de eerste krijg je "(#190) This method must be called with a
 *   Page Access Token".
 *
 * De tweede leid je af uit de eerste, en dat doen we hier. Komt uit een
 * systeemgebruiker-sleutel die nooit verloopt, dan verloopt de paginasleutel
 * ook niet. We bewaren hem in het geheugen van de draaiende instantie, want
 * een extra aanroep per bijwerkronde is zonde.
 *
 * Zet iemand er later tóch rechtstreeks een paginasleutel in, dan mislukt deze
 * omwisseling en gebruiken we de sleutel gewoon zoals hij is. Beter stil
 * doorwerken dan struikelen over een sleutel die al goed was.
 *
 * Benodigde rechten op de sleutel: leads_retrieval, pages_manage_ads
 * (ja, ook om te lezen), pages_show_list en business_management. Plus de
 * pagina toegewezen aan de systeemgebruiker MET leadtoegang.
 */
let paginaSleutelCache: { id: string; sleutel: string } | null = null;

async function paginaSleutel(paginaId: string): Promise<string> {
  const basis = process.env.META_LEADS_TOKEN!;
  if (paginaSleutelCache?.id === paginaId) return paginaSleutelCache.sleutel;
  try {
    const uit = await graph<{ access_token?: string }>(`/${paginaId}?fields=access_token`, basis);
    if (uit.access_token) {
      paginaSleutelCache = { id: paginaId, sleutel: uit.access_token };
      return uit.access_token;
    }
  } catch (e) {
    console.error("Paginasleutel ophalen mislukt, we proberen het met de sleutel zelf:", e);
  }
  return basis;
}

/** Alle leads van alle leadformulieren van de pagina (nieuwste eerst per formulier). */
export async function haalMetaLeads(): Promise<MetaLead[]> {
  if (!metaIngesteld()) return [];
  const paginaId = process.env.META_PAGE_ID ?? WORDSWAP_PAGINA;
  const sleutel = await paginaSleutel(paginaId);
  const formulieren = await graph<{ data: { id: string }[] }>(
    `/${paginaId}/leadgen_forms?fields=id,name,status&limit=50`,
    sleutel
  );
  const leads: MetaLead[] = [];
  for (const formulier of formulieren.data ?? []) {
    let pad: string | null = `/${formulier.id}/leads?fields=id,created_time,field_data&limit=100`;
    for (let pagina = 0; pad && pagina < 5; pagina++) {
      const stapel: { data?: RuweLead[]; paging?: { next?: string } } = await graph(pad, sleutel);
      for (const ruw of stapel.data ?? []) {
        const lead = mapMetaLead(ruw);
        if (lead) leads.push(lead);
      }
      // paging.next is een volledige URL inclusief token; wij bouwen zelf verder met de cursor
      const volgende = stapel.paging?.next ? new URL(stapel.paging.next).searchParams.get("after") : null;
      pad = volgende ? `/${formulier.id}/leads?fields=id,created_time,field_data&limit=100&after=${volgende}` : null;
    }
  }
  return leads;
}
