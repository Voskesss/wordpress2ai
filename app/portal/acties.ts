"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { kennisDocumenten, sites } from "@/db/schema";
import { isBeheerder } from "@/lib/auth";

/** Site ophalen als de ingelogde gebruiker eigenaar (of admin) is. */
async function eigenSite(siteId: number) {
  const { userId } = await auth();
  if (!userId || !Number.isInteger(siteId)) return null;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return null;
  if (site.clerkUserId !== userId && !(await isBeheerder())) return null;
  return site;
}

export async function bewaarNotificatieEmail(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email && !email.includes("@")) return;
  await db
    .update(sites)
    .set({ notificatieEmail: email || null })
    .where(eq(sites.id, site.id));
  revalidatePath("/portal");
}

/** Handtekening onder de formuliermails van deze site (bevestiging aan de invuller). */
export async function bewaarMailHandtekening(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const handtekening = String(formData.get("handtekening") ?? "").replace(/\r/g, "").trim().slice(0, 600);
  const logoUrl = String(formData.get("logoUrl") ?? "").trim().slice(0, 300);
  const kleur = String(formData.get("kleur") ?? "").trim();
  if (logoUrl && !/^https?:\/\/[^\s<>"]+$/.test(logoUrl)) return;
  await db
    .update(sites)
    .set({
      mailHandtekening: handtekening || null,
      mailLogoUrl: logoUrl || null,
      mailKleur: /^#[0-9a-fA-F]{6}$/.test(kleur) ? kleur : null,
    })
    .where(eq(sites.id, site.id));
  revalidatePath("/portal");
  revalidatePath(`/admin/klant/${site.id}`);
}

/** Logo voor de mailhandtekening uploaden: komt als afbeeldingen/mail-logo.webp
 * in de site (repo + live), zodat mailprogramma's hem gewoon kunnen laden. */
export async function uploadMailLogo(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const bestand = formData.get("logo");
  if (!(bestand instanceof File) || bestand.size === 0) return;
  if (bestand.size > 5 * 1024 * 1024) return;
  const sharp = (await import("sharp")).default;
  const data = await sharp(Buffer.from(await bestand.arrayBuffer()))
    .rotate()
    .resize({ width: 480, height: 200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();
  const pad = "afbeeldingen/mail-logo.webp";
  const { pushBestanden } = await import("@/lib/github");
  await pushBestanden(site.githubRepo, [{ pad, inhoud: data }], "Logo voor de mailhandtekening");
  if (site.netlifySiteId) {
    const { deployRepoNaarCloudflare } = await import("@/lib/cloudflare");
    await deployRepoNaarCloudflare(site.githubRepo, site.netlifySiteId).catch((e) =>
      console.error("Deploy na logo-upload mislukt:", e)
    );
  }
  const host = site.domein && !/\.workers\.dev$/.test(site.domein) ? site.domein : `${site.netlifySiteId ?? site.githubRepo}.wordswap.workers.dev`;
  await db
    .update(sites)
    .set({ mailLogoUrl: `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${pad}?v=${Date.now().toString(36)}` })
    .where(eq(sites.id, site.id));
  revalidatePath("/portal");
  revalidatePath(`/admin/klant/${site.id}`);
}

const MAX_DOCUMENTEN = 20;

export async function uploadKennisDocument(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > 1024 * 1024) return; // max 1 MB tekst
  if (!/\.(txt|md|markdown)$/i.test(file.name)) return;

  const aantal = await db
    .select({ id: kennisDocumenten.id })
    .from(kennisDocumenten)
    .where(eq(kennisDocumenten.siteId, site.id));
  if (aantal.length >= MAX_DOCUMENTEN) return;

  await db.insert(kennisDocumenten).values({
    siteId: site.id,
    naam: file.name.slice(0, 120),
    inhoud: (await file.text()).slice(0, 200_000),
  });
  revalidatePath("/portal");
}

export async function verwijderKennisDocument(formData: FormData) {
  const site = await eigenSite(Number(formData.get("siteId")));
  if (!site) return;
  const docId = Number(formData.get("docId"));
  if (!Number.isInteger(docId)) return;
  await db
    .delete(kennisDocumenten)
    .where(
      and(eq(kennisDocumenten.id, docId), eq(kennisDocumenten.siteId, site.id))
    );
  revalidatePath("/portal");
}

/** Inzending archiveren (uit het overzicht) of definitief verwijderen. */
export async function inzendingVerwerken(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;
  const id = Number(formData.get("id"));
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(id) || !Number.isInteger(siteId)) return;
  const site = await eigenSite(siteId);
  if (!site) return;

  const { formulierInzendingen } = await import("@/db/schema");
  const { and } = await import("drizzle-orm");
  const actie = String(formData.get("actie") ?? "archiveer");
  if (actie === "verwijder") {
    await db
      .delete(formulierInzendingen)
      .where(
        and(
          eq(formulierInzendingen.id, id),
          eq(formulierInzendingen.siteRepo, site.githubRepo)
        )
      );
  } else {
    await db
      .update(formulierInzendingen)
      .set({ gearchiveerd: actie !== "terug" })
      .where(
        and(
          eq(formulierInzendingen.id, id),
          eq(formulierInzendingen.siteRepo, site.githubRepo)
        )
      );
  }
  revalidatePath("/portal");
  revalidatePath(`/admin/klant/${siteId}`);
}
