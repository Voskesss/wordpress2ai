import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formulierInzendingen, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

/** Download van alle formulier-inzendingen van een site als CSV die Excel
 * direct netjes opent (puntkomma's en een BOM voor de Nederlandse Excel).
 * Kolommen: datum, formulier, status en daarna alle veldnamen die in de
 * inzendingen voorkomen — in Excel filterbaar per formulier (bv. nieuwsbrief). */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const siteId = Number(new URL(req.url).searchParams.get("siteId"));
  if (!Number.isInteger(siteId)) {
    return NextResponse.json({ error: "Ongeldige site" }, { status: 400 });
  }
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (site.clerkUserId !== userId && !(await isBeheerder()))) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const rijen = await db
    .select()
    .from(formulierInzendingen)
    .where(
      and(
        eq(formulierInzendingen.siteRepo, site.githubRepo),
        // Regels zonder inhoud zijn tellingen voor de spamrem, geen berichten.
        eq(formulierInzendingen.inhoudBewaard, true),
      ),
    )
    .orderBy(desc(formulierInzendingen.id));

  // Kolommen: vaste eerst, daarna alle veldnamen in volgorde van eerste voorkomen
  const veldNamen: string[] = [];
  for (const r of rijen) {
    for (const naam of Object.keys(r.velden as Record<string, string>)) {
      if (!veldNamen.includes(naam)) veldNamen.push(naam);
    }
  }
  const cel = (w: unknown) => {
    const s = String(w ?? "");
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const kop = ["datum", "formulier", "status", ...veldNamen];
  const regels = [kop.map(cel).join(";")];
  for (const r of rijen) {
    const velden = r.velden as Record<string, string>;
    regels.push(
      [
        r.aangemaakt.toLocaleString("nl-NL"),
        r.formulier,
        r.gearchiveerd ? "afgehandeld" : "nieuw",
        ...veldNamen.map((n) => velden[n] ?? ""),
      ]
        .map(cel)
        .join(";"),
    );
  }
  const csv = "﻿" + regels.join("\r\n");
  const bestandsnaam = `inzendingen-${site.githubRepo}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${bestandsnaam}"`,
    },
  });
}
