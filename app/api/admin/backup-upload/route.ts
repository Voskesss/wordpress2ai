import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites, wpBackups } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

export const maxDuration = 60;

const MAX_BACKUP = 3 * 1024 * 1024 * 1024; // 3 GB

/**
 * WordPress-kopie (terugweg-garantie) uploaden: de browser zet het zip-bestand
 * rechtstreeks in de EU-Blob-opslag (grote bestanden, buiten onze server om).
 * Alleen voor de beheerder. ?stap=token → ?stap=klaar; DELETE verwijdert een kopie.
 */
export async function POST(req: Request) {
  if (!(await isBeheerder())) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const blobToken = process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return NextResponse.json({ error: "Blob-opslag is niet ingesteld." }, { status: 503 });
  const stap = new URL(req.url).searchParams.get("stap");

  try {
    if (stap === "token") {
      const body = (await req.json()) as HandleUploadBody;
      const uit = await handleUpload({
        body,
        request: req,
        token: blobToken,
        onBeforeGenerateToken: async (_pad, clientPayload) => {
          const { siteId } = JSON.parse(clientPayload ?? "{}") as { siteId?: number };
          const [site] = await db.select().from(sites).where(eq(sites.id, Number(siteId)));
          if (!site) throw new Error("Site niet gevonden");
          return {
            allowedContentTypes: ["application/zip", "application/x-zip-compressed", "application/gzip", "application/x-gzip", "application/octet-stream"],
            maximumSizeInBytes: MAX_BACKUP,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ siteId: site.id }),
          };
        },
        onUploadCompleted: async () => {
          // Registratie gebeurt via ?stap=klaar vanuit de browser
        },
      });
      return NextResponse.json(uit);
    }

    if (stap === "klaar") {
      const { siteId, blobUrl, bestandsnaam, grootte, omschrijving } = (await req.json()) as {
        siteId: number;
        blobUrl: string;
        bestandsnaam: string;
        grootte?: number;
        omschrijving?: string;
      };
      const [site] = await db.select().from(sites).where(eq(sites.id, Number(siteId)));
      if (!site) return NextResponse.json({ error: "Site niet gevonden" }, { status: 404 });
      let host = "";
      try {
        host = new URL(blobUrl).host;
      } catch {
        host = "";
      }
      if (!/\.public\.blob\.vercel-storage\.com$/.test(host)) {
        return NextResponse.json({ error: "Ongeldig Blob-adres" }, { status: 400 });
      }
      await db.insert(wpBackups).values({
        siteId: site.id,
        url: blobUrl,
        bestandsnaam: String(bestandsnaam || "wordpress-backup.zip").slice(0, 200),
        grootteBytes: Number.isFinite(grootte) ? Math.round(grootte!) : null,
        omschrijving: String(omschrijving ?? "").slice(0, 300) || null,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Onbekende stap" }, { status: 400 });
  } catch (e) {
    console.error("Backup-upload:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload mislukt" }, { status: 502 });
  }
}

/** Een kopie verwijderen: uit de Blob-opslag én uit de lijst. */
export async function DELETE(req: Request) {
  if (!(await isBeheerder())) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const blobToken = process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
  const [rij] = await db.select().from(wpBackups).where(eq(wpBackups.id, id));
  if (!rij) return NextResponse.json({ ok: true });
  if (blobToken) await del(rij.url, { token: blobToken }).catch(() => {});
  await db.delete(wpBackups).where(eq(wpBackups.id, id));
  return NextResponse.json({ ok: true });
}
