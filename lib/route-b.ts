/**
 * Route B van de livegang: het domein van de klant blijft bij zijn hoster
 * (DNS en mail incluis) en alleen het websiteverkeer komt naar ons, via
 * Cloudflare for SaaS op de zone wordswap.nl. Zie lib/worker-verdeler.ts.
 *
 * Veiligheid van onze eigen site: de verdeler krijgt UITSLUITEND een route
 * per aangemeld klantdomein, nooit een vangnet-route. Alle eigen adressen
 * van wordswap.nl staan op "alleen DNS" en komen dus niet langs Cloudflare.
 */
import { ACCOUNT } from "./cloudflare";
import { R2_BUCKET, leesObject, schrijfObject } from "./r2";
import { DOMEINKAART_SLEUTEL, VERDELER_NAAM, VERDELER_VERSIE, bouwVerdelerScript, kaartDomein } from "./worker-verdeler";

const API = "https://api.cloudflare.com/client/v4";
export const SAAS_ZONE = "wordswap.nl";
export const ONTVANGSTADRES = "sites.wordswap.nl";

type Cf<T> = { success: boolean; result: T; errors?: { code: number; message: string }[] };

async function cf<T>(pad: string, init: RequestInit = {}, token = process.env.CLOUDFLARE_API_TOKEN): Promise<Cf<T>> {
  const res = await fetch(`${API}${pad}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  return (await res.json()) as Cf<T>;
}
const fout = (j: Cf<unknown>) => (j.errors ?? []).map((e) => `${e.code} ${e.message}`).join("; ") || "onbekende fout";

let zoneCache: string | null = null;
export async function saasZoneId(): Promise<string> {
  if (zoneCache) return zoneCache;
  const j = await cf<{ id: string }[]>(`/zones?name=${SAAS_ZONE}`);
  if (!j.success || !j.result[0]) throw new Error(`Zone ${SAAS_ZONE} niet gevonden: ${fout(j)}`);
  return (zoneCache = j.result[0].id);
}

/** Publiceert de verdeler als hij ontbreekt of een oudere versie draait. */
export async function zorgVerdeler(): Promise<"ongewijzigd" | "gepubliceerd"> {
  const nu = await cf<{ bindings?: { type: string; name: string; text?: string }[] }>(
    `/accounts/${ACCOUNT}/workers/scripts/${VERDELER_NAAM}/settings`,
  ).catch(() => null);
  const versie = nu?.result?.bindings?.find((b) => b.type === "plain_text" && b.name === "VERSIE")?.text;
  if (nu?.success && versie === VERDELER_VERSIE) return "ongewijzigd";
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2025-01-01",
    bindings: [
      { type: "r2_bucket", name: "SITES", bucket_name: R2_BUCKET },
      { type: "plain_text", name: "VERSIE", text: VERDELER_VERSIE },
    ],
  };
  const form = new FormData();
  form.append("metadata", new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" }));
  form.append("worker.js", new File([bouwVerdelerScript()], "worker.js", { type: "application/javascript+module" }));
  const j = await cf<unknown>(`/accounts/${ACCOUNT}/workers/scripts/${VERDELER_NAAM}`, { method: "PUT", body: form });
  if (!j.success) throw new Error(`Verdeler publiceren mislukt: ${fout(j)}`);
  return "gepubliceerd";
}

/** Het ontvangstadres als Fallback Origin instellen (de DNS-regel zelf staat
 * er al; die is eenmalig met de DNS-sleutel aangemaakt). */
export async function zorgOntvangstadres(): Promise<string> {
  const zone = await saasZoneId();
  // Wie het ontvangstadres zelf opent krijgt de nette "niet bekend"-pagina
  // van de verdeler in plaats van een Cloudflare-storing (522).
  const routes = await cf<{ pattern: string }[]>(`/zones/${zone}/workers/routes`);
  if (routes.success && !routes.result.some((r) => r.pattern === `${ONTVANGSTADRES}/*`)) {
    await cf(`/zones/${zone}/workers/routes`, { method: "POST", body: JSON.stringify({ pattern: `${ONTVANGSTADRES}/*`, script: VERDELER_NAAM }) });
  }
  const nu = await cf<{ origin?: string; status?: string }>(`/zones/${zone}/custom_hostnames/fallback_origin`);
  if (nu.success && nu.result?.origin === ONTVANGSTADRES) return nu.result.status ?? "onbekend";
  const j = await cf<{ status?: string }>(`/zones/${zone}/custom_hostnames/fallback_origin`, {
    method: "PUT",
    body: JSON.stringify({ origin: ONTVANGSTADRES }),
  });
  if (!j.success) throw new Error(`Ontvangstadres instellen mislukt: ${fout(j)}`);
  return j.result.status ?? "onbekend";
}

export type KaartRegel = string | { slug: string; hoofd?: "www" | "kaal" };
export const slugVan = (r: KaartRegel | undefined): string | null => (!r ? null : typeof r === "string" ? r : r.slug);

export async function leesDomeinkaart(): Promise<Record<string, KaartRegel>> {
  const ruw = await leesObject(DOMEINKAART_SLEUTEL);
  if (!ruw) return {};
  const kaart = JSON.parse(ruw.toString("utf8")) as Record<string, KaartRegel>;
  return kaart && typeof kaart === "object" ? kaart : {};
}

/** De domeinen die via route B aan deze site hangen (kaal + www). */
export async function routeBDomeinenVan(slug: string | null): Promise<string[]> {
  if (!slug) return [];
  const kaart = await leesDomeinkaart().catch(() => ({}) as Record<string, KaartRegel>);
  return Object.entries(kaart).filter(([, r]) => slugVan(r) === slug).flatMap(([d]) => adressenVan(d));
}

export type DomeinStatus = {
  adres: string;
  id: string | null;
  /** Herkent Cloudflare het adres als van ons (de hoster heeft doorverwezen)? */
  adresStatus: string;
  certificaatStatus: string;
  /** Regels die de hoster ALLEEN hoeft te zetten als hij vooraf wil bewijzen
   * dat het domein van de klant is (overstap zonder onderbreking). */
  controleRegels: { soort: string; naam: string; waarde: string }[];
  fouten: string[];
};

type Hostnaam = {
  id: string;
  hostname: string;
  status: string;
  verification_errors?: string[];
  ownership_verification?: { type: string; name: string; value: string };
  ssl?: { status?: string; validation_errors?: { message: string }[]; validation_records?: { txt_name?: string; txt_value?: string }[] };
};

function naarStatus(h: Hostnaam): DomeinStatus {
  const regels: DomeinStatus["controleRegels"] = [];
  if (h.ownership_verification?.name) regels.push({ soort: "TXT", naam: h.ownership_verification.name, waarde: h.ownership_verification.value });
  for (const v of h.ssl?.validation_records ?? []) if (v.txt_name && v.txt_value) regels.push({ soort: "TXT", naam: v.txt_name, waarde: v.txt_value });
  return {
    adres: h.hostname,
    id: h.id,
    adresStatus: h.status,
    certificaatStatus: h.ssl?.status ?? "onbekend",
    controleRegels: regels,
    fouten: [...(h.verification_errors ?? []), ...(h.ssl?.validation_errors ?? []).map((e) => e.message)],
  };
}

/** De twee adressen (kaal en www) van één klantdomein. */
export const adressenVan = (domein: string) => [domein, `www.${domein}`];

export async function statusVan(ruw: string): Promise<DomeinStatus[]> {
  const domein = kaartDomein(ruw);
  if (!domein) throw new Error(`Geen geldige domeinnaam: ${ruw}`);
  const zone = await saasZoneId();
  const uit: DomeinStatus[] = [];
  for (const adres of adressenVan(domein)) {
    const j = await cf<Hostnaam[]>(`/zones/${zone}/custom_hostnames?hostname=${encodeURIComponent(adres)}`);
    const h = j.success ? j.result.find((x) => x.hostname === adres) : null;
    uit.push(h ? naarStatus(h) : { adres, id: null, adresStatus: "niet aangemeld", certificaatStatus: "geen", controleRegels: [], fouten: j.success ? [] : [fout(j)] });
  }
  return uit;
}

/** Meldt een klantdomein aan: bij Cloudflare (kaal + www), als route naar de
 * verdeler, en in de domeinkaart. Veilig om te herhalen. */
export async function meldDomeinAan(ruw: string, slug: string, hoofd: "www" | "kaal" = "kaal"): Promise<DomeinStatus[]> {
  const domein = kaartDomein(ruw);
  if (!domein) throw new Error(`Geen geldige domeinnaam: ${ruw}`);
  if (domein === SAAS_ZONE || domein.endsWith(`.${SAAS_ZONE}`)) throw new Error("Een adres van wordswap.nl zelf mag nooit via de verdeler lopen.");
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug) || slug.startsWith("wv-")) throw new Error(`Ongeldige site: ${slug}`);
  const zone = await saasZoneId();
  await zorgVerdeler();
  await zorgOntvangstadres();

  const kaart = await leesDomeinkaart();
  const nu = slugVan(kaart[domein]);
  if (nu && nu !== slug) throw new Error(`${domein} hoort al bij site ${nu}. Eerst afmelden.`);
  kaart[domein] = hoofd === "www" ? { slug, hoofd } : slug;
  await schrijfObject(DOMEINKAART_SLEUTEL, JSON.stringify(kaart, null, 1), "application/json");

  const routes = await cf<{ id: string; pattern: string; script?: string }[]>(`/zones/${zone}/workers/routes`);
  for (const adres of adressenVan(domein)) {
    const bestaand = await cf<Hostnaam[]>(`/zones/${zone}/custom_hostnames?hostname=${encodeURIComponent(adres)}`);
    if (!bestaand.result?.some((x) => x.hostname === adres)) {
      const j = await cf<Hostnaam>(`/zones/${zone}/custom_hostnames`, {
        method: "POST",
        body: JSON.stringify({ hostname: adres, ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } } }),
      });
      if (!j.success) throw new Error(`Aanmelden van ${adres} mislukt: ${fout(j)}`);
    }
    const patroon = `${adres}/*`;
    if (!routes.result?.some((r) => r.pattern === patroon)) {
      const j = await cf<unknown>(`/zones/${zone}/workers/routes`, { method: "POST", body: JSON.stringify({ pattern: patroon, script: VERDELER_NAAM }) });
      if (!j.success) throw new Error(`Route voor ${adres} mislukt: ${fout(j)}`);
    }
  }
  return statusVan(domein);
}

/** Haalt een klantdomein weer weg (kaart, routes en aanmelding). */
export async function meldDomeinAf(ruw: string): Promise<void> {
  const domein = kaartDomein(ruw);
  if (!domein) throw new Error(`Geen geldige domeinnaam: ${ruw}`);
  const zone = await saasZoneId();
  const kaart = await leesDomeinkaart();
  delete kaart[domein];
  await schrijfObject(DOMEINKAART_SLEUTEL, JSON.stringify(kaart, null, 1), "application/json");
  const routes = await cf<{ id: string; pattern: string }[]>(`/zones/${zone}/workers/routes`);
  for (const adres of adressenVan(domein)) {
    for (const r of routes.result?.filter((x) => x.pattern === `${adres}/*`) ?? []) await cf(`/zones/${zone}/workers/routes/${r.id}`, { method: "DELETE" });
    const h = await cf<Hostnaam[]>(`/zones/${zone}/custom_hostnames?hostname=${encodeURIComponent(adres)}`);
    for (const x of h.result?.filter((y) => y.hostname === adres) ?? []) await cf(`/zones/${zone}/custom_hostnames/${x.id}`, { method: "DELETE" });
  }
}

/** De regels die de hoster in zijn DNS zet. Een verwijzing op het adres
 * zonder www kan alleen als zijn DNS dat toestaat (Cloudflare en beheerders
 * met ALIAS: ja). Kan het niet en is www het hoofdadres, dan stuurt de
 * hoster het kale adres zelf door naar www. */
export function regelsVoorHoster(ruw: string, hoofd: "www" | "kaal" = "kaal"): { soort: string; naam: string; waarde: string; uitleg: string }[] {
  const domein = kaartDomein(ruw);
  if (!domein) return [];
  return [
    { soort: "CNAME", naam: `www.${domein}`, waarde: ONTVANGSTADRES, uitleg: "Het adres met www. Bestaat er al een A-regel voor www, haal die dan eerst weg. Bij Cloudflare: wolkje grijs (alleen DNS)." },
    {
      soort: "CNAME of ALIAS",
      naam: domein,
      waarde: ONTVANGSTADRES,
      uitleg:
        hoofd === "www"
          ? "Het adres zonder www. Staat de DNS dit niet toe op het hoofddomein, stuur dit adres dan zelf door naar https://www." + domein + " (301)."
          : "Het adres zonder www: dit is het hoofdadres van de site. Haal eerst de bestaande A-regel weg. Staat de DNS geen verwijzing toe op het hoofddomein, dan werkt deze route hier niet en gaan de nameservers naar ons.",
    },
  ];
}
