import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Mijn website",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Portal() {
  const userId = await requireUser();
  const mijnSites = await db
    .select()
    .from(sites)
    .where(eq(sites.clerkUserId, userId));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Mijn website
      </h1>
      {mijnSites.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-stone-600 leading-relaxed">
            Je omgeving wordt nog voor je klaargezet. Zodra je website
            gekoppeld is, kun je hier wijzigingen doorgeven. Vragen? Mail ons
            gerust.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {mijnSites.map((site) => (
            <div
              key={site.id}
              className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {site.naam}
                  </h2>
                  <p className="mt-1 text-stone-500 text-sm">
                    {site.domein ?? "domein volgt"} · status: {site.status}
                  </p>
                </div>
                <span className="rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-sm font-medium text-violet-700">
                  {site.plan === "via_ons" ? "Via ons" : "Eigen AI-account"}
                </span>
              </div>
              <p className="mt-4 text-stone-600 text-sm">
                De chat om wijzigingen door te geven komt hier binnenkort.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
