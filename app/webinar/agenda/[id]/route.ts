import { eq } from "drizzle-orm";
import { db } from "@/db";
import { webinars } from "@/db/schema";
import { webinarIcs } from "@/lib/agenda";

export const dynamic = "force-dynamic";

/** Agenda-bestand (.ics) van een webinar, voor Apple Agenda, de Outlook-app en andere agenda's. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nummer = Number(id);
  if (!Number.isInteger(nummer)) return new Response("Niet gevonden", { status: 404 });
  const [w] = await db.select().from(webinars).where(eq(webinars.id, nummer));
  if (!w) return new Response("Niet gevonden", { status: 404 });
  return new Response(webinarIcs(w), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="webinar-wordswap.ics"',
    },
  });
}
