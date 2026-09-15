import { asc } from "drizzle-orm";
import { db } from "@/db";
import { facturen } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

export const dynamic = "force-dynamic";

function bedrag(cent: number): string {
  return (cent / 100).toFixed(2).replace(".", ",");
}

function cel(w: string): string {
  return /[;"\n]/.test(w) ? `"${w.replace(/"/g, '""')}"` : w;
}

/** Alle WordSwap-facturen van één maand (?maand=2026-09) als Excel-bestand voor SnelStart of de boekhouder. */
export async function GET(req: Request) {
  if (!(await isBeheerder())) return new Response("Geen toegang", { status: 403 });
  const maand = new URL(req.url).searchParams.get("maand") ?? "";
  if (!/^\d{4}-\d{2}$/.test(maand)) return new Response("Geef ?maand=JJJJ-MM mee", { status: 400 });

  const alle = await db.select().from(facturen).orderBy(asc(facturen.nummer));
  const vanMaand = alle.filter(
    (f) => f.nummer && f.datum.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }).startsWith(maand),
  );

  const kop = ["Factuurnummer", "Factuurdatum", "Klant", "Bedrijf", "E-mail", "Omschrijving", "Excl. btw", "Btw 21%", "Totaal", "Betaalwijze", "Status", "Mollie-betaling"];
  const rijen = vanMaand.map((f) => [
    f.nummer ?? "",
    f.datum.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" }),
    f.klantNaam,
    f.klantBedrijf ?? "",
    f.klantEmail,
    f.regels.map((r) => r.omschrijving).join(" + "),
    bedrag(f.subtotaalCent),
    bedrag(f.btwCent),
    bedrag(f.totaalCent),
    f.betaalwijze,
    "Betaald",
    f.molliePaymentId,
  ]);
  const csv = "﻿" + [kop, ...rijen].map((r) => r.map(cel).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="WordSwap-facturen-${maand}.csv"`,
    },
  });
}
