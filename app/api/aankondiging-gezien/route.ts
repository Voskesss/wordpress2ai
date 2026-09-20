import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aankondigingenGezien } from "@/db/schema";

/** Wegklikken van een aankondiging per ACCOUNT bewaren: anders kreeg je op
 * elk nieuw apparaat de hele stapel oude aankondigingen opnieuw (20-09).
 * De browser-opslag blijft als snelle eerste laag; dit is de blijvende. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: number } | null;
  const id = Number(body?.id);
  if (!Number.isSafeInteger(id) || id <= 0)
    return NextResponse.json({ error: "Ongeldige aankondiging" }, { status: 400 });
  await db
    .insert(aankondigingenGezien)
    .values({ aankondigingId: id, clerkUserId: userId })
    .onConflictDoNothing()
    .catch((e) => console.error("Aankondiging-gezien bewaren:", e));
  return NextResponse.json({ ok: true });
}
