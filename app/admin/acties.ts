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

/** Verwijdert een klant volledig: databasegegevens, en optioneel repo en Netlify-site. */
export async function verwijderKlant(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const bevestiging = formData.get("bevestiging") === "on";
  const ookRepo = formData.get("ookRepo") === "on";
  const ookNetlify = formData.get("ookNetlify") === "on";
  if (!Number.isInteger(siteId) || !bevestiging) return;

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return;

  const { changes, messages, usage, apiKeys, migrations } = await import(
    "@/db/schema"
  );
  await db.delete(changes).where(eq(changes.siteId, siteId));
  await db.delete(messages).where(eq(messages.siteId, siteId));
  await db.delete(usage).where(eq(usage.siteId, siteId));
  await db.delete(apiKeys).where(eq(apiKeys.siteId, siteId));
  await db.delete(migrations).where(eq(migrations.siteId, siteId));
  await db.delete(sites).where(eq(sites.id, siteId));

  if (ookRepo) {
    const { gh, GITHUB_ORG } = await import("@/lib/github");
    await gh(`/repos/${GITHUB_ORG}/${site.githubRepo}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  if (ookNetlify && site.netlifySiteId && process.env.NETLIFY_TOKEN) {
    const lijst = await fetch("https://api.netlify.com/api/v1/sites", {
      headers: { Authorization: `Bearer ${process.env.NETLIFY_TOKEN}` },
    }).then((r) => r.json() as Promise<{ id: string; name: string }[]>);
    const netlifySite = lijst.find((s) => s.name === site.netlifySiteId);
    if (netlifySite) {
      await fetch(`https://api.netlify.com/api/v1/sites/${netlifySite.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${process.env.NETLIFY_TOKEN}` },
      }).catch(() => {});
    }
  }

  revalidatePath("/admin");
  redirect("/admin");
}

/** Maakt een Netlify-site aan, koppelt de repo, zet previews open en slaat alles op. */
export async function koppelNetlify(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  if (!Number.isInteger(siteId)) return;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site || site.netlifySiteId) return;

  const hdr = {
    Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
    "Content-Type": "application/json",
  };
  const res = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({
      name: site.githubRepo,
      repo: {
        provider: "github",
        repo: `wordpress2ai/${site.githubRepo}`,
        private: true,
        branch: "main",
        cmd: "",
        dir: "/",
      },
    }),
  });
  if (!res.ok) {
    console.error("Netlify koppelen mislukt:", res.status, await res.text());
    return;
  }
  const data = (await res.json()) as { id: string; name: string };
  // Previews openzetten (anders zitten concepten achter een Netlify-login)
  await fetch(`https://api.netlify.com/api/v1/sites/${data.id}`, {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify({ sso_login: false }),
  });
  await db
    .update(sites)
    .set({
      netlifySiteId: data.name,
      domein: `${data.name}.netlify.app`,
    })
    .where(eq(sites.id, siteId));
  revalidatePath(`/admin/klant/${siteId}`);
  revalidatePath("/admin");
}
