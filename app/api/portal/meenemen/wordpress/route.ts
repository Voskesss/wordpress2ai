import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites, wpBackups } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Download van de WordPress-kopie (terugweg-garantie): alleen voor de ingelogde
 * eigenaar van de site. Het Blob-adres zelf staat nooit in een pagina; deze route
 * controleert de eigenaar en stuurt dan pas door naar de download.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Niet ingelogd", { status: 401 });
  const url = new URL(req.url);
  const siteId = Number(url.searchParams.get("siteId"));
  const backupId = Number(url.searchParams.get("id"));
  if (!Number.isInteger(siteId) || !Number.isInteger(backupId)) {
    return new NextResponse("Ongeldige aanvraag", { status: 400 });
  }
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (site.clerkUserId !== userId && !(await isBeheerder()))) {
    return new NextResponse("Geen toegang", { status: 403 });
  }
  const [backup] = await db
    .select()
    .from(wpBackups)
    .where(and(eq(wpBackups.id, backupId), eq(wpBackups.siteId, site.id)));
  if (!backup) return new NextResponse("Niet gevonden", { status: 404 });
  const downloadUrl = new URL(backup.url);
  downloadUrl.searchParams.set("download", "1");
  return NextResponse.redirect(downloadUrl.toString(), 302);
}
