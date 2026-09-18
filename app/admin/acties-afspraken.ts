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
import { afspraakStand } from "@/lib/afspraken-db";
import { abonnementen } from "@/db/schema";

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

/** Het mailadres van de klant: abonnement, anders de uitnodiging, anders Clerk. */
async function klantAdres(site: typeof sites.$inferSelect): Promise<{ email: string; naam: string } | null> {
  const [abo] = await db
    .select({ email: abonnementen.email, naam: abonnementen.naam })
    .from(abonnementen)
    .where(eq(abonnementen.siteId, site.id))
    .catch(() => []);
  if (abo?.email) return { email: abo.email, naam: abo.naam };
  if (site.uitnodigingEmail) return { email: site.uitnodigingEmail, naam: site.naam };
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${site.clerkUserId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { email_addresses?: { email_address: string }[]; first_name?: string };
    const email = u.email_addresses?.[0]?.email_address;
    return email ? { email, naam: u.first_name ?? site.naam } : null;
  } catch {
    return null;
  }
}

export type MailUitkomst = { ok: boolean; melding: string };

/**
 * De klant uitnodigen: mailtje met de klaargezette dagen en de planlink. Kan de
 * klant niet op die dagen, dan vragen we hem te laten weten wanneer wél.
 */
export async function mailAfspraakVoorstel(
  _vorige: MailUitkomst | null,
  formData: FormData,
): Promise<MailUitkomst> {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return { ok: false, melding: "Onbekende klant." };
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return { ok: false, melding: "Onbekende klant." };
  const { blokken, token } = await afspraakStand(siteId);
  if (blokken.length === 0) return { ok: false, melding: "Zet eerst dagen klaar." };
  if (!token) return { ok: false, melding: "Er is nog geen planlink; zet eerst een dag klaar." };
  const ontvanger = await klantAdres(site);
  if (!ontvanger) return { ok: false, melding: "Geen e-mailadres bekend bij deze klant." };
  // Eigen berichtje van Jos: komt bovenaan de mail, in gewone alinea's
  const eigenTekst = String(formData.get("bericht") ?? "").trim().slice(0, 2000);
  const eigenHtml = eigenTekst
    .split(/\n{2,}/)
    .map((stuk) => `<p>${ontsnap(stuk).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const link = `https://www.wordswap.nl/afspraak/${token}`;
  const dagen = blokken
    .map(
      (b) =>
        `<li>${ontsnap(
          new Date(`${b.datum}T12:00:00`).toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
        )} tussen ${ontsnap(b.van)} en ${ontsnap(b.tot)}</li>`,
    )
    .join("");
  const duur = duurInWoorden(blokken[0].duurMinuten);

  const gelukt = await mailVanJos({
    naar: ontvanger.email,
    van: "Jos van WordSwap",
    onderwerp: `Even samen kijken naar ${site.naam}?`,
    html: `<p>Beste ${ontsnap((ontvanger.naam ?? "").split(" ")[0] || "klant")},</p>
${eigenHtml}
<p>Ik heb een paar momenten vrijgehouden om samen naar je website te kijken. Het gesprek duurt ${duur}; ik bel je.</p>
<ul>${dagen}</ul>
<p><a href="${link}" style="display:inline-block;background:#31956B;color:#fff !important;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600"><span style="color:#fff !important;text-decoration:none">Kies een moment</span></a></p>
<p style="color:#57534e;font-size:14px">Je kunt ook <a href="https://www.wordswap.nl/portal#afspraak" style="color:#6d28d9">inloggen op je eigen omgeving</a> en daar bij <em>Even samen kijken</em> een moment kiezen. Ben je ingelogd, dan hoef je niets in te vullen: je naam en e-mailadres neem ik over uit je account.</p>
<p>Komt geen van deze dagen uit? Laat het gerust weten, met een dag en tijd die jou wél schikt, dan plan ik dat in.</p>
<p>Met vriendelijke groet,<br>Jos Klijnhout<br>WordSwap</p>`,
  });
  if (!gelukt) return { ok: false, melding: "Versturen mislukte. Probeer het nog eens." };

  await db.update(sites).set({ afspraakMailOp: new Date() }).where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
  return { ok: true, melding: `Verstuurd naar ${ontvanger.email}.` };
}
