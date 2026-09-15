"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { abonnementen, betaalverzoeken, betalingen, facturen, sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { creditBijTerugbetaling, maakOpdrachtbevestigingPdf, mailFactuur, vervangFactuur } from "@/lib/factuur";
import { handtekening } from "@/lib/mailer";
import { euro, euroTekst, inclBtwCent, mollie, SITE_URL, vandaagNl, type MolliePayment } from "@/lib/mollie";
import { mailVanJos, ontsnap } from "@/lib/wordswap-mail";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function terug(siteId: number, melding: string): never {
  redirect(`/admin/klant/${siteId}?abonnement=${encodeURIComponent(melding)}#abonnement`);
}

function siteIdVan(formData: FormData): number | null {
  const id = Number(formData.get("siteId"));
  return Number.isInteger(id) ? id : null;
}

function tekst(formData: FormData, naam: string): string | null {
  const w = String(formData.get(naam) ?? "").trim();
  return w || null;
}

/** Leeg = 0, ongeldig = NaN. */
function bedragVeld(formData: FormData, naam: string): number {
  const w = String(formData.get(naam) ?? "").trim().replace(",", ".");
  if (w === "") return 0;
  const n = Number(w);
  return Number.isFinite(n) ? n : NaN;
}

function datumVeld(formData: FormData, naam: string): string | null {
  const d = tekst(formData, naam);
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function datumNl(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

const nieuwToken = () => randomBytes(18).toString("base64url");
const betaalUrl = (token: string) => `${SITE_URL}/betalen/${token}`;

function knop(url: string, label: string): string {
  return `<p><a href="${url}" style="display:inline-block;background:#31956B;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">${label}</a></p>`;
}

function mailHtml(naam: string, inhoud: string): string {
  return `<p>Beste ${ontsnap(naam.split(" ")[0])},</p>${inhoud}<p>Met vriendelijke groet,</p>${handtekening(false)}`;
}

/** Start een abonnement: eigen betaallink voor de eerste betaling (omzetting + eerste maand). */
export async function startAbonnement(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  if (siteId === null) return;
  const naam = tekst(formData, "naam");
  const email = tekst(formData, "email");
  const maand = bedragVeld(formData, "bedrag");
  const eenmalig = bedragVeld(formData, "eenmalig");
  if (!naam || !email || !EMAIL.test(email)) terug(siteId, "Vul een naam en geldig e-mailadres in.");
  if (!(maand >= 1 && maand <= 1000)) terug(siteId, "Vul een maandbedrag tussen €1 en €1000 in.");
  if (!(eenmalig >= 0 && eenmalig <= 20000)) terug(siteId, "Vul een geldig bedrag voor de omzetting in (of laat het leeg).");

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const [bestaand] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (bestaand?.status === "actief" || bestaand?.status === "mislukt") {
    terug(siteId, "Er loopt al een incasso. Stop die eerst.");
  }

  const maandCent = Math.round(maand * 100);
  const eenmaligCent = Math.round(eenmalig * 100);
  const klant = {
    klantBedrijf: tekst(formData, "bedrijf"),
    klantAdres: tekst(formData, "adres"),
    klantBtw: tekst(formData, "btw"),
    klantKvk: tekst(formData, "kvk"),
  };

  await db
    .update(betaalverzoeken)
    .set({ status: "geannuleerd" })
    .where(and(eq(betaalverzoeken.siteId, siteId), eq(betaalverzoeken.soort, "eerste"), eq(betaalverzoeken.status, "open")));
  const token = nieuwToken();
  await db.insert(betaalverzoeken).values({
    token,
    siteId,
    soort: "eerste",
    wijze: "link",
    omschrijving: eenmaligCent > 0 ? "Omzetting van je website en eerste maand" : "Eerste maand hosting, beheer en AI-portaal",
    bedragExclCent: maandCent + eenmaligCent,
    klantNaam: naam,
    klantEmail: email,
    ...klant,
  });

  const waarden = {
    email,
    naam,
    ...klant,
    maandbedragCent: maandCent,
    eenmaligCent,
    status: "wacht_op_eerste" as const,
    mollieMandateId: null,
    mollieSubscriptionId: null,
    stoptOp: null,
    nieuwBedragCent: null,
    nieuwBedragVanaf: null,
    betaallink: betaalUrl(token),
    bijgewerkt: new Date(),
  };
  const [abo] = await db
    .insert(abonnementen)
    .values({ siteId, ...waarden })
    .onConflictDoUpdate({ target: abonnementen.siteId, set: waarden })
    .returning();
  revalidatePath(`/admin/klant/${siteId}`);
  const gemaild = await verstuurBetaallinkMail(abo, site.naam);
  terug(
    siteId,
    gemaild
      ? `Klaar: betaallink en opdrachtbevestiging zijn gemaild naar ${email} (kopie naar jos@wordswap.nl). De link verloopt niet.`
      : "Betaallink aangemaakt, maar het mailen mislukte. Probeer 'Opnieuw mailen' hieronder.",
  );
}

/** De betaallink-mail met de opdrachtbevestiging als bijlage; gedeeld door aanmaken en opnieuw mailen. */
async function verstuurBetaallinkMail(abo: typeof abonnementen.$inferSelect, siteNaam: string): Promise<boolean> {
  if (!abo.betaallink) return false;
  const eersteIncl = inclBtwCent(abo.maandbedragCent + abo.eenmaligCent);
  const uitleg =
    abo.eenmaligCent > 0
      ? `<p>Via de knop hieronder betaal je in één keer de omzetting van je website (${euroTekst(abo.eenmaligCent)}) en je eerste maand hosting, beheer en AI-portaal (${euroTekst(abo.maandbedragCent)}). Samen is dat <strong>${euroTekst(eersteIncl)} inclusief btw</strong>.</p>
<p>Daarna wordt alleen het maandbedrag van ${euroTekst(abo.maandbedragCent)} (${euroTekst(inclBtwCent(abo.maandbedragCent))} inclusief btw) automatisch afgeschreven.</p>`
      : `<p>Via de knop hieronder start je je maandbedrag van <strong>${euroTekst(abo.maandbedragCent)} per maand</strong> (${euroTekst(eersteIncl)} inclusief btw) voor hosting, beheer en het AI-portaal.</p>`;
  const pdf = await maakOpdrachtbevestigingPdf({
    siteNaam,
    klantNaam: abo.naam,
    klantBedrijf: abo.klantBedrijf,
    klantAdres: abo.klantAdres,
    klantEmail: abo.email,
    maandbedragCent: abo.maandbedragCent,
    eenmaligCent: abo.eenmaligCent,
  });
  return mailVanJos({
    naar: abo.email,
    van: "Jos van WordSwap",
    onderwerp: "Je betaling voor WordSwap — opdrachtbevestiging bijgesloten",
    html: mailHtml(
      abo.naam,
      `<p>Fijn dat je website bij WordSwap draait!</p>${uitleg}${knop(abo.betaallink, "Betalen via iDEAL")}
<p>In de bijlage vind je de opdrachtbevestiging: wat we leveren, wat het kost en welke afspraken erbij horen. Door te betalen ga je daarmee akkoord, en met de <a href="https://wordswap.nl/voorwaarden">algemene voorwaarden</a> en de <a href="https://wordswap.nl/verwerkersovereenkomst">verwerkersovereenkomst</a>.</p>
<p>Met deze betaling geef je ook toestemming om het maandbedrag voortaan automatisch af te schrijven, zodat je er verder niet meer aan hoeft te denken. Je krijgt bij elke betaling automatisch een factuur. Opzeggen kan altijd per maand: een mailtje is genoeg.</p>`,
    ),
    bijlagen: [{ bestandsnaam: "Opdrachtbevestiging-WordSwap.pdf", inhoud: Buffer.from(pdf) }],
  });
}

/** Mailt de betaallink (met opdrachtbevestiging) opnieuw naar de klant. */
export async function mailBetaallink(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  if (siteId === null) return;
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (!abo?.betaallink) terug(siteId, "Er is geen openstaande betaallink.");
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  const gelukt = await verstuurBetaallinkMail(abo, site?.naam ?? "je website");
  terug(siteId, gelukt ? `Betaallink en opdrachtbevestiging opnieuw gemaild naar ${abo.email} (kopie naar jos@wordswap.nl).` : "Mailen mislukt, probeer het opnieuw.");
}

/** Losse opdracht: via een betaallink, of afschrijven met de bestaande machtiging (alleen met akkoord van de klant). */
export async function losseOpdracht(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  if (siteId === null) return;
  const omschrijving = tekst(formData, "omschrijving");
  const bedrag = bedragVeld(formData, "bedrag");
  const wijze = formData.get("wijze") === "incasso" ? "incasso" : "link";
  if (!omschrijving) terug(siteId, "Vul een omschrijving in voor de losse opdracht.");
  if (!(bedrag >= 1 && bedrag <= 20000)) terug(siteId, "Vul een bedrag tussen €1 en €20.000 in.");

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  const naam = abo?.naam ?? tekst(formData, "naam");
  const email = abo?.email ?? tekst(formData, "email");
  if (!naam || !email || !EMAIL.test(email)) terug(siteId, "Vul de naam en het e-mailadres van de klant in.");

  const exclCent = Math.round(bedrag * 100);
  const inclCent = inclBtwCent(exclCent);
  const bedragTekst = `${euroTekst(exclCent)} exclusief btw (${euroTekst(inclCent)} inclusief btw)`;
  const klant = {
    klantNaam: naam,
    klantEmail: email,
    klantBedrijf: abo?.klantBedrijf ?? tekst(formData, "bedrijf"),
    klantAdres: abo?.klantAdres ?? null,
    klantBtw: abo?.klantBtw ?? null,
    klantKvk: abo?.klantKvk ?? null,
  };
  const token = nieuwToken();

  if (wijze === "incasso") {
    if (!abo || abo.status !== "actief" || !abo.mollieCustomerId || !abo.mollieMandateId) {
      terug(siteId, "Afschrijven kan alleen bij een actieve incasso met machtiging. Stuur een betaallink.");
    }
    if (formData.get("akkoord") !== "on") {
      terug(siteId, "Vink aan dat de klant akkoord gaf voor deze afschrijving. Anders stuur je een betaallink.");
    }
    const [verzoek] = await db
      .insert(betaalverzoeken)
      .values({ token, siteId, soort: "los", wijze: "incasso", omschrijving, bedragExclCent: exclCent, ...klant })
      .returning({ id: betaalverzoeken.id });
    let betaling: MolliePayment | null = null;
    let fout = "";
    try {
      betaling = await mollie<MolliePayment>("/payments", {
        methode: "POST",
        body: {
          amount: { currency: "EUR", value: euro(inclCent) },
          description: `WordSwap ${site.naam}: ${omschrijving}`.slice(0, 255),
          sequenceType: "recurring",
          customerId: abo.mollieCustomerId,
          mandateId: abo.mollieMandateId,
          webhookUrl: `${SITE_URL}/api/mollie/webhook`,
          metadata: { siteId, verzoekId: verzoek.id, soort: "los" },
        },
      });
    } catch (e) {
      fout = e instanceof Error ? e.message : String(e);
    }
    if (!betaling) {
      await db.update(betaalverzoeken).set({ status: "geannuleerd" }).where(eq(betaalverzoeken.id, verzoek.id));
      terug(siteId, `Mollie gaf een fout: ${fout}`);
    }
    await db.update(betaalverzoeken).set({ molliePaymentId: betaling.id }).where(eq(betaalverzoeken.id, verzoek.id));
    await db
      .insert(betalingen)
      .values({ siteId, molliePaymentId: betaling.id, soort: "los", bedragCent: inclCent, status: betaling.status, omschrijving })
      .onConflictDoNothing();
    await mailVanJos({
      naar: email,
      van: "Jos van WordSwap",
      onderwerp: `Aankondiging afschrijving: ${omschrijving}`,
      html: mailHtml(
        naam,
        `<p>Zoals afgesproken schrijven we het bedrag voor <strong>${ontsnap(omschrijving)}</strong> af via je bestaande machtiging: ${bedragTekst}.</p>
<p>Het bedrag wordt binnen enkele werkdagen van je rekening afgeschreven. Je krijgt daarna automatisch de factuur.</p>
<p>Klopt er iets niet? Antwoord dan meteen op deze mail.</p>`,
      ),
    });
    revalidatePath(`/admin/klant/${siteId}`);
    terug(siteId, `Afschrijving van ${euroTekst(inclCent)} aangemaakt. De klant heeft een aankondiging gekregen.`);
  }

  await db.insert(betaalverzoeken).values({ token, siteId, soort: "los", wijze: "link", omschrijving, bedragExclCent: exclCent, ...klant });
  const gelukt = await mailVanJos({
    naar: email,
    van: "Jos van WordSwap",
    onderwerp: `Betaalverzoek: ${omschrijving}`,
    html: mailHtml(
      naam,
      `<p>Hierbij het betaalverzoek voor <strong>${ontsnap(omschrijving)}</strong>: ${bedragTekst}.</p>${knop(betaalUrl(token), "Betalen")}
<p>De link blijft geldig tot je hebt betaald. Na je betaling krijg je automatisch de factuur.</p>`,
    ),
  });
  revalidatePath(`/admin/klant/${siteId}`);
  terug(siteId, gelukt ? `Betaallink voor de losse opdracht gemaild naar ${email}.` : "Betaallink aangemaakt, maar mailen mislukt. Kopieer de link hieronder.");
}

/** Trekt een openstaande betaallink voor een losse opdracht in. */
export async function betaalverzoekIntrekken(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  const id = Number(formData.get("verzoekId"));
  if (siteId === null || !Number.isInteger(id)) return;
  await db
    .update(betaalverzoeken)
    .set({ status: "geannuleerd" })
    .where(and(eq(betaalverzoeken.id, id), eq(betaalverzoeken.siteId, siteId), eq(betaalverzoeken.status, "open")));
  terug(siteId, "Betaallink ingetrokken. Hij werkt niet meer.");
}

/** Wijzigt het maandbedrag: meteen als er nog geen incasso loopt, anders gepland met aankondiging aan de klant. */
export async function wijzigMaandbedrag(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  if (siteId === null) return;
  const bedrag = bedragVeld(formData, "bedrag");
  const vanaf = datumVeld(formData, "vanaf");
  if (!(bedrag >= 1 && bedrag <= 1000)) terug(siteId, "Vul een maandbedrag tussen €1 en €1000 in.");
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (!abo || abo.status === "gestopt") terug(siteId, "Er is geen lopend abonnement.");
  const nieuwCent = Math.round(bedrag * 100);

  if (abo.status === "wacht_op_eerste") {
    await db.update(abonnementen).set({ maandbedragCent: nieuwCent, bijgewerkt: new Date() }).where(eq(abonnementen.id, abo.id));
    await db
      .update(betaalverzoeken)
      .set({ bedragExclCent: nieuwCent + abo.eenmaligCent })
      .where(and(eq(betaalverzoeken.siteId, siteId), eq(betaalverzoeken.soort, "eerste"), eq(betaalverzoeken.status, "open")));
    terug(siteId, "Maandbedrag aangepast. Er liep nog geen incasso, dus het geldt meteen, ook voor de openstaande betaallink.");
  }

  if (!vanaf || vanaf <= vandaagNl()) terug(siteId, "Kies een ingangsdatum in de toekomst, zodat de klant vooraf wordt geïnformeerd.");
  await db
    .update(abonnementen)
    .set({ nieuwBedragCent: nieuwCent, nieuwBedragVanaf: vanaf, bijgewerkt: new Date() })
    .where(eq(abonnementen.id, abo.id));
  const gelukt = await mailVanJos({
    naar: abo.email,
    van: "Jos van WordSwap",
    onderwerp: "Wijziging van je maandbedrag bij WordSwap",
    html: mailHtml(
      abo.naam,
      `<p>Vanaf ${datumNl(vanaf)} wordt je maandbedrag voor hosting, beheer en het AI-portaal <strong>${euroTekst(nieuwCent)}</strong> exclusief btw (${euroTekst(inclBtwCent(nieuwCent))} inclusief btw). Nu is dat ${euroTekst(abo.maandbedragCent)} exclusief btw.</p>
<p>Je hoeft hier niets voor te doen: vanaf die datum wordt het nieuwe bedrag automatisch afgeschreven. Ben je het er niet mee eens? Je abonnement is maandelijks opzegbaar. Antwoord gewoon op deze mail.</p>`,
    ),
  });
  terug(
    siteId,
    `Nieuw maandbedrag gepland per ${datumNl(vanaf)}.${gelukt ? " De klant heeft een aankondiging gekregen." : " Let op: de aankondiging kon niet worden gemaild."}`,
  );
}

export async function annuleerBedragWijziging(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  if (siteId === null) return;
  await db
    .update(abonnementen)
    .set({ nieuwBedragCent: null, nieuwBedragVanaf: null, bijgewerkt: new Date() })
    .where(eq(abonnementen.siteId, siteId));
  terug(siteId, "Geplande wijziging geannuleerd. Laat het de klant even weten, want hij kreeg een aankondiging.");
}

/** Opzeggen per een datum; de dagelijkse controle stopt de incasso op die dag. */
export async function opzeggenPer(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  if (siteId === null) return;
  const datum = datumVeld(formData, "datum");
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (!abo || (abo.status !== "actief" && abo.status !== "mislukt")) terug(siteId, "Er loopt geen incasso om op te zeggen.");
  if (!datum || datum < vandaagNl()) terug(siteId, "Kies een datum vanaf vandaag.");
  await db.update(abonnementen).set({ stoptOp: datum, bijgewerkt: new Date() }).where(eq(abonnementen.id, abo.id));
  const gelukt = await mailVanJos({
    naar: abo.email,
    van: "Jos van WordSwap",
    onderwerp: "Bevestiging van je opzegging bij WordSwap",
    html: mailHtml(
      abo.naam,
      `<p>We hebben je opzegging verwerkt. Je abonnement voor hosting, beheer en het AI-portaal stopt per <strong>${datumNl(datum)}</strong>. Vanaf die datum wordt er niets meer afgeschreven.</p>
<p>Wat er daarna met je website gebeurt, bespreken we nog even samen. Je websitebestanden blijven van jou.</p>`,
    ),
  });
  terug(siteId, `Opzegging gepland per ${datumNl(datum)}.${gelukt ? " De klant heeft een bevestiging gekregen." : " Let op: de bevestiging kon niet worden gemaild."}`);
}

export async function opzeggingIntrekken(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  if (siteId === null) return;
  await db.update(abonnementen).set({ stoptOp: null, bijgewerkt: new Date() }).where(eq(abonnementen.siteId, siteId));
  terug(siteId, "Opzegging ingetrokken. De incasso loopt gewoon door.");
}

/** Stopt de maandelijkse incasso meteen bij Mollie. */
export async function stopAbonnement(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  if (siteId === null) return;
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId));
  if (!abo) return;
  let fout = "";
  if (abo.mollieCustomerId && abo.mollieSubscriptionId) {
    try {
      await mollie(`/customers/${abo.mollieCustomerId}/subscriptions/${abo.mollieSubscriptionId}`, { methode: "DELETE" });
    } catch (e) {
      fout = e instanceof Error ? e.message : String(e);
    }
  }
  if (fout) terug(siteId, `Stoppen bij Mollie mislukt: ${fout}`);
  await db
    .update(abonnementen)
    .set({ status: "gestopt", mollieSubscriptionId: null, betaallink: null, stoptOp: null, nieuwBedragCent: null, nieuwBedragVanaf: null, bijgewerkt: new Date() })
    .where(eq(abonnementen.id, abo.id));
  await db
    .update(betaalverzoeken)
    .set({ status: "geannuleerd" })
    .where(and(eq(betaalverzoeken.siteId, siteId), eq(betaalverzoeken.soort, "eerste"), eq(betaalverzoeken.status, "open")));
  terug(siteId, "Incasso gestopt. Er wordt niets meer afgeschreven.");
}

/** Betaalt (een deel van) een factuur terug via Mollie en maakt de creditfactuur. */
export async function terugbetalen(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  const factuurId = Number(formData.get("factuurId"));
  if (siteId === null || !Number.isInteger(factuurId)) return;
  const [f] = await db.select().from(facturen).where(eq(facturen.id, factuurId));
  if (!f || f.soort !== "factuur" || !f.nummer || !/^tr_\w+$/.test(f.molliePaymentId)) {
    terug(siteId, "Deze factuur kan niet worden terugbetaald.");
  }
  const credits = await db.select().from(facturen).where(eq(facturen.creditVoorId, f.id));
  const alGecrediteerd = credits.reduce((s, c) => s - c.totaalCent, 0);
  const max = f.totaalCent - alGecrediteerd;
  const opgegeven = bedragVeld(formData, "bedrag");
  if (Number.isNaN(opgegeven)) terug(siteId, "Vul een geldig bedrag in, of laat het leeg voor het hele bedrag.");
  const bedragCent = opgegeven > 0 ? Math.round(opgegeven * 100) : max;
  if (bedragCent <= 0 || bedragCent > max) terug(siteId, `Je kunt bij deze factuur maximaal ${euroTekst(max)} terugbetalen.`);

  let fout = "";
  try {
    await mollie(`/payments/${f.molliePaymentId}/refunds`, {
      methode: "POST",
      body: { amount: { currency: "EUR", value: euro(bedragCent) }, description: `Terugbetaling factuur ${f.nummer}` },
    });
  } catch (e) {
    fout = e instanceof Error ? e.message : String(e);
  }
  if (fout) terug(siteId, `Terugbetalen mislukt: ${fout}`);

  let creditFout = "";
  try {
    const betaling = await mollie<MolliePayment>(`/payments/${f.molliePaymentId}`);
    await creditBijTerugbetaling(betaling, "terugbetaling", alGecrediteerd + bedragCent);
  } catch (e) {
    creditFout = e instanceof Error ? e.message : String(e);
  }
  revalidatePath(`/admin/klant/${siteId}`);
  terug(
    siteId,
    creditFout
      ? `${euroTekst(bedragCent)} terugbetaald, maar de creditfactuur is niet gemaakt: ${creditFout}`
      : `${euroTekst(bedragCent)} terugbetaald. De creditfactuur is gemaild naar ${f.klantEmail}.`,
  );
}

/** Corrigeert een verkeerd opgemaakte factuur: creditfactuur + herziene factuur, zonder terugbetaling. */
export async function factuurCorrigeren(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  const id = Number(formData.get("factuurId"));
  if (siteId === null || !Number.isInteger(id)) return;
  const naam = tekst(formData, "naam");
  const email = tekst(formData, "email");
  if (!naam || !email || !EMAIL.test(email)) terug(siteId, "Vul een naam en geldig e-mailadres in voor de herziene factuur.");
  const fout = await vervangFactuur(id, {
    klantNaam: naam,
    klantBedrijf: tekst(formData, "bedrijf"),
    klantAdres: tekst(formData, "adres"),
    klantEmail: email,
    klantBtw: tekst(formData, "btw"),
    klantKvk: tekst(formData, "kvk"),
  });
  revalidatePath(`/admin/klant/${siteId}`);
  terug(siteId, fout ?? `Gecorrigeerd: creditfactuur en herziene factuur zijn naar ${email} gemaild.`);
}

/** Stuurt een factuur opnieuw naar de klant (dezelfde vastgelegde pdf). */
export async function factuurOpnieuwMailen(formData: FormData) {
  await requireAdmin();
  const siteId = siteIdVan(formData);
  const id = Number(formData.get("factuurId"));
  if (siteId === null || !Number.isInteger(id)) return;
  const [f] = await db.select().from(facturen).where(eq(facturen.id, id));
  if (!f) return;
  const gelukt = await mailFactuur(f);
  terug(siteId, gelukt ? `Factuur ${f.nummer} opnieuw gemaild naar ${f.klantEmail}.` : "Mailen van de factuur mislukt.");
}
