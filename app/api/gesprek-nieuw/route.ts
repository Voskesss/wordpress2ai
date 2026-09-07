import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { NIEUW_GESPREK } from "@/lib/gesprek";

/** Nieuw gesprek beginnen: zet een markering; de AI vergeet alles ervóór. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { siteId } = (await req.json()) as { siteId: number };
  const [site] = await db.select().from(sites).where(eq(sites.id, Number(siteId)));
  if (!site || (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  await db.insert(messages).values({ siteId: site.id, rol: "klant", tekst: NIEUW_GESPREK, clerkUserId: userId });
  return NextResponse.json({ ok: true });
}
