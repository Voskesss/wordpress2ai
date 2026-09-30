/**
 * WordPress-kopieën (terugweg-garantie) staan TIJDELIJK bij ons: de klant
 * downloadt hem in zijn portaal, daarna gaat hij weg. Zo betalen we niet
 * maandenlang voor opslag waar niets meer mee gebeurt (Jos, 30-09-2026, bij de
 * kopie van Van den Berg van 3,7 GB).
 *
 * Termijn: BEWAAR_DAGEN vanaf het uploaden. Een week vooraf krijgt de klant
 * één herinnering. Wie langer wil: Jos verlengt door de kopie opnieuw te
 * uploaden, of de klant bewaart hem zelf.
 */
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { wpBackups } from "@/db/schema";

export const BEWAAR_DAGEN = 30;
export const HERINNER_DAGEN_VOORAF = 7;
const HERINNERINGEN_SLEUTEL = "intern/backup-herinneringen.json";

const DAG = 24 * 3_600_000;

/** Kopieën van vóór deze regel (RoelArt, Vakbeursonline) kregen destijds te
 * horen dat ze "altijd" te downloaden waren; hun termijn telt daarom pas
 * vanaf de invoering, niet met terugwerkende kracht. */
export const INGEVOERD_OP = new Date("2026-09-30T00:00:00+02:00");

export function verlooptOp(aangemaakt: Date): Date {
  const basis = Math.max(aangemaakt.getTime(), INGEVOERD_OP.getTime());
  return new Date(basis + BEWAAR_DAGEN * DAG);
}

export function dagenOver(aangemaakt: Date, nu = new Date()): number {
  return Math.ceil((verlooptOp(aangemaakt).getTime() - nu.getTime()) / DAG);
}

export const datumNl = (d: Date) => d.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "long", year: "numeric" });

/** Tot wanneer staat de nieuwste kopie van deze site klaar (null = geen kopie). */
export async function kopieTotVoor(siteId: number): Promise<Date | null> {
  const rijen = await db.select({ aangemaakt: wpBackups.aangemaakt }).from(wpBackups).where(eq(wpBackups.siteId, siteId)).catch(() => []);
  if (rijen.length === 0) return null;
  return verlooptOp(new Date(Math.max(...rijen.map((r) => r.aangemaakt.getTime()))));
}

/** Zuivere keuze: wat moet er met een kopie gebeuren op dit moment? */
export function beoordeelKopie(aangemaakt: Date, herinnerd: boolean, nu = new Date()): "bewaren" | "herinneren" | "verwijderen" {
  const over = dagenOver(aangemaakt, nu);
  if (over <= 0) return "verwijderen";
  if (over <= HERINNER_DAGEN_VOORAF && !herinnerd) return "herinneren";
  return "bewaren";
}

async function leesHerinnerd(): Promise<Set<number>> {
  const { leesObject } = await import("./r2");
  const ruw = await leesObject(HERINNERINGEN_SLEUTEL).catch(() => null);
  if (!ruw) return new Set();
  try {
    return new Set(JSON.parse(ruw.toString("utf8")) as number[]);
  } catch {
    return new Set();
  }
}

/** Dagelijks (vanuit de gezondheidscron): herinneren en opruimen. */
export async function onderhoudKopieen(nu = new Date()): Promise<{ herinnerd: string[]; verwijderd: string[]; fouten: string[] }> {
  const uit = { herinnerd: [] as string[], verwijderd: [] as string[], fouten: [] as string[] };
  const rijen = await db.select().from(wpBackups);
  if (rijen.length === 0) return uit;
  const herinnerd = await leesHerinnerd();
  let herinnerdGewijzigd = false;
  const { sites } = await import("@/db/schema");
  for (const rij of rijen) {
    const actie = beoordeelKopie(rij.aangemaakt, herinnerd.has(rij.id), nu);
    if (actie === "bewaren") continue;
    const [site] = await db.select({ id: sites.id, naam: sites.naam }).from(sites).where(eq(sites.id, rij.siteId));
    const label = `${rij.bestandsnaam} (${site?.naam ?? "site " + rij.siteId})`;
    try {
      if (actie === "herinneren") {
        const { klantEmailVoorSite } = await import("./klant-email");
        const klant = await klantEmailVoorSite(rij.siteId);
        if (klant) {
          const { bouwKopieHerinnering } = await import("./klant-mails");
          const { mailVanJos } = await import("./wordswap-mail");
          const mail = bouwKopieHerinnering({ naam: klant.naam, bestandsnaam: rij.bestandsnaam, verlooptOp: verlooptOp(rij.aangemaakt) });
          await mailVanJos({ naar: klant.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html });
        }
        herinnerd.add(rij.id);
        herinnerdGewijzigd = true;
        uit.herinnerd.push(label);
      } else {
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (token) {
          const { del } = await import("@vercel/blob");
          await del(rij.url, { token });
        }
        await db.delete(wpBackups).where(and(eq(wpBackups.id, rij.id), lt(wpBackups.aangemaakt, new Date(nu.getTime() - BEWAAR_DAGEN * DAG + 1))));
        herinnerd.delete(rij.id);
        herinnerdGewijzigd = true;
        uit.verwijderd.push(label);
      }
    } catch (e) {
      uit.fouten.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (herinnerdGewijzigd) {
    const { schrijfObject } = await import("./r2");
    await schrijfObject(HERINNERINGEN_SLEUTEL, JSON.stringify([...herinnerd]), "application/json").catch(() => {});
  }
  return uit;
}
