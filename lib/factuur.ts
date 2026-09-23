import { eq, sql } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "@/db";
import { abonnementen, betaalverzoeken, facturen } from "@/db/schema";
import { BTW, centVan, euroTekst, SITE_URL, type MolliePayment } from "@/lib/mollie";
import { mailVanJos, ontsnap } from "@/lib/wordswap-mail";

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
type NieuweFactuur = typeof facturen.$inferInsert;

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

const BETAALWIJZEN: Record<string, string> = {
  ideal: "iDEAL",
  directdebit: "automatische incasso",
  creditcard: "creditcard",
  bancontact: "Bancontact",
  paypal: "PayPal",
  banktransfer: "bankoverschrijving",
};

function maandNaam(d: Date): string {
  const nl = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  return `${MAANDEN[nl.getMonth()]} ${nl.getFullYear()}`;
}

function datumNl(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Amsterdam" });
}

function betaalwijze(b: MolliePayment): string {
  if (b.sequenceType === "recurring") return "automatische incasso";
  return BETAALWIJZEN[b.method ?? ""] ?? "online betaling";
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

/** Claimt een factuurrij op zijn unieke betaal-id. Geeft het id terug als er nog een nummer moet komen. */
async function claim(waarden: NieuweFactuur): Promise<number | null> {
  const r = await db
    .insert(facturen)
    .values(waarden)
    .onConflictDoNothing({ target: facturen.molliePaymentId })
    .returning({ id: facturen.id });
  if (r[0]) return r[0].id;
  // Al geclaimd: klaar, tenzij een eerdere poging stopte vóór het nummer (dan hier afmaken)
  const [bestaand] = await db.select().from(facturen).where(eq(facturen.molliePaymentId, waarden.molliePaymentId));
  return bestaand && !bestaand.nummer ? bestaand.id : null;
}

/** Nummer toekennen, de pdf vastleggen zoals hij verstuurd wordt, en mailen. */
async function nummerEnPdfVastleggen(id: number): Promise<Factuur> {
  const nummer = await volgendNummer();
  const [f] = await db.update(facturen).set({ nummer }).where(eq(facturen.id, id)).returning();
  const pdf = await maakFactuurPdf(f);
  const [vast] = await db
    .update(facturen)
    .set({ pdfBase64: Buffer.from(pdf).toString("base64") })
    .where(eq(facturen.id, f.id))
    .returning();
  return vast;
}

async function nummerVastleggenEnMailen(id: number): Promise<void> {
  await mailFactuur(await nummerEnPdfVastleggen(id));
}

/**
 * Vervangt een verkeerd opgemaakte factuur: een volledige creditfactuur (zonder terugbetaling —
 * de betaling zelf was goed) plus een herziene factuur met dezelfde bedragen en de juiste
 * gegevens. Beide gaan in één mail naar de klant. Geeft een foutmelding-tekst of null bij succes.
 */
export async function vervangFactuur(
  origineelId: number,
  juist: {
    klantNaam: string;
    klantBedrijf: string | null;
    klantAdres: string | null;
    klantEmail: string;
    klantBtw: string | null;
    klantKvk: string | null;
  },
): Promise<string | null> {
  const [origineel] = await db.select().from(facturen).where(eq(facturen.id, origineelId));
  if (!origineel?.nummer || origineel.soort !== "factuur") return "Deze factuur kan niet gecorrigeerd worden.";
  const credits = await db.select().from(facturen).where(eq(facturen.creditVoorId, origineel.id));
  if (credits.length > 0) return "Deze factuur is al (deels) gecrediteerd; automatisch corrigeren kan dan niet meer.";

  const creditId = await claim({
    siteId: origineel.siteId,
    molliePaymentId: `${origineel.molliePaymentId}-credit-1`,
    soort: "credit",
    creditVoorId: origineel.id,
    creditVoorNummer: origineel.nummer,
    klantNaam: origineel.klantNaam,
    klantBedrijf: origineel.klantBedrijf,
    klantAdres: origineel.klantAdres,
    klantEmail: origineel.klantEmail,
    klantBtw: origineel.klantBtw,
    klantKvk: origineel.klantKvk,
    regels: [{ omschrijving: `Creditering van factuur ${origineel.nummer} (correctie van de gegevens)`, bedragCent: -origineel.subtotaalCent }],
    subtotaalCent: -origineel.subtotaalCent,
    btwCent: -origineel.btwCent,
    totaalCent: -origineel.totaalCent,
    betaalwijze: "correctie, geen terugbetaling",
  });
  if (!creditId) return "Er loopt al een correctie voor deze factuur.";
  const credit = await nummerEnPdfVastleggen(creditId);

  const nieuwId = await claim({
    siteId: origineel.siteId,
    molliePaymentId: `${origineel.molliePaymentId}-herzien-1`,
    soort: "factuur",
    klantNaam: juist.klantNaam,
    klantBedrijf: juist.klantBedrijf,
    klantAdres: juist.klantAdres,
    klantEmail: juist.klantEmail,
    klantBtw: juist.klantBtw,
    klantKvk: juist.klantKvk,
    regels: origineel.regels,
    subtotaalCent: origineel.subtotaalCent,
    btwCent: origineel.btwCent,
    totaalCent: origineel.totaalCent,
    betaalwijze: origineel.betaalwijze,
  });
  if (!nieuwId) return `Creditfactuur ${credit.nummer} is gemaakt, maar de herziene factuur bestond al.`;
  const nieuw = await nummerEnPdfVastleggen(nieuwId);

  const gelukt = await mailVanJos({
    naar: juist.klantEmail,
    onderwerp: `Herziene factuur ${nieuw.nummer} van WordSwap`,
    html: `<p>Beste ${ontsnap(juist.klantNaam.split(" ")[0])},</p>
<p>Er stond iets niet goed op factuur ${origineel.nummer}. In de bijlage vind je daarom creditfactuur <strong>${credit.nummer}</strong>, die de oude factuur vervangt, en de herziene factuur <strong>${nieuw.nummer}</strong> met de juiste gegevens.</p>
<p>De bedragen zijn ongewijzigd en het is al betaald — dit is alleen een administratieve correctie, je hoeft niets te doen.</p>
<p>Vragen? Antwoord gewoon op deze mail.</p><p>Met vriendelijke groet,<br>Jos van WordSwap</p>`,
    bijlagen: [
      { bestandsnaam: `Creditfactuur-${credit.nummer}.pdf`, inhoud: Buffer.from(await pdfVan(credit)) },
      { bestandsnaam: `Factuur-${nieuw.nummer}.pdf`, inhoud: Buffer.from(await pdfVan(nieuw)) },
    ],
  });
  if (gelukt) {
    await db.update(facturen).set({ verstuurd: true }).where(eq(facturen.id, credit.id));
    await db.update(facturen).set({ verstuurd: true }).where(eq(facturen.id, nieuw.id));
  }
  return null;
}

async function klantVoorBetaling(b: MolliePayment) {
  const verzoekId = Number(b.metadata?.verzoekId);
  const verzoek =
    Number.isInteger(verzoekId) && verzoekId > 0
      ? (await db.select().from(betaalverzoeken).where(eq(betaalverzoeken.id, verzoekId)))[0]
      : undefined;
  let abo = b.customerId
    ? (await db.select().from(abonnementen).where(eq(abonnementen.mollieCustomerId, b.customerId)))[0]
    : undefined;
  const siteIdMeta = verzoek?.siteId ?? Number(b.metadata?.siteId);
  if (!abo && Number.isInteger(siteIdMeta)) {
    abo = (await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteIdMeta)))[0];
  }
  const siteId = abo?.siteId ?? siteIdMeta;
  if (!Number.isInteger(siteId)) return null;
  const klant = abo
    ? { naam: abo.naam, email: abo.email, bedrijf: abo.klantBedrijf, adres: abo.klantAdres, btw: abo.klantBtw, kvk: abo.klantKvk }
    : verzoek
      ? { naam: verzoek.klantNaam, email: verzoek.klantEmail, bedrijf: verzoek.klantBedrijf, adres: verzoek.klantAdres, btw: verzoek.klantBtw, kvk: verzoek.klantKvk }
      : null;
  if (!klant) return null;
  return { klant, siteId, abo, verzoek };
}

/**
 * Maakt de factuur bij een betaalde betaling en mailt hem. Veilig om vaker aan te roepen:
 * een betaling krijgt maximaal één factuur.
 */
export async function factuurBijBetaling(betaling: MolliePayment): Promise<void> {
  if (betaling.status !== "paid") return;
  const ctx = await klantVoorBetaling(betaling);
  if (!ctx) return;

  const totaalCent = centVan(betaling.amount);
  // Bedragen volgen uit het werkelijk betaalde bedrag, zodat factuur en afschrijving altijd gelijk zijn
  const subtotaalCent = Math.round(totaalCent / (1 + BTW));
  const regels: { omschrijving: string; bedragCent: number }[] = [];
  if (betaling.metadata?.soort === "los") {
    regels.push({ omschrijving: ctx.verzoek?.omschrijving ?? betaling.description, bedragCent: subtotaalCent });
  } else {
    const eenmalig = ctx.abo?.eenmaligCent ?? 0;
    if (betaling.sequenceType === "first" && eenmalig > 0 && eenmalig < subtotaalCent) {
      regels.push({ omschrijving: "Omzetting van je website naar WordSwap (eenmalig)", bedragCent: eenmalig });
    }
    const alGeteld = regels.reduce((s, r) => s + r.bedragCent, 0);
    regels.push({ omschrijving: `Hosting, beheer en AI-portaal: ${maandNaam(new Date())}`, bedragCent: subtotaalCent - alGeteld });
  }

  const id = await claim({
    siteId: ctx.siteId,
    molliePaymentId: betaling.id,
    soort: "factuur",
    klantNaam: ctx.klant.naam,
    klantBedrijf: ctx.klant.bedrijf,
    klantAdres: ctx.klant.adres,
    klantEmail: ctx.klant.email,
    klantBtw: ctx.klant.btw,
    klantKvk: ctx.klant.kvk,
    regels,
    subtotaalCent,
    btwCent: totaalCent - subtotaalCent,
    totaalCent,
    betaalwijze: betaalwijze(betaling),
  });
  if (id) await nummerVastleggenEnMailen(id);
}

/**
 * Creditfactuur bij een terugbetaling of terugboeking. Crediteert alleen het deel dat nog niet
 * gecrediteerd is, dus veilig om vaker aan te roepen. Geeft true als er een creditfactuur is gemaakt.
 */
export async function creditBijTerugbetaling(
  betaling: MolliePayment,
  reden: "terugbetaling" | "terugboeking",
  minimaalCent = 0,
): Promise<boolean> {
  const [origineel] = await db.select().from(facturen).where(eq(facturen.molliePaymentId, betaling.id));
  if (!origineel?.nummer || origineel.soort !== "factuur") return false;
  const credits = await db.select().from(facturen).where(eq(facturen.creditVoorId, origineel.id));
  const alGecrediteerd = credits.reduce((s, c) => s - c.totaalCent, 0);
  const teruggeboekt = Math.max(centVan(betaling.amountRefunded) + centVan(betaling.amountChargedBack), minimaalCent);
  const verschil = Math.min(teruggeboekt, origineel.totaalCent) - alGecrediteerd;
  if (verschil <= 0) return false;

  const totaalCent = -verschil;
  const subtotaalCent = -Math.round(verschil / (1 + BTW));
  const id = await claim({
    siteId: origineel.siteId,
    molliePaymentId: `${betaling.id}-credit-${credits.length + 1}`,
    soort: "credit",
    creditVoorId: origineel.id,
    creditVoorNummer: origineel.nummer,
    klantNaam: origineel.klantNaam,
    klantBedrijf: origineel.klantBedrijf,
    klantAdres: origineel.klantAdres,
    klantEmail: origineel.klantEmail,
    klantBtw: origineel.klantBtw,
    klantKvk: origineel.klantKvk,
    regels: [{ omschrijving: `Creditering van factuur ${origineel.nummer}`, bedragCent: subtotaalCent }],
    subtotaalCent,
    btwCent: totaalCent - subtotaalCent,
    totaalCent,
    betaalwijze: reden === "terugboeking" ? "terugboeking door de bank" : "terugbetaling",
  });
  if (!id) return false;
  await nummerVastleggenEnMailen(id);
  return true;
}

/** De vastgelegde pdf; alleen voor oudere facturen zonder vastgelegde pdf wordt hij één keer opgebouwd en bewaard. */
export async function pdfVan(f: Factuur): Promise<Uint8Array> {
  if (f.pdfBase64) return new Uint8Array(Buffer.from(f.pdfBase64, "base64"));
  const pdf = await maakFactuurPdf(f);
  if (f.nummer) {
    await db.update(facturen).set({ pdfBase64: Buffer.from(pdf).toString("base64") }).where(eq(facturen.id, f.id));
  }
  return pdf;
}

export async function mailFactuur(f: Factuur): Promise<boolean> {
  if (!f.nummer) return false;
  const pdf = await pdfVan(f);
  const voornaam = ontsnap(f.klantNaam.split(" ")[0]);
  const isCredit = f.soort === "credit";
  const html = isCredit
    ? `<p>Beste ${voornaam},</p><p>In de bijlage vind je creditfactuur <strong>${f.nummer}</strong> van ${euroTekst(-f.totaalCent)} (inclusief btw), als creditering van factuur ${f.creditVoorNummer}. ${
        f.betaalwijze === "terugbetaling" ? "Het bedrag wordt teruggestort op je rekening." : "Je bank heeft de betaling teruggeboekt."
      }</p><p>Vragen? Antwoord gewoon op deze mail.</p><p>Met vriendelijke groet,<br>Jos van WordSwap</p>`
    : `<p>Beste ${voornaam},</p><p>In de bijlage vind je factuur <strong>${f.nummer}</strong> van ${euroTekst(f.totaalCent)} (inclusief btw). Dit bedrag is al voldaan via ${f.betaalwijze}, je hoeft dus niets meer te doen.</p><p>Vragen over de factuur? Antwoord gewoon op deze mail.</p><p>Met vriendelijke groet,<br>Jos van WordSwap</p>`;
  const gelukt = await mailVanJos({
    naar: f.klantEmail,
    onderwerp: `${isCredit ? "Creditfactuur" : "Factuur"} ${f.nummer} van WordSwap`,
    html,
    bijlagen: [{ bestandsnaam: `${isCredit ? "Creditfactuur" : "Factuur"}-${f.nummer}.pdf`, inhoud: Buffer.from(pdf) }],
  });
  if (gelukt) await db.update(facturen).set({ verstuurd: true }).where(eq(facturen.id, f.id));
  return gelukt;
}

// --- PDF ---

const GROEN = rgb(0x31 / 255, 0x95 / 255, 0x6b / 255);
const ROOD = rgb(0.7, 0.16, 0.14);
const DONKER = rgb(0.16, 0.15, 0.14);
const GRIJS = rgb(0.45, 0.43, 0.41);
const LICHT = rgb(0.95, 0.95, 0.94);

function tekstRechts(page: PDFPage, tekst: string, xRechts: number, y: number, font: PDFFont, size: number, kleur = DONKER) {
  page.drawText(tekst, { x: xRechts - font.widthOfTextAtSize(tekst, size), y, font, size, color: kleur });
}

function geld(cent: number): string {
  return `${cent < 0 ? "- " : ""}€ ${(Math.abs(cent) / 100).toFixed(2).replace(".", ",")}`;
}

export async function maakFactuurPdf(f: Factuur): Promise<Uint8Array> {
  const isCredit = f.soort === "credit";
  const titel = isCredit ? "Creditfactuur" : "Factuur";
  const doc = await PDFDocument.create();
  doc.setTitle(`${titel} ${f.nummer}`);
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
  page.drawText(titel, { x: L, y: 660, font: vet, size: 22, color: isCredit ? ROOD : DONKER });
  y = 630;
  const klantRegels = [
    ...(f.klantBedrijf ? [f.klantBedrijf, `t.a.v. ${f.klantNaam}`] : [f.klantNaam]),
    ...(f.klantAdres ?? "").split(/\r?\n/).map((r) => r.trim()).filter(Boolean),
    f.klantEmail,
    ...(f.klantKvk ? [`KvK ${f.klantKvk}`] : []),
    ...(f.klantBtw ? [`Btw-nr ${f.klantBtw}`] : []),
  ];
  klantRegels.forEach((t, i) => {
    page.drawText(t, { x: L, y, font: i === 0 ? vet : gewoon, size: 10.5, color: DONKER });
    y -= 15;
  });
  // Het status-blok schuift mee omlaag als de klant veel adresregels heeft
  const blokY = Math.min(500, y - 58);

  // Factuurgegevens rechts
  y = 630;
  const datum = datumNl(f.datum);
  const gegevens: [string, string][] = [
    [isCredit ? "Creditnummer" : "Factuurnummer", f.nummer ?? ""],
    [isCredit ? "Creditdatum" : "Factuurdatum", datum],
    ...(isCredit ? ([["Credit voor factuur", f.creditVoorNummer ?? ""]] as [string, string][]) : ([["Leverdatum", datum]] as [string, string][])),
  ];
  for (const [label, waarde] of gegevens) {
    page.drawText(label, { x: 350, y, font: gewoon, size: 10, color: GRIJS });
    tekstRechts(page, waarde, R, y, vet, 10);
    y -= 16;
  }

  // Status-blok
  const kleur = isCredit ? ROOD : GROEN;
  page.drawRectangle({ x: L, y: blokY, width: R - L, height: 38, color: isCredit ? rgb(0.98, 0.93, 0.92) : rgb(0.9, 0.96, 0.93) });
  const statusLinks = isCredit
    ? `${f.betaalwijze.charAt(0).toUpperCase()}${f.betaalwijze.slice(1)} op ${datum}`
    : `Voldaan via ${f.betaalwijze} op ${datum}`;
  page.drawText(statusLinks, { x: L + 14, y: blokY + 14, font: vet, size: 10.5, color: kleur });
  tekstRechts(page, isCredit ? "Dit bedrag is gecrediteerd" : "Je hoeft niets meer te betalen", R - 14, blokY + 14, gewoon, 10, kleur);

  // Regels
  y = blokY - 45;
  page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 22, color: LICHT });
  page.drawText("Omschrijving", { x: L + 10, y, font: vet, size: 10 });
  tekstRechts(page, "Bedrag", R - 10, y, vet, 10);
  y -= 26;
  for (const r of f.regels) {
    page.drawText(r.omschrijving.slice(0, 80), { x: L + 10, y, font: gewoon, size: 10.5 });
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

/** Opdrachtbevestiging bij de eerste betaallink: het "contract in de mail".
 * Geen factuurnummer — de echte factuur volgt automatisch na de betaling. */
export async function maakOpdrachtbevestigingPdf(o: {
  siteNaam: string;
  klantNaam: string;
  klantBedrijf: string | null;
  klantAdres: string | null;
  klantEmail: string;
  maandbedragCent: number;
  eenmaligCent: number;
  afspraken?: string | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Opdrachtbevestiging WordSwap — ${o.siteNaam}`);
  doc.setAuthor("WordSwap");
  let page = doc.addPage([595.28, 841.89]);
  const gewoon = await doc.embedFont(StandardFonts.Helvetica);
  const vet = await doc.embedFont(StandardFonts.HelveticaBold);
  const L = 56;
  const R = 595.28 - 56;
  const datum = datumNl(new Date());

  try {
    const res = await fetch(`${SITE_URL}/logo-mail-groen.png`, { cache: "force-cache" });
    if (res.ok) {
      const logo = await doc.embedPng(await res.arrayBuffer());
      page.drawImage(logo, { x: L, y: 790 - (logo.height / logo.width) * 150 + 10, width: 150, height: (logo.height / logo.width) * 150 });
    }
  } catch {
    page.drawText("WordSwap", { x: L, y: 780, font: vet, size: 22, color: GROEN });
  }
  let y = 780;
  for (const [t, f] of [[AFZENDER.naam, vet], ...AFZENDER.adres.map((a) => [a, gewoon]), [AFZENDER.email, gewoon], [`KvK ${AFZENDER.kvk}`, gewoon]] as [string, PDFFont][]) {
    tekstRechts(page, t, R, y, f, 9.5);
    y -= 13;
  }

  page.drawText("Opdrachtbevestiging", { x: L, y: 690, font: vet, size: 20, color: DONKER });
  page.drawText(`Datum: ${datum}`, { x: L, y: 670, font: gewoon, size: 10, color: GRIJS });

  y = 644;
  for (const t of [
    ...(o.klantBedrijf ? [o.klantBedrijf, `t.a.v. ${o.klantNaam}`] : [o.klantNaam]),
    ...(o.klantAdres ?? "").split(/\r?\n/).map((r) => r.trim()).filter(Boolean),
    o.klantEmail,
  ]) {
    page.drawText(t, { x: L, y, font: gewoon, size: 10.5 });
    y -= 15;
  }
  y -= 10;

  const alinea = (tekst: string, opties: { vet?: boolean; kleur?: ReturnType<typeof rgb> } = {}) => {
    // Onder aan de pagina? Verder op een nieuwe, boven de voetregel blijven
    if (y < 110) {
      page = doc.addPage([595.28, 841.89]);
      y = 780;
    }
    const font = opties.vet ? vet : gewoon;
    const woorden = tekst.split(" ");
    let regel = "";
    for (const w of woorden) {
      const probeer = regel ? `${regel} ${w}` : w;
      if (font.widthOfTextAtSize(probeer, 10.5) > R - L) {
        page.drawText(regel, { x: L, y, font, size: 10.5, color: opties.kleur ?? DONKER });
        y -= 15;
        if (y < 90) {
          page = doc.addPage([595.28, 841.89]);
          y = 780;
        }
        regel = w;
      } else regel = probeer;
    }
    if (regel) {
      page.drawText(regel, { x: L, y, font, size: 10.5, color: opties.kleur ?? DONKER });
      y -= 15;
    }
    y -= 5;
  };

  alinea("Wat wij leveren", { vet: true, kleur: GROEN });
  alinea(
    `We hebben je bestaande website "${o.siteNaam}" overgezet naar een snelle versie zonder WordPress, met behoud van je ontwerp, inhoud en pagina-adressen. Je hebt de kopie bekeken en goedgekeurd. Na je betaling zetten we hem live op je eigen domeinnaam. Daarna beheer je de site zelf via het WordSwap-portaal met AI-chat; wij verzorgen hosting, beveiligde verbinding en beheer.`,
  );
  y -= 4;
  alinea("De prijs", { vet: true, kleur: GROEN });
  if (o.eenmaligCent > 0) alinea(`Eenmalige omzetting: ${euroTekst(o.eenmaligCent)} excl. btw.`);
  alinea(
    `Maandbedrag voor hosting, beheer en het AI-portaal: ${euroTekst(o.maandbedragCent)} excl. btw per maand, maandelijks opzegbaar. De eerste betaling gaat via iDEAL${o.eenmaligCent > 0 ? " (omzetting en eerste maand samen)" : ""}; daarna wordt het maandbedrag automatisch afgeschreven. Bij elke betaling ontvang je automatisch een factuur. Alle bedragen zijn exclusief 21% btw.`,
  );
  y -= 4;
  alinea("Wat jij zelf draagt", { vet: true, kleur: GROEN });
  alinea(
    "Je domeinnaam en e-mailabonnement blijven van jou; de kosten daarvan lopen buiten WordSwap om. Voor de inhoud van je website (teksten, foto's, claims en rechten daarop) ben jij verantwoordelijk. Wijzigingen die je via de chat publiceert, zijn jouw keuze; er is altijd eerst een voorbeeld en een eerdere versie kan worden teruggezet. AI-gebruik boven de fair-use-grens en maatwerk spreken we vooraf apart af.",
  );
  if (o.afspraken?.trim()) {
    y -= 4;
    alinea("Aanvullende afspraken", { vet: true, kleur: GROEN });
    for (const regel of o.afspraken.trim().split(/\r?\n/)) {
      if (regel.trim()) alinea(regel.trim());
      else y -= 8;
    }
  }
  y -= 4;
  alinea("Terugweg en einde", { vet: true, kleur: GROEN });
  alinea(
    "Vóór je je oude hosting opzegt, zorgen we dat er een complete kopie van je oude WordPress-site veilig staat. Zeg je WordSwap op, dan ontvang je je websitebestanden en gegevens; je site en data blijven van jou.",
  );
  y -= 4;
  alinea("Akkoord", { vet: true, kleur: GROEN });
  alinea(
    `Door de betaallink te betalen ga je akkoord met deze opdrachtbevestiging, de algemene voorwaarden (wordswap.nl/voorwaarden) en de verwerkersovereenkomst (wordswap.nl/verwerkersovereenkomst). Wij leggen datum en betaling vast als bevestiging. Vragen? Mail jos@wordswap.nl of bel ${AFZENDER.telefoon}.`,
  );

  for (const p of doc.getPages()) {
    p.drawLine({ start: { x: L, y: 70 }, end: { x: R, y: 70 }, thickness: 0.5, color: LICHT });
    p.drawText(AFZENDER.juridisch, { x: L, y: 54, font: gewoon, size: 8.5, color: GRIJS });
    tekstRechts(p, `${AFZENDER.web} · KvK ${AFZENDER.kvk} · btw ${AFZENDER.btw}`, R, 54, gewoon, 8.5, GRIJS);
  }
  return doc.save();
}
