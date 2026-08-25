import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";

export async function GET(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Ongeldig" }, { status: 400 });

  const [job] = await db.select().from(bouwJobs).where(eq(bouwJobs.id, id));
  if (!job) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  return NextResponse.json({
    status: job.status,
    voortgang: job.voortgang,
    resultaat: job.resultaat,
  });
}
