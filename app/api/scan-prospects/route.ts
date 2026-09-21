import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads, prospectMails, prospects } from "@/db/schema";
import { isDubbel, maakRegister, onthoud, schoonDomein, schoonEmail } from "@/lib/dubbel-check";

/**
 * Ingang voor de websitescan die buiten WordSwap draait (Cowork).
 *
 * Waarom een ingang en geen CSV: de scan draait elke dag. Een bestand
 * downloaden en weer uploaden houdt niemand een week vol, en dan staat de
 * outreach stil zonder dat iemand het merkt.
 *
 * Gevonden bedrijven landen in de OUTREACH, niet bij de leads. Dat onderscheid
 * is de kern: outreach is koud en massaal, een lead is iemand die gereageerd
 * heeft. Zou de scan rechtstreeks leads maken, dan verzuipen de mensen met wie
 * echt een gesprek loopt tussen honderden koude regels. Reageert iemand, dan
 * wordt hij vanzelf een lead (zie lib/leads-bijwerken.ts).
 *
 *   POST /api/scan-prospects
 *   Authorization: Bearer <SCAN_TOKEN>
 *   { "gevonden": [ { domein, bedrijf, plaats?, email?, telefoon?, branche?,
 *                     bevindingen?: string[], prijs?, score?, bron? } ] }
 */

export const runtime = "nodejs";

/**
 * Ruimhartig in wat we accepteren: de scan aan de andere kant heeft zijn eigen
 * namen ("tel", "aanleiding", "mailtekst") en die hoeven niet omgebouwd te
 * worden om hier te kunnen aanleveren. Een veldnaam is geen reden om twee
 * systemen op elkaar te laten wachten.
 */
type Binnen = {
  domein?: string;
  bedrijf?: string;
  plaats?: string;
  email?: string;
  telefoon?: string;
  tel?: string;
  contact?: string;
  contactpersoon?: string;
  branche?: string;
  kans?: string;
  bevindingen?: string[];
  aanleiding?: string[] | string;
  onderwerp?: string;
  mailtekst?: string;
  prijs?: string;
  score?: number;
  bron?: string;
};

/** "aanleiding" mag een lijst of één regel zijn. */
function alsLijst(waarde: string[] | string | undefined): string[] {
  if (!waarde) return [];
  return (Array.isArray(waarde) ? waarde : [waarde]).filter(Boolean);
}

export async function POST(verzoek: Request) {
  const token = process.env.SCAN_TOKEN;
  if (!token) return NextResponse.json({ fout: "SCAN_TOKEN niet ingesteld" }, { status: 503 });
  if (verzoek.headers.get("authorization") !== `Bearer ${token}`)
    return NextResponse.json({ fout: "Geen toegang" }, { status: 401 });

  let body: { gevonden?: Binnen[] };
  try {
    body = await verzoek.json();
  } catch {
    return NextResponse.json({ fout: "Geen geldige JSON" }, { status: 400 });
  }
  const gevonden = Array.isArray(body.gevonden) ? body.gevonden.slice(0, 500) : [];
  if (!gevonden.length) return NextResponse.json({ fout: "Niets meegestuurd" }, { status: 400 });

  // Register over BEIDE lijsten: outreach en leads. Iemand met wie al een
  // gesprek loopt mag nooit een koude scanmail krijgen.
  const [bestaandeProspects, bestaandeLeads] = await Promise.all([
    db.select({ website: prospects.website, email: prospects.email, telefoon: prospects.telefoon }).from(prospects),
    db.select({ website: leads.website, email: leads.email, telefoon: leads.telefoon }).from(leads),
  ]);
  const register = maakRegister([...bestaandeProspects, ...bestaandeLeads]);

  let nieuw = 0;
  const overgeslagen: Record<string, number> = {};
  const zonderMail: string[] = [];

  for (const g of gevonden) {
    const kandidaat = {
      website: schoonDomein(g.domein),
      email: schoonEmail(g.email) || null,
      telefoon: (g.telefoon ?? g.tel)?.trim() || null,
      bedrijf: g.bedrijf?.trim() || null,
    };
    if (!kandidaat.website && !kandidaat.email && !kandidaat.telefoon) {
      overgeslagen["niets bruikbaars"] = (overgeslagen["niets bruikbaars"] ?? 0) + 1;
      continue;
    }
    const uitslag = isDubbel(kandidaat, register);
    if (uitslag.dubbel) {
      overgeslagen[`kenden we al (${uitslag.reden})`] = (overgeslagen[`kenden we al (${uitslag.reden})`] ?? 0) + 1;
      continue;
    }

    const bevindingen = [...alsLijst(g.bevindingen), ...alsLijst(g.aanleiding)];
    const [aangemaakt] = await db.insert(prospects).values({
      bedrijf: (kandidaat.bedrijf || kandidaat.website || "Onbekend").slice(0, 200),
      website: kandidaat.website,
      // De kolom is verplicht; zonder mailadres houden we hem leeg en bellen we.
      email: kandidaat.email ?? "",
      telefoon: kandidaat.telefoon,
      observatie: bevindingen.slice(0, 8).join("\n") || null,
      branche: g.branche?.trim() || null,
      plaats: g.plaats?.trim() || null,
      score: Number.isFinite(g.score) ? Number(g.score) : null,
      prijs: g.prijs?.trim() || null,
      bron: g.bron?.trim() || "Websitescan",
      contactpersoon: (g.contactpersoon ?? g.contact)?.trim() || null,
      kans: g.kans?.trim() || null,
      // Zonder mailadres heeft mailen geen zin; die zet je op bellen.
      status: kandidaat.email ? "nieuw" : "niet_mailen",
    }).returning({ id: prospects.id });

    // De concept-mail meteen klaarzetten als hij meekomt: dan hoeft Jos alleen
    // nog te lezen, bij te schaven en op verzenden te drukken.
    if (aangemaakt && g.onderwerp?.trim() && g.mailtekst?.trim()) {
      await db.insert(prospectMails).values({
        prospectId: aangemaakt.id,
        nummer: 1,
        onderwerp: g.onderwerp.trim().slice(0, 300),
        tekst: g.mailtekst.trim(),
      });
    }
    onthoud(kandidaat, register);
    if (!kandidaat.email) zonderMail.push(kandidaat.bedrijf || kandidaat.website);
    nieuw++;
  }

  return NextResponse.json({
    ontvangen: gevonden.length,
    nieuw,
    overgeslagen,
    zonderMailadres: zonderMail.length,
    opmerking: zonderMail.length
      ? `${zonderMail.length} zonder mailadres: die staan op "niet mailen" en zijn bedoeld om te bellen.`
      : undefined,
  });
}
