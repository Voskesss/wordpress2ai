import { currentUser } from "@clerk/nextjs/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bouwJobs, sites } from "@/db/schema";

export async function GET() {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const jobs = await db
    .select({
      id: bouwJobs.id,
      status: bouwJobs.status,
      voortgang: bouwJobs.voortgang,
      siteNaam: bouwJobs.siteNaam,
      resultaat: bouwJobs.resultaat,
      bijgewerkt: bouwJobs.bijgewerkt,
    })
    .from(bouwJobs)
    .orderBy(desc(bouwJobs.id))
    .then((r) => r.slice(0, 8));

  // "Naar klantpagina" alleen tonen als de klant nog bestaat
  const siteIds = jobs
    .map((j) => (j.resultaat as { siteId?: number } | null)?.siteId)
    .filter((id): id is number => typeof id === "number");
  const bestaand = siteIds.length
    ? new Set(
        (
          await db.select({ id: sites.id }).from(sites).where(inArray(sites.id, siteIds))
        ).map((s) => s.id)
      )
    : new Set<number>();
  const geschoond = jobs.map((j) => {
    const res = j.resultaat as { siteId?: number } | null;
    return res?.siteId && !bestaand.has(res.siteId)
      ? { ...j, resultaat: { ...res, siteId: undefined } }
      : j;
  });
  return NextResponse.json({ jobs: geschoond });
}

/** Verwijdert een afgeronde of mislukte job uit de wachtrij. */
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { jobId } = (await req.json().catch(() => ({}))) as { jobId?: number };
  if (!jobId) return NextResponse.json({ error: "jobId ontbreekt" }, { status: 400 });
  const verwijderd = await db
    .delete(bouwJobs)
    .where(
      and(
        eq(bouwJobs.id, jobId),
        or(eq(bouwJobs.status, "klaar"), eq(bouwJobs.status, "fout"))
      )
    )
    .returning({ id: bouwJobs.id });
  if (verwijderd.length === 0) {
    return NextResponse.json(
      { error: "Alleen afgeronde of mislukte jobs kunnen verwijderd worden" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
