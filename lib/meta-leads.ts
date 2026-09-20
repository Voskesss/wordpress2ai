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

async function graph<T>(pad: string): Promise<T> {
  const scheiding = pad.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}${pad}${scheiding}access_token=${encodeURIComponent(process.env.META_LEADS_TOKEN!)}`);
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || data.error) throw new Error(`Meta ${pad.split("?")[0]}: ${data.error?.message ?? res.status}`);
  return data;
}

/** Alle leads van alle leadformulieren van de pagina (nieuwste eerst per formulier). */
export async function haalMetaLeads(): Promise<MetaLead[]> {
  if (!metaIngesteld()) return [];
  const paginaId = process.env.META_PAGE_ID ?? WORDSWAP_PAGINA;
  const formulieren = await graph<{ data: { id: string }[] }>(`/${paginaId}/leadgen_forms?fields=id,name,status&limit=50`);
  const leads: MetaLead[] = [];
  for (const formulier of formulieren.data ?? []) {
    let pad: string | null = `/${formulier.id}/leads?fields=id,created_time,field_data&limit=100`;
    for (let pagina = 0; pad && pagina < 5; pagina++) {
      const stapel: { data?: RuweLead[]; paging?: { next?: string } } = await graph(pad);
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
