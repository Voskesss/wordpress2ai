"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bouwJobs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

/** Haalt een wachtende bouwopdracht uit de wachtrij, of markeert een hangende als mislukt. */
export async function annuleerJob(formData: FormData) {
  await requireAdmin();
  const jobId = Number(formData.get("jobId"));
  if (!Number.isInteger(jobId)) return;
  const [job] = await db.select().from(bouwJobs).where(eq(bouwJobs.id, jobId));
  if (!job) return;
  if (job.status === "wachtend") {
    await db.delete(bouwJobs).where(eq(bouwJobs.id, jobId));
  } else if (job.status === "bezig") {
    // De worker zelf stoppen kan niet vanaf hier; markeer als mislukt zodat
    // de wachtrij vrij is (een lopende Action stopt vanzelf bij afronding).
    await db
      .update(bouwJobs)
      .set({ status: "fout", voortgang: "Handmatig geannuleerd", bijgewerkt: new Date() })
      .where(eq(bouwJobs.id, jobId));
  }
  revalidatePath("/admin/migraties");
}
