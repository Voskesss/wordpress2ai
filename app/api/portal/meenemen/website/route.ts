import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import JSZip from "jszip";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { GITHUB_ORG, installationToken } from "@/lib/github";
import { schoonDomein, verwerkVertrek } from "@/lib/vertrek";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * De complete website als zip: het vertrekpakket.
 *
 * Niet de rauwe repo (die bevat onuitgevouwen <!--invoeg:-->-markers en het
 * placeholder-domein, en is elders neergezet een site zonder menu en footer),
 * maar de site zoals hij online staat, plus de handleiding VERTREK.md met een
 * AI-prompt om hem zonder ons ergens anders neer te zetten. Zie lib/vertrek.ts.
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
  }).catch(() => null);
  if (!res?.ok) {
    return new NextResponse("Het downloaden lukt op dit moment niet. Probeer het zo nog eens, of mail jos@wordswap.nl.", {
      status: 502,
    });
  }

  // GitHub pakt alles in een map "org-repo-sha/"; die wortel halen we eraf.
  const bron = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
  const bestanden: { pad: string; data: Buffer }[] = [];
  for (const entry of Object.values(bron.files)) {
    if (entry.dir) continue;
    const pad = entry.name.replace(/^[^/]+\//, "");
    if (!pad || pad.startsWith(".git")) continue;
    bestanden.push({ pad, data: await entry.async("nodebuffer") });
  }

  const zip = new JSZip();
  for (const b of verwerkVertrek(bestanden, { domein: schoonDomein(site.domein), repo: site.githubRepo })) {
    zip.file(b.pad, b.data);
  }
  const stream = zip.generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "DEFLATE" });
  // JSZip levert een eigen node-stream-smaak; voor de runtime is het een gewone Readable
  return new NextResponse(Readable.toWeb(stream as unknown as Readable) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${site.githubRepo}-website.zip"`,
    },
  });
}
