import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { changes, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import {
  SITE_MIME,
  herschrijfHtml,
  vindSiteBestand,
} from "@/lib/serveer";

/**
 * De werkversie van een site: het openstaande concept als dat er is,
 * anders de gepubliceerde versie. Het portal-venster kijkt altijd hiernaar.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string; pad?: string[] }> }
) {
  const { siteId, pad: padDelen } = await params;
  const id = Number(siteId);
  if (!Number.isInteger(id)) return new Response("Ongeldig", { status: 400 });

  // De HTML zelf vereist login; losse bestanden (css/afbeeldingen) niet,
  // omdat de gesandboxte weergave geen cookies kan meesturen bij die
  // verzoeken. Site-bestanden zijn dezelfde content die (straks) publiek is.
  const ruwPad = (padDelen ?? []).join("/");
  const laatsteDeel = ruwPad.split("/").pop() ?? "";
  const isAsset =
    laatsteDeel.includes(".") && !/\.html?$/i.test(laatsteDeel);
  if (!isAsset) {
    const { userId } = await auth();
    if (!userId) return new Response("Niet ingelogd", { status: 401 });
    const [eigenaarCheck] = await db.select().from(sites).where(eq(sites.id, id));
    if (
      !eigenaarCheck ||
      (eigenaarCheck.clerkUserId !== userId && !(await isBeheerder()))
    ) {
      return new Response("Niet gevonden", { status: 404 });
    }
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) return new Response("Niet gevonden", { status: 404 });

  const [openConcept] = await db
    .select()
    .from(changes)
    .where(and(eq(changes.siteId, id), eq(changes.status, "concept")))
    .orderBy(desc(changes.id));

  let pad = (padDelen ?? []).join("/") || "index.html";
  if (pad.endsWith("/")) pad += "index.html";

  const gevonden = await vindSiteBestand(
    site.githubRepo,
    pad,
    openConcept?.branch
  );
  if (!gevonden) return new Response("Pagina niet gevonden", { status: 404 });

  const ext = gevonden.pad.split(".").pop() ?? "";
  const mime = SITE_MIME[ext] ?? "application/octet-stream";

  if (ext === "html" || ext === "htm") {
    const html = herschrijfHtml(
      new TextDecoder().decode(gevonden.data),
      `/site-weergave/${id}`,
      gevonden.pad
    );
    return new Response(html, {
      headers: {
        "Content-Type": mime,
        "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(gevonden.data, {
    headers: { "Content-Type": mime, "Cache-Control": "no-store" },
  });
}
