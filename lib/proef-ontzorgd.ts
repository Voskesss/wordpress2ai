/**
 * Proefmaand "Optimaal ontzorgd" met WhatsApp (besluit Jos 30-09-2026):
 *  - alleen wie Jos aanklikt krijgt het aanbod (mail met knop);
 *  - klikt de klant, dan staat WhatsApp een maand aan;
 *  - een week vooraf één herinnering met een ja-knop;
 *  - zegt hij ja: het maandbedrag gaat na de proef naar het ontzorgd-tarief
 *    via de bestaande geplande bedragwijziging (Mollie);
 *  - zegt hij niets: WhatsApp gaat vanzelf uit. NOOIT automatisch doorbelasten.
 */
import { randomBytes } from "node:crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, sites } from "@/db/schema";
import { PAKKETTEN } from "@/lib/aanbod";

export const PROEF_DAGEN = 30;
export const HERINNER_DAGEN_VOORAF = 7;
export const ONTZORGD_CENT = PAKKETTEN.ontzorgd.prijs * 100;
const DAG = 24 * 3_600_000;

export const datumNl = (d: Date) => d.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "long", year: "numeric" });
const ymd = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

/** Zuivere keuze per site: wat moet er nu gebeuren? */
export function beoordeelProef(tot: Date | null, herinnerd: boolean, nu = new Date()): "geen" | "loopt" | "herinneren" | "verlopen" {
  if (!tot) return "geen";
  const over = Math.ceil((tot.getTime() - nu.getTime()) / DAG);
  if (over <= 0) return "verlopen";
  if (over <= HERINNER_DAGEN_VOORAF && !herinnerd) return "herinneren";
  return "loopt";
}

/** Onraadbare code per site voor de knoppen in de mail (zelfde code als de planlink). */
export async function zorgSiteToken(siteId: number): Promise<string> {
  const [rij] = await db.select({ token: sites.afspraakToken }).from(sites).where(eq(sites.id, siteId));
  if (rij?.token) return rij.token;
  const token = randomBytes(18).toString("base64url");
  await db.update(sites).set({ afspraakToken: token }).where(eq(sites.id, siteId));
  return token;
}

export function proefLink(origin: string, token: string, actie: "start" | "ja"): string {
  return `${origin}/api/proef-ontzorgd?token=${encodeURIComponent(token)}&actie=${actie}`;
}

export async function siteViaToken(token: string) {
  if (!token || token.length < 10) return null;
  const [site] = await db.select().from(sites).where(eq(sites.afspraakToken, token));
  return site ?? null;
}

/** De klant klikt op "ja, ik probeer het": WhatsApp aan, maand loopt. */
export async function startProef(siteId: number, nu = new Date()): Promise<{ tot: Date; alLopend: boolean }> {
  const [site] = await db.select({ tot: sites.proefOntzorgdTot }).from(sites).where(eq(sites.id, siteId));
  if (site?.tot && site.tot.getTime() > nu.getTime()) return { tot: site.tot, alLopend: true };
  const tot = new Date(nu.getTime() + PROEF_DAGEN * DAG);
  await db.update(sites).set({ proefOntzorgdTot: tot, proefHerinnerd: false, whatsappActief: true }).where(eq(sites.id, siteId));
  return { tot, alLopend: false };
}

/** De klant zegt ja: proef sluit netjes af, WhatsApp blijft aan, bedrag gepland. */
export async function zegJa(siteId: number, nu = new Date()): Promise<{ vanaf: string; via: "gepland" | "meteen" | "geen-abonnement" }> {
  const [site] = await db.select({ tot: sites.proefOntzorgdTot }).from(sites).where(eq(sites.id, siteId));
  const einde = site?.tot && site.tot.getTime() > nu.getTime() ? site.tot : new Date(nu.getTime() + DAG);
  const vanaf = ymd(einde);
  await db.update(sites).set({ proefOntzorgdTot: null, proefHerinnerd: false, whatsappActief: true }).where(eq(sites.id, siteId));
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (!abo || abo.status === "gestopt") return { vanaf, via: "geen-abonnement" };
  if (abo.maandbedragCent >= ONTZORGD_CENT) return { vanaf, via: "meteen" };
  if (abo.status === "wacht_op_eerste") {
    await db.update(abonnementen).set({ maandbedragCent: ONTZORGD_CENT, bijgewerkt: new Date() }).where(eq(abonnementen.id, abo.id));
    return { vanaf, via: "meteen" };
  }
  // De dagelijkse abonnementencron voert dit door bij Mollie op de ingangsdatum
  await db.update(abonnementen).set({ nieuwBedragCent: ONTZORGD_CENT, nieuwBedragVanaf: vanaf, bijgewerkt: new Date() }).where(eq(abonnementen.id, abo.id));
  return { vanaf, via: "gepland" };
}

/** Dagelijks (gezondheidscron): herinneren en verlopen proeven uitzetten. */
export async function onderhoudProeven(origin: string, nu = new Date()): Promise<{ herinnerd: string[]; verlopen: string[]; fouten: string[] }> {
  const uit = { herinnerd: [] as string[], verlopen: [] as string[], fouten: [] as string[] };
  const lopend = await db.select().from(sites).where(and(isNotNull(sites.proefOntzorgdTot)));
  for (const site of lopend) {
    const actie = beoordeelProef(site.proefOntzorgdTot, site.proefHerinnerd, nu);
    if (actie === "geen" || actie === "loopt") continue;
    try {
      const { klantEmailVoorSite } = await import("./klant-email");
      const { mailVanJos } = await import("./wordswap-mail");
      const klant = await klantEmailVoorSite(site.id);
      if (actie === "herinneren") {
        if (klant) {
          const { bouwProefHerinnering } = await import("./klant-mails");
          const mail = bouwProefHerinnering({ naam: klant.naam, tot: site.proefOntzorgdTot!, jaUrl: proefLink(origin, await zorgSiteToken(site.id), "ja") });
          await mailVanJos({ naar: klant.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html });
        }
        await db.update(sites).set({ proefHerinnerd: true }).where(eq(sites.id, site.id));
        uit.herinnerd.push(site.naam);
      } else {
        // Verlopen zonder ja: WhatsApp uit, geen kosten, wel een berichtje
        await db.update(sites).set({ proefOntzorgdTot: null, proefHerinnerd: false, whatsappActief: false }).where(eq(sites.id, site.id));
        if (klant) {
          const { bouwProefVerlopen } = await import("./klant-mails");
          const mail = bouwProefVerlopen({ naam: klant.naam, jaUrl: proefLink(origin, await zorgSiteToken(site.id), "ja") });
          await mailVanJos({ naar: klant.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html });
        }
        uit.verlopen.push(site.naam);
      }
    } catch (e) {
      uit.fouten.push(`${site.naam}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return uit;
}
