"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leadActies, leads } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LEAD_STATUSSEN } from "@/lib/leads";

function veld(formData: FormData, naam: string): string | null {
  const w = String(formData.get(naam) ?? "").trim();
  return w || null;
}

function leadVelden(formData: FormData) {
  const status = String(formData.get("status") ?? "nieuw");
  return {
    naam: veld(formData, "naam") ?? "Onbekend",
    email: veld(formData, "email"),
    telefoon: veld(formData, "telefoon"),
    website: veld(formData, "website")?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null,
    bron: veld(formData, "bron"),
    soort: formData.get("soort") === "partner" ? "partner" : "klant",
    status: LEAD_STATUSSEN.some((s) => s.waarde === status) ? status : "nieuw",
    notities: veld(formData, "notities"),
  };
}

function datumVeld(formData: FormData): string | null {
  const d = veld(formData, "datum");
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export async function leadToevoegen(formData: FormData) {
  await requireAdmin();
  const [nieuw] = await db.insert(leads).values(leadVelden(formData)).returning({ id: leads.id });
  const eersteActie = veld(formData, "actie");
  if (nieuw && eersteActie) {
    await db.insert(leadActies).values({ leadId: nieuw.id, tekst: eersteActie, datum: datumVeld(formData) });
  }
  revalidatePath("/admin/leads");
}

export async function actieToevoegen(formData: FormData) {
  await requireAdmin();
  const leadId = Number(formData.get("leadId"));
  const tekst = veld(formData, "actie");
  if (!Number.isInteger(leadId) || !tekst) return;
  await db.insert(leadActies).values({ leadId, tekst, datum: datumVeld(formData) });
  revalidatePath("/admin/leads");
}

/** Vinkt een actie af, of zet een afgevinkte actie terug op open. */
export async function actieAfvinken(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const gedaan = formData.get("gedaan") === "1";
  await db
    .update(leadActies)
    .set({ gedaan, gedaanOp: gedaan ? new Date() : null })
    .where(eq(leadActies.id, id));
  revalidatePath("/admin/leads");
}

export async function actieVerwijderen(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db.delete(leadActies).where(eq(leadActies.id, id));
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
  await db.delete(leadActies).where(eq(leadActies.leadId, id));
  await db.delete(leads).where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}
