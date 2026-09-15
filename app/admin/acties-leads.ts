"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LEAD_STATUSSEN } from "@/lib/leads";

function veld(formData: FormData, naam: string): string | null {
  const w = String(formData.get(naam) ?? "").trim();
  return w || null;
}

function leadVelden(formData: FormData) {
  const status = String(formData.get("status") ?? "nieuw");
  const datum = veld(formData, "actieDatum");
  return {
    naam: veld(formData, "naam") ?? "Onbekend",
    email: veld(formData, "email"),
    telefoon: veld(formData, "telefoon"),
    website: veld(formData, "website")?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null,
    bron: veld(formData, "bron"),
    soort: formData.get("soort") === "partner" ? "partner" : "klant",
    status: LEAD_STATUSSEN.some((s) => s.waarde === status) ? status : "nieuw",
    volgendeActie: veld(formData, "volgendeActie"),
    actieDatum: datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : null,
    notities: veld(formData, "notities"),
  };
}

export async function leadToevoegen(formData: FormData) {
  await requireAdmin();
  await db.insert(leads).values(leadVelden(formData));
  revalidatePath("/admin/leads");
}

export async function leadBijwerken(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db
    .update(leads)
    .set({ ...leadVelden(formData), bijgewerkt: new Date() })
    .where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}

export async function leadVerwijderen(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db.delete(leads).where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}
