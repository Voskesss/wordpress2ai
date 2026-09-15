/** Dunne koppeling met de Mollie-API (v2). Bedragen in Mollie zijn strings met twee decimalen. */

const BASIS = "https://api.mollie.com/v2";
export const SITE_URL = "https://wordswap.nl";
export const BTW = 0.21;

export function inclBtwCent(exclCent: number): number {
  return Math.round(exclCent * (1 + BTW));
}

export function euro(cent: number): string {
  return (cent / 100).toFixed(2);
}

export function euroTekst(cent: number): string {
  return `€${(cent / 100).toFixed(2).replace(".", ",")}`;
}

export function isTestmodus(): boolean {
  return (process.env.MOLLIE_API_KEY ?? "").startsWith("test_");
}

export async function mollie<T = Record<string, unknown>>(
  pad: string,
  opties: { methode?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) throw new Error("MOLLIE_API_KEY ontbreekt");
  const res = await fetch(`${BASIS}${pad}`, {
    method: opties.methode ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: opties.body ? JSON.stringify(opties.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 204) return {} as T;
  const data = (await res.json()) as T & { detail?: string; title?: string };
  if (!res.ok) {
    throw new Error(`Mollie ${res.status}: ${data.detail ?? data.title ?? "onbekende fout"}`);
  }
  return data;
}

export type MolliePayment = {
  id: string;
  status: "open" | "canceled" | "pending" | "authorized" | "expired" | "failed" | "paid";
  sequenceType: "oneoff" | "first" | "recurring";
  amount: { value: string; currency: string };
  description: string;
  customerId?: string;
  mandateId?: string;
  subscriptionId?: string;
  method?: string | null;
  amountRefunded?: { value: string; currency: string };
  amountChargedBack?: { value: string; currency: string };
  metadata?: { siteId?: number; verzoekId?: number; soort?: string } | null;
  details?: { bankReasonCode?: string; bankReason?: string } | null;
  _links: { checkout?: { href: string } };
};

export function centVan(bedrag?: { value: string } | null): number {
  return bedrag ? Math.round(Number(bedrag.value) * 100) : 0;
}

/** Vandaag in Nederland als YYYY-MM-DD. */
export function vandaagNl(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

/** Startdatum voor de maandelijkse incasso: dezelfde dag volgende maand (YYYY-MM-DD). */
export function volgendeMaand(vanaf = new Date()): string {
  const d = new Date(vanaf);
  const dag = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== dag) d.setDate(0);
  return d.toISOString().slice(0, 10);
}
