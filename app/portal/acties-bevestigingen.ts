"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { formulierBevestigingen, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

/** Site + formulierrij ophalen als de ingelogde gebruiker eigenaar of beheerder is. */
async function rijVoor(formData: FormData) {
  const { userId } = await auth();
  const siteId = Number(formData.get("siteId"));
  const formulier = String(formData.get("formulier") ?? "");
  if (!userId || !Number.isInteger(siteId) || !formulier) return null;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return null;
  const beheerder = await isBeheerder();
  if (site.clerkUserId !== userId && !beheerder) return null;
  const [rij] = await db
    .select()
    .from(formulierBevestigingen)
    .where(and(eq(formulierBevestigingen.siteId, siteId), eq(formulierBevestigingen.formulier, formulier)));
  return rij ? { site, rij, beheerder } : null;
}

function ververs(siteId: number) {
  revalidatePath("/portal");
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/admin/formulieren");
}

export async function bewaarBevestiging(formData: FormData) {
  const r = await rijVoor(formData);
  if (!r) return;
  const onderwerp = String(formData.get("onderwerp") ?? "").trim().slice(0, 150);
  const tekst = String(formData.get("tekst") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 2000);
  if (!onderwerp || !tekst) return;
  if (onderwerp === r.rij.onderwerp && tekst === r.rij.tekst) return;
  await db
    .update(formulierBevestigingen)
    .set({ onderwerp, tekst, bron: r.beheerder ? "wordswap" : "klant", bijgewerkt: new Date() })
    .where(eq(formulierBevestigingen.id, r.rij.id));
  ververs(r.site.id);
}

export async function zetBevestigingAan(formData: FormData) {
  const r = await rijVoor(formData);
  if (!r) return;
  await db
    .update(formulierBevestigingen)
    .set({ aan: formData.get("aan") === "1", bijgewerkt: new Date() })
    .where(eq(formulierBevestigingen.id, r.rij.id));
  ververs(r.site.id);
}

/** Alleen op verzoek: een nieuw AI-voorstel (vervangt de huidige tekst, dus de knop vraagt eerst om bevestiging). */
export async function nieuwBevestigingsVoorstel(formData: FormData) {
  const r = await rijVoor(formData);
  if (!r) return;
  const { maakVoorstel } = await import("@/lib/formulier-bevestiging");
  const vorm = /\b(u|uw)\b/i.test(r.rij.tekst ?? "") ? "u" : "je";
  const v = await maakVoorstel({
    siteNaam: r.site.naam,
    formulier: r.rij.formulier,
    paginas: r.rij.paginas as string[],
    velden: r.rij.velden as string[],
    vorm,
  });
  if (!v) return;
  await db
    .update(formulierBevestigingen)
    .set({ ...v, bron: "ai", bijgewerkt: new Date() })
    .where(eq(formulierBevestigingen.id, r.rij.id));
  ververs(r.site.id);
}

/** Testmail naar de ingelogde gebruiker zelf, precies zoals een invuller hem krijgt. */
export async function testBevestiging(formData: FormData) {
  const r = await rijVoor(formData);
  if (!r?.rij.tekst) return;
  const email = (await currentUser())?.emailAddresses?.[0]?.emailAddress;
  if (!email) return;
  const { verstuurSiteMail } = await import("@/lib/mail");
  const { bevestigingsHtml } = await import("@/lib/formulier-bevestiging");
  await verstuurSiteMail({
    site: r.site,
    naar: email,
    onderwerp: `[Test] ${r.rij.onderwerp ?? ""}`,
    html: bevestigingsHtml({
      tekst: r.rij.tekst,
      naam: "Sanne",
      veldenHtml: "<p><strong>naam:</strong> Sanne</p><p><strong>email:</strong> sanne@voorbeeld.nl</p><p><strong>bericht:</strong> Dit is een testinzending.</p>",
    }),
    antwoordNaar: r.site.notificatieEmail ?? undefined,
  });
}

/** Formulieren van de gepubliceerde site opnieuw inlezen (nieuwe formulieren krijgen een voorstel). */
export async function formulierenInlezen(formData: FormData) {
  const { userId } = await auth();
  const siteId = Number(formData.get("siteId"));
  if (!userId || !Number.isInteger(siteId)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || (site.clerkUserId !== userId && !(await isBeheerder()))) return;
  const { laadWerkmap, ruimWerkmapOp } = await import("@/lib/werkmap");
  const { synchroniseerFormulieren } = await import("@/lib/formulier-bevestiging");
  const map = await laadWerkmap(site.githubRepo);
  try {
    await synchroniseerFormulieren(site, map);
  } finally {
    await ruimWerkmapOp(map).catch(() => {});
  }
  ververs(site.id);
}
