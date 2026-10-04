"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { changes, siteLeden, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";
import { MAX_GRATIS_LEDEN, anderenInConcept, logActiviteit, naamVan, toegangTot } from "@/lib/toegang";
import { clerkAccountVoor, controleerUitnodiging, uitnodigingsMail, verzoekMail } from "@/lib/team";

/** Het team beheren is van de eigenaar (en Jos als beheerder). */
async function teamSite(siteId: number) {
  const { userId } = await auth();
  if (!userId || !Number.isInteger(siteId)) return null;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || site.isDemo) return null;
  if (site.clerkUserId !== userId && !(await isBeheerder())) return null;
  return { site, userId };
}

async function origin() {
  const kop = await headers();
  const host = kop.get("x-forwarded-host") ?? kop.get("host") ?? "www.wordswap.nl";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

export type TeamUitslag = { ok: boolean; melding: string };

export async function teamUitnodigen(_vorige: TeamUitslag | null, formData: FormData): Promise<TeamUitslag> {
  const t = await teamSite(Number(formData.get("siteId")));
  if (!t) return { ok: false, melding: "Alleen de eigenaar kan teamleden toevoegen." };
  const bestaand = await db.select({ email: siteLeden.email }).from(siteLeden).where(eq(siteLeden.siteId, t.site.id));
  const ik = await currentUser();
  const eigenaarEmail = t.site.clerkUserId === t.userId ? (ik?.emailAddresses[0]?.emailAddress ?? null) : null;
  const check = controleerUitnodiging(
    { naam: formData.get("naam"), email: formData.get("email"), magPubliceren: formData.get("magPubliceren"), magBerichten: formData.get("magBerichten") },
    bestaand,
    eigenaarEmail,
    MAX_GRATIS_LEDEN,
  );
  if (!check.ok) return { ok: false, melding: check.fout };
  const { invoer } = check;
  const clerkId = await clerkAccountVoor(invoer.email, invoer.naam);
  await db.insert(siteLeden).values({
    siteId: t.site.id,
    email: invoer.email,
    naam: invoer.naam,
    clerkUserId: clerkId,
    magPubliceren: invoer.magPubliceren,
    magBerichten: invoer.magBerichten,
    uitgenodigdDoor: t.userId,
  });
  const basis = await origin();
  const portaal = `${basis}/portal?site=${t.site.id}`;
  const door = await naamVan(t.site.id, t.userId);
  const mail = uitnodigingsMail({
    naam: invoer.naam,
    door,
    siteNaam: t.site.naam,
    inlogUrl: `${basis}/sign-in?redirect_url=${encodeURIComponent(portaal)}`,
    magPubliceren: invoer.magPubliceren,
    magBerichten: invoer.magBerichten,
  });
  const { mailVanJos } = await import("@/lib/wordswap-mail");
  const verstuurd = await mailVanJos({ naar: invoer.email, van: "WordSwap", onderwerp: mail.onderwerp, html: mail.html, bcc: false });
  await logActiviteit(t.site.id, t.userId, "team", `${invoer.naam} (${invoer.email}) toegevoegd aan het team`);
  revalidatePath("/portal");
  return verstuurd
    ? { ok: true, melding: `${invoer.naam} is toegevoegd en krijgt een mail om in te loggen.` }
    : { ok: true, melding: `${invoer.naam} is toegevoegd, maar de mail lukte niet. Laat weten dat hij of zij kan inloggen op wordswap.nl met ${invoer.email}.` };
}

export async function teamRechten(formData: FormData) {
  const t = await teamSite(Number(formData.get("siteId")));
  const lidId = Number(formData.get("lidId"));
  if (!t || !Number.isInteger(lidId)) return;
  const veld = String(formData.get("veld"));
  const aan = formData.get("aan") === "1";
  if (veld !== "magPubliceren" && veld !== "magBerichten") return;
  const [lid] = await db.select().from(siteLeden).where(and(eq(siteLeden.id, lidId), eq(siteLeden.siteId, t.site.id)));
  if (!lid) return;
  await db.update(siteLeden).set({ [veld]: aan }).where(eq(siteLeden.id, lid.id));
  const wat = veld === "magPubliceren" ? "zelf publiceren" : "berichten zien";
  await logActiviteit(t.site.id, t.userId, "team", `${lid.naam}: ${wat} ${aan ? "aangezet" : "uitgezet"}`);
  revalidatePath("/portal");
}

export async function teamVerwijderen(formData: FormData) {
  const t = await teamSite(Number(formData.get("siteId")));
  const lidId = Number(formData.get("lidId"));
  if (!t || !Number.isInteger(lidId)) return;
  const [lid] = await db.select().from(siteLeden).where(and(eq(siteLeden.id, lidId), eq(siteLeden.siteId, t.site.id)));
  if (!lid) return;
  await db.delete(siteLeden).where(eq(siteLeden.id, lid.id));
  await logActiviteit(t.site.id, t.userId, "team", `${lid.naam} uit het team gehaald`);
  revalidatePath("/portal");
}

/** Teamlid zonder publiceerrecht: vraag de eigenaar om het concept live te zetten. */
export async function vraagPublicatie(siteId: number): Promise<TeamUitslag> {
  const { userId } = await auth();
  if (!userId || !Number.isInteger(siteId)) return { ok: false, melding: "Niet ingelogd." };
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return { ok: false, melding: "Site niet gevonden." };
  const toegang = await toegangTot(site, userId);
  if (!toegang) return { ok: false, melding: "Geen toegang." };
  const [concept] = await db
    .select()
    .from(changes)
    .where(and(eq(changes.siteId, site.id), eq(changes.status, "concept")))
    .orderBy(changes.id)
    .then((r) => r.slice(-1));
  if (!concept) return { ok: false, melding: "Er staat geen concept klaar." };
  const { klantAdres } = await import("@/lib/klant-adres");
  const eigenaar = await klantAdres(site);
  if (!eigenaar) return { ok: false, melding: "De eigenaar is niet te bereiken via de mail. Laat het hem of haar zelf weten." };
  const lidNaam = await naamVan(site.id, userId);
  const eigenWerk = (await anderenInConcept(concept.id, "__niemand__")).find((b) => b.naam === lidNaam)?.wat ?? [];
  const mail = verzoekMail({ eigenaarNaam: eigenaar.naam, lidNaam, siteNaam: site.naam, wat: eigenWerk, portaalUrl: `${await origin()}/portal?site=${site.id}` });
  const { mailVanJos } = await import("@/lib/wordswap-mail");
  const ok = await mailVanJos({ naar: eigenaar.email, van: "WordSwap", onderwerp: mail.onderwerp, html: mail.html, bcc: false });
  await logActiviteit(site.id, userId, "verzoek", "vroeg de eigenaar om het concept te publiceren", concept.id);
  return ok ? { ok: true, melding: "De eigenaar heeft een mail gekregen." } : { ok: false, melding: "De mail lukte niet. Laat het de eigenaar zelf even weten." };
}
