"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function bewaarRichtlijnen(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const richtlijnen = String(formData.get("richtlijnen") ?? "").trim();
  if (!Number.isInteger(siteId)) return;
  await db
    .update(sites)
    .set({ richtlijnen: richtlijnen || null })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
}

export async function bewaarSite(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const naam = String(formData.get("naam") ?? "").trim();
  const domein = String(formData.get("domein") ?? "").trim();
  const netlifySiteId = String(formData.get("netlifySiteId") ?? "").trim();
  const plan = String(formData.get("plan") ?? "via_ons");
  const status = String(formData.get("status") ?? "migratie");
  if (!naam) return;
  await db
    .update(sites)
    .set({
      naam,
      domein: domein || null,
      netlifySiteId: netlifySiteId || null,
      plan: plan === "eigen_key" ? "eigen_key" : "via_ons",
      status: (["migratie", "actief", "gepauzeerd", "opgezegd"].includes(status)
        ? status
        : "migratie") as "migratie" | "actief" | "gepauzeerd" | "opgezegd",
    })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/admin");
}

/** Koppelt een klantaccount (Clerk) aan een site op basis van e-mail; nodigt uit als het account nog niet bestaat. */
export async function koppelKlant(formData: FormData): Promise<void> {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!Number.isInteger(siteId) || !email.includes("@")) return;

  const secret = process.env.CLERK_SECRET_KEY;
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${secret}` } }
  );
  const users = (await res.json()) as { id: string }[];

  if (Array.isArray(users) && users.length > 0) {
    await db
      .update(sites)
      .set({ clerkUserId: users[0].id })
      .where(eq(sites.id, siteId));
  } else {
    // Account bestaat nog niet: uitnodiging sturen; koppeling volgt zodra
    // de klant zich registreert (dan handmatig of via webhook later).
    await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_address: email }),
    });
  }
  revalidatePath(`/admin/klant/${siteId}`);
}

export async function nieuweSite(formData: FormData) {
  const admin = await requireAdmin();
  const naam = String(formData.get("naam") ?? "").trim();
  const githubRepo = String(formData.get("githubRepo") ?? "").trim();
  const domein = String(formData.get("domein") ?? "").trim();
  if (!naam || !githubRepo) return;
  const [rij] = await db
    .insert(sites)
    .values({
      clerkUserId: admin.id,
      naam,
      githubRepo,
      domein: domein || null,
    })
    .returning({ id: sites.id });
  revalidatePath("/admin");
  redirect(`/admin/klant/${rij.id}`);
}

/** Verwijdert een klant volledig: databasegegevens, en optioneel repo en Cloudflare-site. */
export async function verwijderKlant(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const ookRepo = formData.get("ookRepo") === "on";
  const ookNetlify = formData.get("ookNetlify") === "on";
  if (!Number.isInteger(siteId)) return;

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;

  // Typ-bevestiging: de ingevoerde naam moet exact overeenkomen
  const getypt = String(formData.get("bevestigNaam") ?? "").trim();
  if (getypt !== site.naam) return;

  const {
    changes,
    messages,
    usage,
    apiKeys,
    migrations,
    aiKosten,
    kennisDocumenten,
    formulierInzendingen,
  } = await import("@/db/schema");
  await db.delete(changes).where(eq(changes.siteId, siteId));
  await db.delete(messages).where(eq(messages.siteId, siteId));
  await db.delete(usage).where(eq(usage.siteId, siteId));
  await db.delete(apiKeys).where(eq(apiKeys.siteId, siteId));
  await db.delete(migrations).where(eq(migrations.siteId, siteId));
  await db.delete(aiKosten).where(eq(aiKosten.siteId, siteId));
  await db.delete(kennisDocumenten).where(eq(kennisDocumenten.siteId, siteId));
  await db
    .delete(formulierInzendingen)
    .where(eq(formulierInzendingen.siteRepo, site.githubRepo));
  await db.delete(sites).where(eq(sites.id, siteId));

  if (ookRepo) {
    const { gh, GITHUB_ORG } = await import("@/lib/github");
    await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  if (ookNetlify && site.netlifySiteId) {
    const { verwijderCloudflareSite } = await import("@/lib/cloudflare");
    await verwijderCloudflareSite(site.netlifySiteId);
    await verwijderCloudflareSite(`wv-${site.netlifySiteId}`);
  }

  revalidatePath("/admin");
  redirect("/admin");
}

/** Zet de site online op Cloudflare (gratis, direct, geen build). */
export async function koppelNetlify(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || site.netlifySiteId) return;

  const { deployRepoNaarCloudflare, CF_SUBDOMEIN } = await import("@/lib/cloudflare");
  await deployRepoNaarCloudflare(site.githubRepo, site.githubRepo);
  // Werkversie-adres alvast klaarzetten (SSL heeft even nodig bij eerste keer)
  await deployRepoNaarCloudflare(site.githubRepo, `wv-${site.githubRepo}`).catch(() => {});
  await db
    .update(sites)
    .set({
      netlifySiteId: site.githubRepo,
      domein: `${site.githubRepo}.${CF_SUBDOMEIN}.workers.dev`,
    })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/admin");
}

/** Zet de live site terug naar een eerdere versie (commit) — geschiedenis blijft intact. */
export async function herstelVersie(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const sha = String(formData.get("sha") ?? "");
  if (!Number.isInteger(siteId) || !/^[0-9a-f]{7,40}$/i.test(sha)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;
  const { zetTerugNaarVersie } = await import("@/lib/github");
  await zetTerugNaarVersie(site.githubRepo, sha);
  if (site.netlifySiteId) {
    const { deployRepoNaarCloudflare } = await import("@/lib/cloudflare");
    await deployRepoNaarCloudflare(site.githubRepo, site.netlifySiteId).catch((e) =>
      console.error("Deploy na terugzetten mislukt:", e)
    );
  }
  revalidatePath(`/admin/klant/${siteId}`);
}
