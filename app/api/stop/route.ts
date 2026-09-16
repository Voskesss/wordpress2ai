import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { operationScope } from "@/lib/operation-guards";

/** Stoppen dat écht stopt. Het afbreken van het verzoek in de browser bereikt
 * de serverloze functie niet altijd: die werkt dan door en houdt het
 * bewerkingsslot vast, waardoor een volgende opdracht minutenlang moet wachten.
 * Deze route haalt het slot weg; de lopende bewerking merkt dat bij haar
 * eerstvolgende hartslag (binnen 10 seconden) en stopt zonder iets op te slaan. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const siteId = Number(body?.siteId);
  if (!Number.isSafeInteger(siteId) || siteId <= 0)
    return NextResponse.json({ error: "Ongeldige website." }, { status: 400 });
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (
    !site ||
    (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))
  )
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const scope = operationScope(site, userId);
  await db.execute(
    sql`DELETE FROM operation_leases WHERE scope = ${scope}`,
  );
  return NextResponse.json({ ok: true });
}
