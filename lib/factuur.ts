import { eq, sql } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "@/db";
import { abonnementen, facturen } from "@/db/schema";
import { BTW, euroTekst, SITE_URL, type MolliePayment } from "@/lib/mollie";

export const AFZENDER = {
  naam: "WordSwap",
  adres: ["Lebretweg 72", "6861 ZZ Oosterbeek"],
  email: "jos@wordswap.nl",
  telefoon: "+31 6 10911365",
  web: "wordswap.nl",
  iban: "NL49 ABNA 0508 0411 55",
  btw: "NL820254745B01",
  kvk: "09190650",
  juridisch: "WordSwap is een handelsnaam van J.K. Klijnhout Holding B.V.",
};

export type Factuur = typeof facturen.$inferSelect;

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function maandNaam(d: Date): string {
  const nl = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  return `${MAANDEN[nl.getMonth()]} ${nl.getFullYear()}`;
}

function datumNl(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Amsterdam" });
}

/** Volgend nummer in de reeks WS-JJJJ-NNNN; één atomaire query, dus nooit dubbel. */
async function volgendNummer(): Promise<string> {
  const jaar = Number(new Date().toLocaleDateString("en-US", { year: "numeric", timeZone: "Europe/Amsterdam" }));
  const r = await db.execute(
    sql`INSERT INTO factuur_teller (jaar, laatste) VALUES (${jaar}, 1)
        ON CONFLICT (jaar) DO UPDATE SET laatste = factuur_teller.laatste + 1
        RETURNING laatste`,
  );
  const laatste = Number((r.rows[0] as { laatste: number }).laatste);
  return `WS-${jaar}-${String(laatste).padStart(4, "0")}`;
}

/**
 * Maakt de factuur bij een betaalde betaling en mailt hem. Veilig om vaker aan te roepen:
 * een betaling krijgt maximaal één factuur.
 */
export async function factuurBijBetaling(betaling: MolliePayment): Promise<void> {
  if (betaling.status !== "paid" || !betaling.customerId) return;
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.mollieCustomerId, betaling.customerId));
  if (!abo) return;

  const totaalCent = Math.round(Number(betaling.amount.value) * 100);
  const nu = new Date();
  const regels: { omschrijving: string; bedragCent: number }[] = [];
  if (betaling.sequenceType === "first" && abo.eenmaligCent > 0) {
    regels.push({ omschrijving: "Omzetting van je website naar WordSwap (eenmalig)", bedragCent: abo.eenmaligCent });
  }
  const subtotaalVoorMaand = regels.reduce((s, r) => s + r.bedragCent, 0);
  // Het maandbedrag volgt uit het werkelijk betaalde bedrag, zodat factuur en afschrijving altijd gelijk zijn
  const subtotaalCent = Math.round(totaalCent / (1 + BTW));
  regels.push({
    omschrijving: `Hosting, beheer en AI-portaal: ${maandNaam(nu)}`,
    bedragCent: subtotaalCent - subtotaalVoorMaand,
  });
  const btwCent = totaalCent - subtotaalCent;

  // Eerst de betaling claimen; alleen wie de rij echt aanmaakt, kent een nummer toe
  const geclaimd = await db
    .insert(facturen)
    .values({
      siteId: abo.siteId,
      molliePaymentId: betaling.id,
      klantNaam: abo.naam,
      klantBedrijf: abo.klantBedrijf,
      klantAdres: abo.klantAdres,
      klantEmail: abo.email,
      regels,
      subtotaalCent,
      btwCent,
      totaalCent,
      betaalwijze: betaling.sequenceType === "first" ? "iDEAL" : "automatische incasso",
    })
    .onConflictDoNothing({ target: facturen.molliePaymentId })
    .returning({ id: facturen.id });
  let factuurId = geclaimd[0]?.id;
  if (!factuurId) {
    // Al geclaimd: klaar, tenzij een eerdere poging stopte vóór het nummer (dan hier afmaken)
    const [bestaand] = await db.select().from(facturen).where(eq(facturen.molliePaymentId, betaling.id));
    if (!bestaand || bestaand.nummer) return;
    factuurId = bestaand.id;
  }

  const nummer = await volgendNummer();
  const [factuur] = await db
    .update(facturen)
    .set({ nummer })
    .where(eq(facturen.id, factuurId))
    .returning();
  await mailFactuur(factuur);
}

export async function mailFactuur(factuur: Factuur): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !factuur.nummer) return false;
  const pdf = await maakFactuurPdf(factuur);
  const basisFrom = process.env.RESEND_FROM ?? "WordSwap <onboarding@resend.dev>";
  const adres = basisFrom.match(/<([^>]+)>/)?.[1] ?? basisFrom;
  const voornaam = factuur.klantNaam.split(" ")[0];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `WordSwap <${adres}>`,
      to: [factuur.klantEmail],
      bcc: ["jos@wordswap.nl"],
      reply_to: ["jos@wordswap.nl"],
      subject: `Factuur ${factuur.nummer} van WordSwap`,
      html: `<p>Beste ${voornaam},</p><p>In de bijlage vind je factuur <strong>${factuur.nummer}</strong> van ${euroTekst(factuur.totaalCent)} (inclusief btw). Dit bedrag is al voldaan via ${factuur.betaalwijze}, je hoeft dus niets meer te doen.</p><p>Vragen over de factuur? Antwoord gewoon op deze mail.</p><p>Met vriendelijke groet,<br>Jos Klijnhout<br>WordSwap</p>`,
      attachments: [{ filename: `Factuur-${factuur.nummer}.pdf`, content: Buffer.from(pdf).toString("base64") }],
    }),
  }).catch(() => null);
  if (res?.ok) {
    await db.update(facturen).set({ verstuurd: true }).where(eq(facturen.id, factuur.id));
    return true;
  }
  console.error("Factuur mailen mislukt:", res ? await res.text() : "geen verbinding");
  return false;
}

// --- PDF ---

const GROEN = rgb(0x31 / 255, 0x95 / 255, 0x6b / 255);
const DONKER = rgb(0.16, 0.15, 0.14);
const GRIJS = rgb(0.45, 0.43, 0.41);
const LICHT = rgb(0.95, 0.95, 0.94);

function tekstRechts(page: PDFPage, tekst: string, xRechts: number, y: number, font: PDFFont, size: number, kleur = DONKER) {
  page.drawText(tekst, { x: xRechts - font.widthOfTextAtSize(tekst, size), y, font, size, color: kleur });
}

function geld(cent: number): string {
  return euroTekst(cent).replace("€", "€ ");
}

export async function maakFactuurPdf(f: Factuur): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Factuur ${f.nummer}`);
  doc.setAuthor("WordSwap");
  const page = doc.addPage([595.28, 841.89]); // A4
  const gewoon = await doc.embedFont(StandardFonts.Helvetica);
  const vet = await doc.embedFont(StandardFonts.HelveticaBold);
  const L = 56;
  const R = 595.28 - 56;

  // Logo (valt terug op de naam als het logo niet te laden is)
  let logoGetekend = false;
  try {
    const res = await fetch(`${SITE_URL}/logo-mail-groen.png`, { cache: "force-cache" });
    if (res.ok) {
      const logo = await doc.embedPng(await res.arrayBuffer());
      const breedte = 150;
      const hoogte = (logo.height / logo.width) * breedte;
      page.drawImage(logo, { x: L, y: 770 - hoogte + 20, width: breedte, height: hoogte });
      logoGetekend = true;
    }
  } catch {
    /* naam als tekst hieronder */
  }
  if (!logoGetekend) page.drawText("WordSwap", { x: L, y: 765, font: vet, size: 24, color: GROEN });

  // Afzender rechtsboven
  let y = 780;
  const afzenderRegels: [string, PDFFont][] = [
    [AFZENDER.naam, vet],
    ...AFZENDER.adres.map((a) => [a, gewoon] as [string, PDFFont]),
    [AFZENDER.email, gewoon],
    [AFZENDER.telefoon, gewoon],
  ];
  for (const [t, font] of afzenderRegels) {
    tekstRechts(page, t, R, y, font, 9.5);
    y -= 13;
  }
  y -= 6;
  for (const [label, waarde] of [["IBAN", AFZENDER.iban], ["Btw-nr", AFZENDER.btw], ["KvK", AFZENDER.kvk]]) {
    tekstRechts(page, `${label}  ${waarde}`, R, y, gewoon, 9.5, GRIJS);
    y -= 13;
  }

  // Titel en klant
  page.drawText("Factuur", { x: L, y: 660, font: vet, size: 22, color: DONKER });
  y = 630;
  const klantRegels = [
    ...(f.klantBedrijf ? [f.klantBedrijf, `t.a.v. ${f.klantNaam}`] : [f.klantNaam]),
    ...(f.klantAdres ?? "").split(/\r?\n/).map((r) => r.trim()).filter(Boolean),
    f.klantEmail,
  ];
  klantRegels.forEach((t, i) => {
    page.drawText(t, { x: L, y, font: i === 0 ? vet : gewoon, size: 10.5, color: DONKER });
    y -= 15;
  });

  // Factuurgegevens rechts
  y = 630;
  const datum = datumNl(f.datum);
  for (const [label, waarde] of [["Factuurnummer", f.nummer ?? ""], ["Factuurdatum", datum], ["Leverdatum", datum]]) {
    page.drawText(label, { x: 360, y, font: gewoon, size: 10, color: GRIJS });
    tekstRechts(page, waarde, R, y, vet, 10);
    y -= 16;
  }

  // Betaald-blok
  const blokY = 500;
  page.drawRectangle({ x: L, y: blokY, width: R - L, height: 38, color: rgb(0.9, 0.96, 0.93) });
  page.drawText(`Voldaan via ${f.betaalwijze} op ${datum}`, { x: L + 14, y: blokY + 14, font: vet, size: 10.5, color: GROEN });
  tekstRechts(page, "Je hoeft niets meer te betalen", R - 14, blokY + 14, gewoon, 10, GROEN);

  // Regels
  y = 455;
  page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 22, color: LICHT });
  page.drawText("Omschrijving", { x: L + 10, y, font: vet, size: 10 });
  tekstRechts(page, "Bedrag", R - 10, y, vet, 10);
  y -= 26;
  for (const r of f.regels) {
    page.drawText(r.omschrijving, { x: L + 10, y, font: gewoon, size: 10.5 });
    tekstRechts(page, geld(r.bedragCent), R - 10, y, gewoon, 10.5);
    y -= 20;
  }

  // Totalen
  y -= 8;
  page.drawLine({ start: { x: 330, y: y + 12 }, end: { x: R, y: y + 12 }, thickness: 0.6, color: GRIJS });
  for (const [label, cent, font] of [
    ["Subtotaal (excl. btw)", f.subtotaalCent, gewoon],
    ["Btw 21%", f.btwCent, gewoon],
    ["Totaal", f.totaalCent, vet],
  ] as [string, number, PDFFont][]) {
    page.drawText(label, { x: 340, y, font, size: 10.5 });
    tekstRechts(page, geld(cent), R - 10, y, font, 10.5);
    y -= 18;
  }

  // Voet
  page.drawLine({ start: { x: L, y: 70 }, end: { x: R, y: 70 }, thickness: 0.5, color: LICHT });
  page.drawText(AFZENDER.juridisch, { x: L, y: 54, font: gewoon, size: 8.5, color: GRIJS });
  tekstRechts(page, `${AFZENDER.web} · KvK ${AFZENDER.kvk} · btw ${AFZENDER.btw}`, R, 54, gewoon, 8.5, GRIJS);

  return doc.save();
}
