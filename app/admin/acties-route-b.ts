"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { hoofdBinding, kaalDomein } from "@/lib/hoofdadres";

/** Route B van de livegang: het domein blijft bij de hoster, alleen het
 * websiteverkeer komt naar ons. Meldt het domein van deze site aan. */
export async function routeBAanmelden(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  const domein = site ? kaalDomein(site) : null;
  if (!site || !site.siteSlug || !domein) redirect(`/admin/klant/${siteId}?routeb=geen-domein#route-b`);
  let uitkomst = "aangemeld";
  try {
    const { meldDomeinAan } = await import("@/lib/route-b");
    await meldDomeinAan(domein, site.siteSlug, hoofdBinding(site), { vooraf: formData.get("vooraf") === "ja" });
  } catch (e) {
    console.error("Route B aanmelden mislukt:", e);
    uitkomst = "mislukt";
  }
  revalidatePath(`/admin/klant/${siteId}`);
  redirect(`/admin/klant/${siteId}?routeb=${uitkomst}#route-b`);
}

/** Haalt het domein weer bij de verdeler weg. De site zelf blijft staan. */
export async function routeBAfmelden(formData: FormData) {
  await requireAdmin();
  const siteId = Number(formData.get("siteId"));
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  const domein = site ? kaalDomein(site) : null;
  if (!site || !domein) redirect(`/admin/klant/${siteId}?routeb=geen-domein#route-b`);
  let uitkomst = "afgemeld";
  try {
    const { leesDomeinkaart, meldDomeinAf, slugVan } = await import("@/lib/route-b");
    // Alleen afmelden wat echt bij DEZE site hoort
    if (slugVan((await leesDomeinkaart())[domein]) === site.siteSlug) await meldDomeinAf(domein);
    else uitkomst = "niet-van-deze-site";
  } catch (e) {
    console.error("Route B afmelden mislukt:", e);
    uitkomst = "mislukt";
  }
  revalidatePath(`/admin/klant/${siteId}`);
  redirect(`/admin/klant/${siteId}?routeb=${uitkomst}#route-b`);
}
