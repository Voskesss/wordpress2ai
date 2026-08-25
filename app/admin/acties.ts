"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
  revalidatePath("/admin");
}
