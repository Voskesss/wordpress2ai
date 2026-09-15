import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { facturen, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { pdfVan } from "@/lib/factuur";

export const dynamic = "force-dynamic";

/** Factuur-pdf voor de klant zelf: alleen van zijn eigen website. */
export async function GET(_req: Request, { params }: { params: Promise<{ nummer: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Niet ingelogd", { status: 401 });
  const { nummer } = await params;
  const [f] = await db.select().from(facturen).where(eq(facturen.nummer, nummer));
  if (!f) return new Response("Factuur niet gevonden", { status: 404 });
  const [site] = await db.select().from(sites).where(eq(sites.id, f.siteId));
  if (!site || (site.clerkUserId !== userId && !(await isBeheerder()))) {
    return new Response("Geen toegang", { status: 403 });
  }
  const pdf = await pdfVan(f);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${f.soort === "credit" ? "Creditfactuur" : "Factuur"}-${f.nummer}.pdf"`,
    },
  });
}
