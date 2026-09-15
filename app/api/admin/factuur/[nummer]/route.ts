import { eq } from "drizzle-orm";
import { db } from "@/db";
import { facturen } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { maakFactuurPdf } from "@/lib/factuur";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ nummer: string }> }) {
  if (!(await isBeheerder())) return new Response("Geen toegang", { status: 403 });
  const { nummer } = await params;
  const [f] = await db.select().from(facturen).where(eq(facturen.nummer, nummer));
  if (!f) return new Response("Factuur niet gevonden", { status: 404 });
  const pdf = await maakFactuurPdf(f);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Factuur-${f.nummer}.pdf"`,
    },
  });
}
