import { currentUser } from "@clerk/nextjs/server";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";

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
      bijgewerkt: bouwJobs.bijgewerkt,
    })
    .from(bouwJobs)
    .orderBy(desc(bouwJobs.id))
    .then((r) => r.slice(0, 8));
  return NextResponse.json({ jobs });
}
