import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";

export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { jobId } = (await req.json()) as { jobId: number };
  const [job] = await db.select().from(bouwJobs).where(eq(bouwJobs.id, jobId));
  if (!job) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (job.status === "wachtend") {
    await db.delete(bouwJobs).where(eq(bouwJobs.id, jobId));
  } else if (job.status === "bezig") {
    await db
      .update(bouwJobs)
      .set({ status: "fout", voortgang: "Handmatig geannuleerd", bijgewerkt: new Date() })
      .where(eq(bouwJobs.id, jobId));
  }
  return NextResponse.json({ ok: true });
}
