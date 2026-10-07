import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, sites } from "@/db/schema";
import { anderenInConcept, magBewerken, stappenInConcept } from "@/lib/toegang";

/** Wie werkte er aan dit concept? "anderen" voor de waarschuwing vlak voor het
 * publiceren, "stappen" (iedereen, met pagina's) voor het teamvenster bij het
 * concept (Jos, 04/05-10-2026). */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const changeId = Number(new URL(req.url).searchParams.get("changeId"));
  if (!Number.isSafeInteger(changeId) || changeId <= 0) return NextResponse.json({ anderen: [] });
  const [rij] = await db
    .select({ site: sites })
    .from(changes)
    .innerJoin(sites, eq(changes.siteId, sites.id))
    .where(eq(changes.id, changeId));
  if (!rij || rij.site.isDemo || !(await magBewerken(rij.site, userId))) return NextResponse.json({ anderen: [], stappen: [] });
  const [anderen, stappen] = await Promise.all([anderenInConcept(changeId, userId), stappenInConcept(changeId, userId)]);
  return NextResponse.json({ anderen, stappen });
}
