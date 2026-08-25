import type { Metadata } from "next";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { bewaarRichtlijnen } from "./acties";

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Admin
        </h1>
        <a
          href="/admin/migraties"
          className="rounded-full bg-violet-700 px-5 py-2.5 text-white text-sm font-semibold hover:bg-violet-600"
        >
          Migraties
        </a>
      </div>
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

      <h2 className="font-display mt-12 text-2xl font-semibold">
        Richtlijnen per website
      </h2>
      <p className="mt-2 text-stone-600 text-sm">
        Extra regels die de AI bij deze specifieke site altijd naleeft, bovenop
        de algemene huisregels (mobielvriendelijk, SEO-behoud,
        toegankelijkheid, consistentie).
      </p>
      <div className="mt-6 space-y-6">
        {alleSites.map((site) => (
          <form
            key={site.id}
            action={bewaarRichtlijnen}
            className="rounded-2xl border border-stone-200 bg-white p-6"
          >
            <input type="hidden" name="siteId" value={site.id} />
            <p className="font-semibold">{site.naam}</p>
            <textarea
              name="richtlijnen"
              rows={4}
              defaultValue={site.richtlijnen ?? ""}
              placeholder={
                "Bijv.:\n- Spreek bezoekers aan met 'u'\n- Prijzen altijd met € en twee decimalen\n- De huiskleur is donkerbruin, gebruik geen andere kleuren"
              }
              className="mt-3 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-violet-600 focus:outline-none"
            />
            <button
              type="submit"
              className="mt-3 rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
            >
              Opslaan
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
