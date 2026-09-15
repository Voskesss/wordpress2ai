"use server";

import { asc, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { webinarMailInstellingen, webinars } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { bouwReeksMail, REEKS, type ReeksSoort } from "@/lib/webinar-reeks";
import { mailVanJos } from "@/lib/wordswap-mail";

function geldigeSoort(w: FormDataEntryValue | null): ReeksSoort | null {
  const s = String(w ?? "");
  return REEKS.some((r) => r.soort === s) ? (s as ReeksSoort) : null;
}

/** Eén mail uit de reeks aan- of uitzetten. */
export async function reeksMailZetten(formData: FormData) {
  await requireAdmin();
  const soort = geldigeSoort(formData.get("soort"));
  if (!soort) return;
  const aan = formData.get("aan") === "1";
  await db
    .insert(webinarMailInstellingen)
    .values({ soort, aan, bijgewerkt: new Date() })
    .onConflictDoUpdate({ target: webinarMailInstellingen.soort, set: { aan, bijgewerkt: new Date() } });
  revalidatePath("/admin/webinars");
}

/** Voorbeeldwebinar: het eerstvolgende echte, anders een fictieve datum over een week. */
export async function voorbeeldWebinar() {
  const [komend] = await db.select().from(webinars).where(gte(webinars.wanneer, new Date())).orderBy(asc(webinars.wanneer)).limit(1);
  if (komend) return komend;
  const over = new Date();
  over.setDate(over.getDate() + 7);
  over.setHours(20, 0, 0, 0);
  return { titel: "Weg uit WordPress — zonder gedoe", wanneer: over, meetLink: null, opnameLink: null, demoVideoLink: null };
}

/** Een mail uit de reeks als test naar Jos sturen. */
export async function reeksTestNaarMij(formData: FormData) {
  await requireAdmin();
  const soort = geldigeSoort(formData.get("soort"));
  if (!soort) return;
  const w = await voorbeeldWebinar();
  const mail = bouwReeksMail(soort, { voornaam: "Jos", webinar: w, afmeldUrl: "https://wordswap.nl/webinar/afmelden?voorbeeld=1" });
  await mailVanJos({ naar: "jos@wordswap.nl", bcc: false, onderwerp: `[TEST] ${mail.onderwerp}`, html: mail.html });
}
