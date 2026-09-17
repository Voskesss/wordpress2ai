import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { formulierInzendingen, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

/** Bijlage van een formulier-inzending downloaden. Het opslagadres staat alleen
 * in de database en komt nooit in een pagina: wie het bestand wil, vraagt het
 * hier op en wij controleren eerst of hij eigenaar van die site is (of
 * beheerder). Zo blijven meegestuurde documenten privé. */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const nummer = Number(url.searchParams.get("n") ?? 0);
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(nummer))
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });

  const [inzending] = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.id, id));
  if (!inzending)
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.githubRepo, inzending.siteRepo));
  if (!site || (site.clerkUserId !== userId && !(await isBeheerder())))
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const bijlagen = (
    Array.isArray(inzending.bijlagen) ? inzending.bijlagen : []
  ) as { naam: string; url: string }[];
  const bijlage = bijlagen[nummer];
  if (!bijlage?.url)
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const bestand = await fetch(bijlage.url).catch(() => null);
  if (!bestand?.ok)
    return NextResponse.json(
      { error: "Dit bestand is niet meer beschikbaar." },
      { status: 404 },
    );

  const naam = bijlage.naam.replace(/["\\]/g, "");
  return new Response(bestand.body, {
    headers: {
      "Content-Type":
        bestand.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${naam}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
