import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { GITHUB_ORG, installationToken } from "@/lib/github";

export const dynamic = "force-dynamic";

/**
 * De complete website als zip. GitHub geeft een tijdelijke downloadlink terug; daar sturen we
 * de klant naartoe, zodat ook grote sites (veel foto's) zonder groottegrens binnenkomen.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Niet ingelogd", { status: 401 });
  const siteId = Number(new URL(req.url).searchParams.get("siteId"));
  if (!Number.isInteger(siteId)) return new NextResponse("Ongeldige site", { status: 400 });
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (site.clerkUserId !== userId && !(await isBeheerder()))) {
    return new NextResponse("Geen toegang", { status: 403 });
  }

  const token = await installationToken();
  const res = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${site.githubRepo}/zipball/main`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    redirect: "manual",
  }).catch(() => null);
  const downloadLink = res?.headers.get("location");
  if (!downloadLink) {
    return new NextResponse("Het downloaden lukt op dit moment niet. Probeer het zo nog eens, of mail jos@wordswap.nl.", {
      status: 502,
    });
  }
  return NextResponse.redirect(downloadLink, 302);
}
