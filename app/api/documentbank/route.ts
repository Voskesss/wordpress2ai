import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { alsPagina } from "@/lib/consistentie";
import { claimOperation, operationScope } from "@/lib/operation-guards";
import { alleBestandenVan, laadWerkmap, ruimWerkmapOp } from "@/lib/werkmap";
import { documentAdres, staatLive, vrijPad } from "@/lib/document-adres";
import { linkTekstenPerDocument } from "@/lib/beeld-alt";

/** De documentenbank: alle pdf's die op de site staan (vacatures, voorwaarden,
 * menukaarten, brochures). Ze leven in de siterepo, in bestanden/, en gaan bij
 * het publiceren gewoon mee. Opruimen kan alleen als er nergens meer naar
 * wordt gelinkt — zelfde regel als in de andere banken, want een dode
 * downloadknop is erger dan een bestand te veel. */

export const maxDuration = 120;

const IS_DOCUMENT = /\.pdf$/i;

async function magErbij(siteId: number, userId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) return null;
  return site;
}

async function openConceptVan(siteId: number) {
  const [rij] = await db
    .select()
    .from(changes)
    .where(and(eq(changes.siteId, siteId), eq(changes.status, "concept")))
    .orderBy(desc(changes.id))
    .limit(1);
  return rij ?? null;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const siteId = Number(new URL(req.url).searchParams.get("siteId"));
  const site = await magErbij(siteId, userId);
  if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  let werkmap: string | null = null;
  try {
    const openConcept = await openConceptVan(site.id);
    werkmap = await laadWerkmap(site.githubRepo, openConcept?.branch ?? undefined);
    const alle = await alleBestandenVan(werkmap);
    const bronnen = alle.filter((b) => /\.(html?|css|js)$/i.test(b));
    let inhoud = "";
    const paginas: { inhoud: string }[] = [];
    for (const b of bronnen) {
      const tekst = await readFile(path.join(werkmap, b), "utf8").catch(() => "");
      inhoud += tekst;
      if (/\.html?$/i.test(b)) paginas.push({ inhoud: tekst });
    }
    // Met welke linktekst staat elk document op de site (wat Google als naam ziet)
    const linkTeksten = linkTekstenPerDocument(paginas);
    const documenten = await Promise.all(
      alle
        .filter((b) => IS_DOCUMENT.test(b))
        .map(async (pad) => {
          // Het webadres om te kopiëren (voor een nieuwsbrief of mail), en of
          // het al werkt: staat het document alleen in een concept, dan geeft
          // het live adres nog een 404 en mag niemand het versturen.
          const adres = documentAdres(site, pad);
          return {
            pad,
            kb: Math.round((await stat(path.join(werkmap!, pad))).size / 1024),
            inGebruik: inhoud.includes(pad),
            adres,
            live: adres ? await staatLive(adres) : false,
            linkTeksten: linkTeksten.get(pad) ?? [],
          };
        }),
    );
    documenten.sort((a, b) => Number(b.inGebruik) - Number(a.inGebruik) || a.pad.localeCompare(b.pad));
    return NextResponse.json({ documenten });
  } catch (e) {
    console.error("Documentenbank laden:", e);
    return NextResponse.json({ error: "Kon de documentenbank niet laden." }, { status: 503 });
  } finally {
    if (werkmap) await ruimWerkmapOp(werkmap).catch(() => {});
  }
}



/** Een zojuist geüpload document meteen in de site bewaren, met een bericht
 * in het gesprek. Voorheen bleef een pdf als chip aan de invoerbalk hangen
 * tot de eigenaar óók nog een opdracht typte — deed hij dat niet, dan
 * gebeurde er niets en was het bestand weg (20-09). Audio en video werken al
 * zo: eerst bewaren, dan pas plaatsen. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  // bron "bank": rechtstreeks geüpload in de documentenbank, niet via de chat
  const body = (await req.json().catch(() => null)) as { siteId?: number; blobUrl?: string; naam?: string; bron?: string } | null;
  if (!body?.siteId || !body.blobUrl || !body.naam)
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  const site = await magErbij(Number(body.siteId), userId);
  if (!site || site.isDemo) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (!IS_DOCUMENT.test(body.naam)) return NextResponse.json({ error: "Alleen pdf-bestanden." }, { status: 400 });
  const blobHost = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;
  if (!blobHost.test(body.blobUrl)) return NextResponse.json({ error: "Ongeldig bestandsadres" }, { status: 400 });

  try {
    const antwoord = await fetch(body.blobUrl);
    if (!antwoord.ok) return NextResponse.json({ error: "Bestand niet gevonden in de upload-opslag." }, { status: 400 });
    const data = Buffer.from((await antwoord.arrayBuffer()) as ArrayBuffer);
    const kb = Math.round(data.length / 1024);
    const openConcept = await openConceptVan(site.id);
    const { lijstBestanden, pushBestanden } = await import("@/lib/github");
    const takken = openConcept?.branch ? ["main", openConcept.branch] : ["main"];
    // Nooit een bestaand document overschrijven: zoek een vrije naam in
    // zowel de live versie als het concept
    const bestaand = new Set<string>();
    for (const tak of takken) for (const b of await lijstBestanden(site.githubRepo, tak).catch(() => [])) bestaand.add(b);
    const pad = vrijPad(body.naam, bestaand);
    for (const tak of takken)
      await pushBestanden(site.githubRepo, [{ pad, inhoud: data }], "Document bewaard in de documentenbank", tak);

    // Meteen ook op de live site, zodat de link direct werkt (bijvoorbeeld
    // voor een nieuwsbrief). Alleen dit ene nieuwe bestand: pagina's raken we
    // niet aan, en een volgende publicatie neemt het gewoon mee uit main.
    if (site.siteSlug) {
      try {
        const { schrijfObject } = await import("@/lib/r2");
        await schrijfObject(`${site.siteSlug}/${pad}`, data, "application/pdf");
      } catch (e) {
        console.error("Document direct live zetten:", e);
      }
    }
    const adres = documentAdres(site, pad);
    const live = adres ? await staatLive(adres) : false;

    try {
      const { del } = await import("@vercel/blob");
      const token = process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
      if (token) await del(body.blobUrl, { token });
    } catch (e) {
      console.error("Blob opruimen na documentbank:", e);
    }

    await db
      .insert(messages)
      .values([
        {
          siteId: site.id,
          rol: "klant" as const,
          tekst: body.bron === "bank" ? `📄 Document geüpload in de documentenbank: ${body.naam}` : `📄 Document meegestuurd: ${body.naam}`,
          clerkUserId: userId,
        },
        {
          siteId: site.id,
          rol: "assistent" as const,
          tekst: `Je document staat in de documentenbank (/${pad}, ${kb} kB).${live && adres ? ` Het staat al online: ${adres}` : ""} Wil je het op een pagina, typ dan waar de link naartoe moet komen, bijvoorbeeld "zet de vacature op de vacaturepagina". Je vindt het altijd terug via 📎 → Documentenbank.`,
          clerkUserId: userId,
        },
      ])
      .catch((e) => console.error("Documentbank-berichten bewaren:", e));
    return NextResponse.json({ ok: true, pad: `/${pad}`, kb, adres, live });
  } catch (e) {
    console.error("Document in de documentenbank zetten:", e);
    return NextResponse.json({ error: "Opslaan in de documentenbank lukte niet." }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { siteId, pad } = (await req.json().catch(() => ({}))) as { siteId?: number; pad?: string };
  if (!Number.isInteger(siteId) || !pad || pad.includes("..") || !IS_DOCUMENT.test(pad))
    return NextResponse.json({ error: "Onvolledig verzoek" }, { status: 400 });
  const site = await magErbij(Number(siteId), userId);
  if (!site) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (site.isDemo) return NextResponse.json({ error: "In de demo kun je niets verwijderen." }, { status: 403 });

  const release = await claimOperation(operationScope(site, userId));
  if (!release)
    return NextResponse.json({ slot: true, melding: "Er wordt al aan je website gewerkt." }, { status: 409 });

  const mappen: string[] = [];
  try {
    const openConcept = await openConceptVan(site.id);
    // In gebruik? Zowel in het concept als in de gepubliceerde versie kijken.
    const teControleren = openConcept?.branch ? [openConcept.branch, undefined] : [undefined];
    for (const tak of teControleren) {
      const map = await laadWerkmap(site.githubRepo, tak);
      mappen.push(map);
      const alle = await alleBestandenVan(map);
      for (const b of alle.filter((x) => /\.(html?|css|js)$/i.test(x))) {
        const inhoud = await readFile(path.join(map, b), "utf8").catch(() => "");
        if (inhoud.includes(pad))
          return NextResponse.json(
            {
              melding: `Er staat nog een downloadlink naar dit document op je website (${alsPagina(b)})${
                tak ? " in je openstaande concept" : ""
              }. Vraag in de chat eerst om die link weg te halen; daarna kun je het bestand hier opruimen.`,
            },
            { status: 409 },
          );
      }
    }

    const { verwijderBestanden } = await import("@/lib/github");
    for (const tak of openConcept?.branch ? ["main", openConcept.branch] : ["main"])
      await verwijderBestanden(site.githubRepo, [pad], `Document uit de documentenbank verwijderd: ${pad}`, tak);
    await db.insert(messages).values([
      { siteId: site.id, rol: "klant" as const, tekst: `[Zelf aangepast] Document uit de documentenbank verwijderd: ${pad}`, clerkUserId: userId },
      {
        siteId: site.id,
        rol: "assistent" as const,
        tekst: `Het document ${pad.split("/").pop()} is uit je documentenbank gehaald. Er linkte niets meer naartoe. Toch nodig? Laat het Jos weten via Hulp & support, dan haalt hij het terug.`,
        clerkUserId: userId,
      },
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Document verwijderen uit de documentenbank:", e);
    return NextResponse.json({ melding: "Verwijderen lukte niet. Probeer het zo nog eens." }, { status: 503 });
  } finally {
    for (const m of mappen) await ruimWerkmapOp(m).catch(() => {});
    await release();
  }
}
