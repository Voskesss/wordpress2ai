"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { afspraakBlokken, afspraken, sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  duurInWoorden,
  maakIcs,
  minutenVan,
  momentInWoorden,

  STAP_MINUTEN,
} from "@/lib/afspraken";
import { mailVanJos, ontsnap } from "@/lib/wordswap-mail";

const DUREN = [30, 60, 90, 120];

/** Zorgt dat de site een onraadbare code heeft voor de deelbare planlink. */
async function zorgToken(siteId: number): Promise<string> {
  const [rij] = await db.select({ token: sites.afspraakToken }).from(sites).where(eq(sites.id, siteId));
  if (rij?.token) return rij.token;
  const token = randomBytes(18).toString("base64url");
  await db.update(sites).set({ afspraakToken: token }).where(eq(sites.id, siteId));
  return token;
}

export type BlokUitkomst = { ok: boolean; melding: string; datum?: string };

/** Eén dag met tijdvak klaarzetten voor deze klant. Geeft antwoord terug, zodat
 * het formulier meteen klaar kan staan voor de volgende dag. */
export async function zetAfspraakBlokKlaar(
  _vorige: BlokUitkomst | null,
  formData: FormData,
): Promise<BlokUitkomst> {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const datum = String(formData.get("datum") ?? "");
  const van = String(formData.get("van") ?? "");
  const tot = String(formData.get("tot") ?? "");
  const duurMinuten = Number(formData.get("duur"));
  if (!Number.isInteger(siteId)) return { ok: false, melding: "Onbekende klant." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || !/^\d{2}:\d{2}$/.test(van) || !/^\d{2}:\d{2}$/.test(tot)) {
    return { ok: false, melding: "Vul een geldige dag en tijden in." };
  }
  if (!DUREN.includes(duurMinuten)) return { ok: false, melding: "Kies een geldige gespreksduur." };
  if (minutenVan(tot) - minutenVan(van) < duurMinuten) {
    return { ok: false, melding: "Het tijdvak is korter dan het gesprek zelf." };
  }
  if (minutenVan(van) % STAP_MINUTEN !== 0 || minutenVan(tot) % STAP_MINUTEN !== 0) {
    return { ok: false, melding: "Gebruik hele of halve uren." };
  }
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  if (datum < vandaag) return { ok: false, melding: "Die dag is al geweest." };
  await zorgToken(siteId);
  await db.insert(afspraakBlokken).values({ siteId, datum, van, tot, duurMinuten });
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/portal");
  const dagTekst = new Date(`${datum}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return { ok: true, melding: `${dagTekst} klaargezet. Nog een dag erbij?`, datum };
}

/** Een klaargezette dag weer weghalen. */
export async function verwijderAfspraakBlok(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("blokId"));
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(id) || !Number.isInteger(siteId)) return;
  await db.delete(afspraakBlokken).where(and(eq(afspraakBlokken.id, id), eq(afspraakBlokken.siteId, siteId)));
  revalidatePath(`/admin/klant/${siteId}`);
}

/** Alle klaargezette dagen van deze klant weghalen (bv. na een afspraak). */
async function ruimBlokkenOp(siteId: number) {
  await db.delete(afspraakBlokken).where(eq(afspraakBlokken.siteId, siteId));
}

/**
 * Bevestigen: de klant krijgt de bevestiging met agendabestand, Jos krijgt hem
 * ook in zijn agenda, en de voorgestelde dagen verdwijnen.
 */
export async function bevestigAfspraak(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("afspraakId"));
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(id) || !Number.isInteger(siteId)) return;
  const [afspraak] = await db
    .select()
    .from(afspraken)
    .where(and(eq(afspraken.id, id), eq(afspraken.siteId, siteId)));
  if (!afspraak || afspraak.status !== "aangevraagd") return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;

  await db
    .update(afspraken)
    .set({ status: "bevestigd", bevestigdOp: new Date() })
    .where(eq(afspraken.id, id));
  // Andere openstaande aanvragen van deze klant vervallen, net als de dagen
  await db
    .update(afspraken)
    .set({ status: "geannuleerd" })
    .where(and(eq(afspraken.siteId, siteId), eq(afspraken.status, "aangevraagd")));
  await ruimBlokkenOp(siteId);

  const wanneer = momentInWoorden(afspraak.start, afspraak.duurMinuten);
  const titel = `WordSwap — ${site.naam}`;
  const ics = Buffer.from(
    maakIcs({
      id: afspraak.id,
      start: afspraak.start,
      duurMinuten: afspraak.duurMinuten,
      titel,
      omschrijving: `${afspraak.onderwerp ?? "Afspraak over je website"}${
        afspraak.opmerking ? `\n\n${afspraak.opmerking}` : ""
      }\n\nJos belt je op ${afspraak.telefoon ?? "het afgesproken nummer"}.`,
      organisator: { naam: "Jos Klijnhout", email: "jos@wordswap.nl" },
      deelnemerEmail: afspraak.email,
      gemaaktOp: afspraak.aangemaakt,
    }),
    "utf8",
  );
  const bijlagen = [{ bestandsnaam: "afspraak.ics", inhoud: ics }];

  if (afspraak.email) {
    await mailVanJos({
      naar: afspraak.email,
      van: "Jos van WordSwap",
      onderwerp: `Afspraak bevestigd: ${wanneer}`,
      html: `<p>Beste ${ontsnap((afspraak.naam ?? "").split(" ")[0] || "klant")},</p>
<p>De afspraak staat: <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(afspraak.duurMinuten)}).</p>
<p>Ik bel je op ${ontsnap(afspraak.telefoon ?? "het nummer dat ik van je heb")}. In de bijlage zit een agendabestand; met één klik zet je de afspraak in je eigen agenda.</p>
${afspraak.opmerking ? `<p>Je berichtje: ${ontsnap(afspraak.opmerking)}</p>` : ""}
<p>Komt het toch niet uit? Mail of bel me gerust, dan zoeken we een ander moment.</p>
<p>Met vriendelijke groet,<br>Jos Klijnhout<br>WordSwap</p>`,
      bijlagen,
    });
  }
  await mailVanJos({
    naar: "jos@wordswap.nl",
    bcc: false,
    onderwerp: `📅 Afspraak bevestigd: ${site.naam} — ${wanneer}`,
    html: `<p>Bevestigd met <strong>${ontsnap(afspraak.naam ?? site.naam)}</strong>${
      afspraak.email ? ` (${ontsnap(afspraak.email)})` : ""
    }.</p>
<ul>
<li>Wanneer: <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(afspraak.duurMinuten)})</li>
<li>Telefoon: ${ontsnap(afspraak.telefoon ?? "niet opgegeven")}</li>
${afspraak.opmerking ? `<li>Bericht: ${ontsnap(afspraak.opmerking)}</li>` : ""}
</ul>
<p>Het agendabestand zit in de bijlage. De klant heeft een bevestiging gekregen en de voorgestelde dagen zijn weggehaald.</p>`,
    bijlagen,
  });
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/portal");
}

/** Een aanvraag of afspraak afzeggen; de klant hoort het per mail. */
export async function annuleerAfspraak(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("afspraakId"));
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(id) || !Number.isInteger(siteId)) return;
  const [afspraak] = await db
    .select()
    .from(afspraken)
    .where(and(eq(afspraken.id, id), eq(afspraken.siteId, siteId)));
  if (!afspraak || afspraak.status === "geannuleerd") return;
  await db.update(afspraken).set({ status: "geannuleerd" }).where(eq(afspraken.id, id));
  if (afspraak.email) {
    await mailVanJos({
      naar: afspraak.email,
      van: "Jos van WordSwap",
      onderwerp: "Afspraak gaat niet door",
      html: `<p>Beste ${ontsnap((afspraak.naam ?? "").split(" ")[0] || "klant")},</p>
<p>Het moment van <strong>${ontsnap(momentInWoorden(afspraak.start, afspraak.duurMinuten))}</strong> gaat helaas niet door. Ik neem contact met je op voor een nieuw moment.</p>
<p>Met vriendelijke groet,<br>Jos Klijnhout<br>WordSwap</p>`,
    });
  }
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/portal");
}
