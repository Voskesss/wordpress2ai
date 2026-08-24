import type { Metadata } from "next";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Admin() {
  await requireAdmin();
  const alleSites = await db.select().from(sites);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Admin
      </h1>
      <p className="mt-3 text-stone-600">
        {alleSites.length} klantsite{alleSites.length === 1 ? "" : "s"}
      </p>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="p-4 font-medium">Site</th>
              <th className="p-4 font-medium">Domein</th>
              <th className="p-4 font-medium">Repo</th>
              <th className="p-4 font-medium">Plan</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {alleSites.length === 0 ? (
              <tr>
                <td className="p-4 text-stone-500" colSpan={5}>
                  Nog geen sites — de eerste klant (je eigen site) voegen we
                  toe zodra de database gekoppeld is.
                </td>
              </tr>
            ) : (
              alleSites.map((site) => (
                <tr
                  key={site.id}
                  className="border-b border-stone-100 last:border-0"
                >
                  <td className="p-4 font-semibold text-stone-800">
                    {site.naam}
                  </td>
                  <td className="p-4 text-stone-600">{site.domein ?? "—"}</td>
                  <td className="p-4 text-stone-600">{site.githubRepo}</td>
                  <td className="p-4 text-stone-600">
                    {site.plan === "via_ons" ? "Via ons" : "Eigen key"}
                  </td>
                  <td className="p-4 text-stone-600">{site.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
