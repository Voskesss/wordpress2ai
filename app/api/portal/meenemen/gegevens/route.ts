import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { facturen, formulierInzendingen, messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { pdfVan } from "@/lib/factuur";

export const dynamic = "force-dynamic";

function cel(w: unknown): string {
  const s = String(w ?? "");
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Alle gegevens van één site in één zip: formulierberichten, eigen chatgeschiedenis en facturen. */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Niet ingelogd", { status: 401 });
  const siteId = Number(new URL(req.url).searchParams.get("siteId"));
  if (!Number.isInteger(siteId)) return new NextResponse("Ongeldige site", { status: 400 });
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  const beheerder = await isBeheerder();
  if (!site || (site.clerkUserId !== userId && !beheerder)) {
    return new NextResponse("Geen toegang", { status: 403 });
  }

  const zip = new JSZip();
  const datum = new Date().toISOString().slice(0, 10);

  // Formulierberichten als Excel-bestand (puntkomma's en BOM voor de Nederlandse Excel)
  const inzendingen = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.siteRepo, site.githubRepo))
    .orderBy(desc(formulierInzendingen.id));
  const veldNamen: string[] = [];
  for (const r of inzendingen) {
    for (const naam of Object.keys(r.velden as Record<string, string>)) {
      if (!veldNamen.includes(naam)) veldNamen.push(naam);
    }
  }
  const regels = [["datum", "formulier", "status", ...veldNamen].map(cel).join(";")];
  for (const r of inzendingen) {
    const velden = r.velden as Record<string, string>;
    regels.push(
      [r.aangemaakt.toLocaleString("nl-NL"), r.formulier, r.gearchiveerd ? "afgehandeld" : "nieuw", ...veldNamen.map((n) => velden[n] ?? "")]
        .map(cel)
        .join(";"),
    );
  }
  zip.file("formulierberichten.csv", "﻿" + regels.join("\r\n"));

  // Chatgeschiedenis: een klant krijgt zijn eigen gesprekken, net als in het portaal
  const berichten = await db
    .select()
    .from(messages)
    .where(beheerder && site.clerkUserId !== userId ? eq(messages.siteId, site.id) : and(eq(messages.siteId, site.id), eq(messages.clerkUserId, userId)))
    .orderBy(asc(messages.id));
  zip.file(
    "chatgeschiedenis.json",
    JSON.stringify(
      berichten.map((m) => ({ datum: m.aangemaakt.toISOString(), van: m.rol === "klant" ? "jij" : "AI", tekst: m.tekst })),
      null,
      2,
    ),
  );

  // Facturen en creditfacturen, precies zoals ze verstuurd zijn
  const lijst = await db
    .select()
    .from(facturen)
    .where(and(eq(facturen.siteId, site.id), isNotNull(facturen.nummer)))
    .orderBy(asc(facturen.id));
  for (const f of lijst) {
    const pdf = await pdfVan(f);
    zip.file(`facturen/${f.soort === "credit" ? "Creditfactuur" : "Factuur"}-${f.nummer}.pdf`, pdf);
  }

  zip.file(
    "LEESMIJ.txt",
    [
      `Je gegevens van ${site.naam}, gedownload op ${datum}`,
      "",
      "formulierberichten.csv  Alle berichten die via de formulieren op je website zijn verstuurd. Opent in Excel.",
      "chatgeschiedenis.json   Je gesprekken met de AI in het portaal.",
      `facturen/               Je facturen van WordSwap (${lijst.length}), precies zoals ze verstuurd zijn.`,
      "",
      "Je websitebestanden zelf (pagina's, foto's en opmaak) download je met de andere knop in je portaal.",
      "Dat zijn gewone webbestanden: je kunt ze bij elke hostingpartij neerzetten.",
      "",
      "Vragen? Mail jos@wordswap.nl",
    ].join("\r\n"),
  );

  const inhoud = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new NextResponse(new Uint8Array(inhoud), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="gegevens-${site.githubRepo}-${datum}.zip"`,
    },
  });
}
