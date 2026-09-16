import { and, eq, isNotNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { syncActueel } from "@/lib/actueel";
import { deployRepoNaarCloudflare } from "@/lib/cloudflare";
import { db } from "@/db";
import { sites } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Dagelijks: nieuwe artikelen van de nieuwsfeed van elke site ophalen en als
 * statische pagina's publiceren. Sites zonder feed-URL worden overgeslagen.
 */
export async function GET(req: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || req.headers.get("authorization") !== `Bearer ${geheim}`) {
    return new NextResponse("Geen toegang", { status: 401 });
  }

  const lijst = await db
    .select()
    .from(sites)
    .where(
      and(
        isNotNull(sites.nieuwsFeedUrl),
        ne(sites.status, "opgezegd"),
        eq(sites.isDemo, false)
      )
    );

  const uitslagen = [];
  for (const site of lijst) {
    if (!site.nieuwsFeedUrl) continue;
    try {
      const uitslag = await syncActueel({
        repo: site.githubRepo,
        feedUrl: site.nieuwsFeedUrl,
      });
      // Alleen deployen als er echt iets bij kwam
      if (uitslag.nieuw.length && site.siteSlug) {
        await deployRepoNaarCloudflare(site.githubRepo, site.siteSlug);
      }
      uitslagen.push(uitslag);
    } catch (e) {
      uitslagen.push({
        repo: site.githubRepo,
        fout: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ sites: uitslagen.length, uitslagen });
}
