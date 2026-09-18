/**
 * Gegevens ophalen voor de afsprakenmodule. Bewust GEEN "use server"-bestand:
 * daar is elke geëxporteerde functie van buitenaf aanroepbaar, en deze
 * functies doen zelf geen rechtencontrole. Ze worden alleen aangeroepen vanaf
 * de server (adminpagina en planpagina), nooit vanuit de browser.
 */
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { afspraakBlokken, afspraken, sites } from "@/db/schema";

/** Alles wat de klantpagina nodig heeft: klaargezette dagen, aanvragen en de planlink. */
export async function afspraakStand(siteId: number) {
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const [blokken, rijen, [site]] = await Promise.all([
    db.select().from(afspraakBlokken).where(eq(afspraakBlokken.siteId, siteId)),
    db
      .select()
      .from(afspraken)
      .where(and(eq(afspraken.siteId, siteId), inArray(afspraken.status, ["aangevraagd", "bevestigd"]))),
    db.select({ token: sites.afspraakToken, mailOp: sites.afspraakMailOp }).from(sites).where(eq(sites.id, siteId)),
  ]);
  return {
    blokken: blokken
      .filter((b) => b.datum >= vandaag)
      .sort((a, b) => (a.datum + a.van < b.datum + b.van ? -1 : 1)),
    afspraken: rijen.sort((a, b) => a.start.getTime() - b.start.getTime()),
    token: site?.token ?? null,
    mailOp: site?.mailOp ?? null,
  };
}

/** Alle bevestigde afspraken vanaf nu — die blokkeren tijd bij élke klant. */
export async function bezetteTijden() {
  return db
    .select({ start: afspraken.start, duurMinuten: afspraken.duurMinuten })
    .from(afspraken)
    .where(and(eq(afspraken.status, "bevestigd"), gte(afspraken.start, new Date())));
}
