"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { afspraakBlokken, afspraken, leads, sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  duurInWoorden,
  maakIcs,
  minutenVan,
  momentInWoorden,

  STAP_MINUTEN,
} from "@/lib/afspraken";
import { inWordSwapHuisstijl, mailVanJos, ontsnap } from "@/lib/wordswap-mail";
import {
  afspraakStand,
  afspraakVan,
  blokVan,
  eigenaarKolommen,
  eigenaarPad,
  type Eigenaar,
} from "@/lib/afspraken-db";
import { klantAdres } from "@/lib/klant-adres";
import { werkLeadStatusBijAfspraak } from "@/lib/lead-afspraakstatus";
import { bouwAfspraakAfzegging, bouwAfspraakBevestiging, bouwAfspraakUitnodiging, contactZin } from "@/lib/klant-mails";

const DUREN = [30, 60, 90, 120];

/**
 * Wie hoort bij dit formulier? Een klantpagina stuurt siteId mee, de leadlijst
 * leadId. Number("") is 0, dus we eisen een echt positief getal.
 */
function eigenaarUitForm(formData: FormData): Eigenaar | null {
  const leadId = Number(formData.get("leadId"));
  if (Number.isInteger(leadId) && leadId > 0) return { soort: "lead", id: leadId };
  const siteId = Number(formData.get("siteId"));
  if (Number.isInteger(siteId) && siteId > 0) return { soort: "site", id: siteId };
  return null;
}

/**
 * Naam, aanhef, mailadres en adminpad van de eigenaar, voor mails en links.
 * `naam` is waar het over gaat (de site, of de naam van de lead), `aanhef` is
 * de persoon die de mail leest: bij een klant de naam uit het abonnement.
 */
async function eigenaarInfo(
  e: Eigenaar,
): Promise<{ naam: string; aanhef: string; email: string | null; pad: string } | null> {
  if (e.soort === "site") {
    const [site] = await db.select().from(sites).where(eq(sites.id, e.id));
    if (!site) return null;
    const adres = await klantAdres(site);
    return { naam: site.naam, aanhef: adres?.naam ?? site.naam, email: adres?.email ?? null, pad: eigenaarPad(e) };
  }
  const [lead] = await db.select().from(leads).where(eq(leads.id, e.id));
  if (!lead) return null;
  return { naam: lead.naam, aanhef: lead.naam, email: lead.email?.trim() || null, pad: eigenaarPad(e) };
}

/** De schermen die na een wijziging opnieuw moeten worden opgebouwd. */
function verversEigenaar(e: Eigenaar) {
  revalidatePath(eigenaarPad(e));
  if (e.soort === "site") revalidatePath("/portal");
  revalidatePath("/admin/afspraken");
}

/** Zorgt dat de eigenaar een onraadbare code heeft voor de deelbare planlink. */
async function zorgToken(e: Eigenaar): Promise<string> {
  const bestaand =
    e.soort === "site"
      ? (await db.select({ token: sites.afspraakToken }).from(sites).where(eq(sites.id, e.id)))[0]?.token
      : (await db.select({ token: leads.afspraakToken }).from(leads).where(eq(leads.id, e.id)))[0]?.token;
  if (bestaand) return bestaand;
  const token = randomBytes(18).toString("base64url");
  if (e.soort === "site") await db.update(sites).set({ afspraakToken: token }).where(eq(sites.id, e.id));
  else await db.update(leads).set({ afspraakToken: token }).where(eq(leads.id, e.id));
  return token;
}

/** Het stempel "uitnodiging verstuurd" wissen of zetten. */
async function zetMailStempel(e: Eigenaar, moment: Date | null) {
  if (e.soort === "site") await db.update(sites).set({ afspraakMailOp: moment }).where(eq(sites.id, e.id));
  else await db.update(leads).set({ afspraakMailOp: moment }).where(eq(leads.id, e.id));
}

export type BlokUitkomst = { ok: boolean; melding: string; datum?: string };

/** Eén dag met tijdvak klaarzetten voor deze klant of lead. Geeft antwoord terug,
 * zodat het formulier meteen klaar kan staan voor de volgende dag. */
export async function zetAfspraakBlokKlaar(
  _vorige: BlokUitkomst | null,
  formData: FormData,
): Promise<BlokUitkomst> {
  await requireAdmin();
  const eigenaar = eigenaarUitForm(formData);
  const datum = String(formData.get("datum") ?? "");
  const van = String(formData.get("van") ?? "");
  const tot = String(formData.get("tot") ?? "");
  const duurMinuten = Number(formData.get("duur"));
  if (!eigenaar) return { ok: false, melding: "Onbekende klant." };
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
  if (!(await eigenaarInfo(eigenaar))) return { ok: false, melding: "Onbekende klant." };
  await zorgToken(eigenaar);
  // Eerste dag van een nieuwe ronde? Dan hoort de oude "uitnodiging verstuurd"-
  // stempel niet meer bij deze dagen: wissen, zodat de mailknop weer vers begint.
  const [alIets] = await db.select({ id: afspraakBlokken.id }).from(afspraakBlokken).where(blokVan(eigenaar)).limit(1);
  if (!alIets) await zetMailStempel(eigenaar, null);
  await db.insert(afspraakBlokken).values({ ...eigenaarKolommen(eigenaar), datum, van, tot, duurMinuten });
  verversEigenaar(eigenaar);
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
  const eigenaar = eigenaarUitForm(formData);
  if (!Number.isInteger(id) || !eigenaar) return;
  await db.delete(afspraakBlokken).where(and(eq(afspraakBlokken.id, id), blokVan(eigenaar)));
  const [over] = await db.select({ id: afspraakBlokken.id }).from(afspraakBlokken).where(blokVan(eigenaar)).limit(1);
  if (!over) await zetMailStempel(eigenaar, null);
  verversEigenaar(eigenaar);
}

/** Alle klaargezette dagen van deze eigenaar weghalen (bv. na een afspraak). */
async function ruimBlokkenOp(eigenaar: Eigenaar) {
  await db.delete(afspraakBlokken).where(blokVan(eigenaar));
}

/**
 * Bevestigen: de klant krijgt de bevestiging met agendabestand, Jos krijgt hem
 * ook in zijn agenda, en de voorgestelde dagen verdwijnen.
 */
export async function bevestigAfspraak(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("afspraakId"));
  const eigenaar = eigenaarUitForm(formData);
  // Contact: leeg = bellen op het opgegeven nummer; een nummer = dat nummer;
  // een zin ("Ik stuur je een Teams-uitnodiging.") wordt letterlijk gebruikt.
  const contact = String(formData.get("contact") ?? "").trim().slice(0, 200) || null;
  const eigenTekst = String(formData.get("bericht") ?? "").trim().slice(0, 2000) || null;
  const eigenOnderwerp = String(formData.get("onderwerp") ?? "").trim().slice(0, 150) || null;
  if (!Number.isInteger(id) || !eigenaar) return;
  const [afspraak] = await db
    .select()
    .from(afspraken)
    .where(and(eq(afspraken.id, id), afspraakVan(eigenaar)));
  if (!afspraak || afspraak.status !== "aangevraagd") return;
  const info = await eigenaarInfo(eigenaar);
  if (!info) return;

  await db
    .update(afspraken)
    .set({ status: "bevestigd", bevestigdOp: new Date(), contact })
    .where(eq(afspraken.id, id));
  // Andere openstaande aanvragen van deze eigenaar vervallen, net als de dagen
  await db
    .update(afspraken)
    .set({ status: "geannuleerd" })
    .where(and(afspraakVan(eigenaar), eq(afspraken.status, "aangevraagd")));
  await ruimBlokkenOp(eigenaar);
  await zetMailStempel(eigenaar, null);
  // Staat er nu een gesprek in de agenda, dan hoort de lead op "Afspraak gepland"
  if (eigenaar.soort === "lead") await werkLeadStatusBijAfspraak(eigenaar.id);

  const wanneer = momentInWoorden(afspraak.start, afspraak.duurMinuten);
  const titel = `WordSwap — ${info.naam}`;
  const ics = Buffer.from(
    maakIcs({
      id: afspraak.id,
      start: afspraak.start,
      duurMinuten: afspraak.duurMinuten,
      titel,
      omschrijving: `${afspraak.onderwerp ?? "Afspraak over je website"}${
        afspraak.opmerking ? `\n\n${afspraak.opmerking}` : ""
      }\n\n${contactZin(contact ?? afspraak.telefoon)}`,
      organisator: { naam: "Jos Klijnhout", email: "jos@wordswap.nl" },
      deelnemerEmail: afspraak.email,
      gemaaktOp: afspraak.aangemaakt,
    }),
    "utf8",
  );
  const bijlagen = [{ bestandsnaam: "afspraak.ics", inhoud: ics }];

  if (afspraak.email) {
    const mail = bouwAfspraakBevestiging({ ...afspraak, contact, eigenTekst, eigenOnderwerp });
    await mailVanJos({ naar: afspraak.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html, bijlagen });
  }
  await mailVanJos({
    naar: "jos@wordswap.nl",
    bcc: false,
    onderwerp: `📅 Afspraak bevestigd: ${info.naam} — ${wanneer}`,
    html: `<p>Bevestigd met <strong>${ontsnap(afspraak.naam ?? info.naam)}</strong>${
      afspraak.email ? ` (${ontsnap(afspraak.email)})` : ""
    }${eigenaar.soort === "lead" ? " — <strong>potentiële klant</strong> uit de leadlijst" : ""}.</p>
<ul>
<li>Wanneer: <strong>${ontsnap(wanneer)}</strong> (${duurInWoorden(afspraak.duurMinuten)})</li>
<li>Telefoon: ${ontsnap(afspraak.telefoon ?? "niet opgegeven")}</li>
${afspraak.opmerking ? `<li>Bericht: ${ontsnap(afspraak.opmerking)}</li>` : ""}
</ul>
<p>Het agendabestand zit in de bijlage. De klant heeft een bevestiging gekregen en de voorgestelde dagen zijn weggehaald.</p>`,
    bijlagen,
  });
  verversEigenaar(eigenaar);
}

/** Een aanvraag of afspraak afzeggen; de klant hoort het per mail. */
export async function annuleerAfspraak(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("afspraakId"));
  const eigenaar = eigenaarUitForm(formData);
  const reden = String(formData.get("reden") ?? "").trim().slice(0, 500);
  if (!Number.isInteger(id) || !eigenaar) return;
  const [afspraak] = await db
    .select()
    .from(afspraken)
    .where(and(eq(afspraken.id, id), afspraakVan(eigenaar)));
  if (!afspraak || afspraak.status === "geannuleerd") return;
  await db
    .update(afspraken)
    .set({ status: "geannuleerd", afzegReden: reden || null })
    .where(eq(afspraken.id, id));
  // Geen afspraak meer? Dan mag "Afspraak gepland" ook weer weg
  if (eigenaar.soort === "lead") await werkLeadStatusBijAfspraak(eigenaar.id);
  if (afspraak.email) {
    const mail = bouwAfspraakAfzegging({ ...afspraak, reden });
    await mailVanJos({ naar: afspraak.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html });
  }
  verversEigenaar(eigenaar);
}


export type MailUitkomst = { ok: boolean; melding: string };

/**
 * De klant of potentiële klant uitnodigen: mailtje met de klaargezette dagen en
 * de planlink. Kan hij niet op die dagen, dan vragen we hem te laten weten
 * wanneer wél.
 */
export async function mailAfspraakVoorstel(
  _vorige: MailUitkomst | null,
  formData: FormData,
): Promise<MailUitkomst> {
  await requireAdmin();
  const eigenaar = eigenaarUitForm(formData);
  if (!eigenaar) return { ok: false, melding: "Onbekende klant." };
  const info = await eigenaarInfo(eigenaar);
  if (!info) return { ok: false, melding: "Onbekende klant." };
  const { blokken, token } = await afspraakStand(eigenaar);
  if (blokken.length === 0) return { ok: false, melding: "Zet eerst dagen klaar." };
  if (!token) return { ok: false, melding: "Er is nog geen planlink; zet eerst een dag klaar." };
  if (!info.email) {
    return {
      ok: false,
      melding:
        eigenaar.soort === "lead"
          ? "Deze lead heeft geen e-mailadres; vul het eerst in bij zijn gegevens."
          : "Geen e-mailadres bekend bij deze klant.",
    };
  }
  const eigenTekst = String(formData.get("bericht") ?? "").trim().slice(0, 2000);
  const zonderStandaard = formData.get("zonderStandaard") === "on";
  const onderwerp = String(formData.get("onderwerp") ?? "").trim().slice(0, 150);
  if (zonderStandaard && !eigenTekst) {
    return { ok: false, melding: "Laat je de standaardzin weg, schrijf dan zelf een berichtje." };
  }
  const mail = bouwAfspraakUitnodiging({
    siteNaam: info.naam,
    naam: info.aanhef,
    link: `https://www.wordswap.nl/afspraak/${token}`,
    duurMinuten: blokken[0].duurMinuten,
    dagen: blokken,
    eigenTekst,
    zonderStandaard,
    soort: eigenaar.soort === "lead" ? "lead" : "klant",
    onderwerp,
  });
  const gelukt = await mailVanJos({ naar: info.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html });
  if (!gelukt) return { ok: false, melding: "Versturen mislukte. Probeer het nog eens." };

  await zetMailStempel(eigenaar, new Date());
  verversEigenaar(eigenaar);
  return { ok: true, melding: `Verstuurd naar ${info.email}.` };
}
