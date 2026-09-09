import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { NIEUW_GESPREK } from "@/lib/gesprek";
import { claimOperation, operationScope } from "@/lib/operation-guards";

/** Nieuw gesprek beginnen: zet een markering; de AI vergeet alles ervóór. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const siteId = body?.siteId;
  if (!Number.isSafeInteger(siteId) || siteId <= 0) {
    return NextResponse.json({ error: "Ongeldige website." }, { status: 400 });
  }
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (
    !site ||
    (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))
  ) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  const release = await claimOperation(operationScope(site, userId));
  if (!release)
    return NextResponse.json(
      {
        error:
          "Er wordt nog aan je website gewerkt. Probeer het daarna opnieuw.",
      },
      { status: 409 },
    );
  try {
    await db
      .insert(messages)
      .values({
        siteId: site.id,
        rol: "klant",
        tekst: NIEUW_GESPREK,
        clerkUserId: userId,
      });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error: "Je nieuwe gesprek kon niet worden opgeslagen. Probeer opnieuw.",
      },
      { status: 503 },
    );
  } finally {
    await release();
  }
}
