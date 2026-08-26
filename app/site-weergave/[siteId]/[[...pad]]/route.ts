import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { changes, sites } from "@/db/schema";
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

  // Bewust zonder login: de gesandboxte weergave kan geen cookies meesturen
  // (ook niet bij doorklikken). Deze route serveert uitsluitend
  // site-bestanden — content die live staat of op publiceren wacht — nooit
  // portal- of klantgegevens. noindex + no-store houden hem privé genoeg.
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
    let ruw = new TextDecoder().decode(gevonden.data);
    // Centrale onderdelen (delen/*.html) invoegen op de markers
    const markers = [...new Set([...ruw.matchAll(/<!--\s*invoeg:([a-z0-9-]+)\s*-->/gi)].map((m) => m[1].toLowerCase()))];
    if (markers.length > 0) {
      const { vouwUit } = await import("@/lib/delen");
      const delen = new Map<string, string>();
      await Promise.all(
        markers.map(async (naam) => {
          const deel = await vindSiteBestand(site.githubRepo, `delen/${naam}.html`, openConcept?.branch);
          if (deel) delen.set(naam, new TextDecoder().decode(deel.data));
        })
      );
      ruw = vouwUit(ruw, delen);
    }
    const html = herschrijfHtml(ruw, `/site-weergave/${id}`, gevonden.pad);
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
