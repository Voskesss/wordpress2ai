import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { facturen } from "@/db/schema";
import { euroTekst } from "@/lib/mollie";

/** Facturen van WordSwap voor deze website, te downloaden door de klant zelf. */
export default async function KlantFacturen({ siteId }: { siteId: number }) {
  const lijst = await db
    .select({
      id: facturen.id,
      nummer: facturen.nummer,
      soort: facturen.soort,
      datum: facturen.datum,
      totaalCent: facturen.totaalCent,
      regels: facturen.regels,
    })
    .from(facturen)
    .where(eq(facturen.siteId, siteId))
    .orderBy(desc(facturen.id))
    .catch(() => []);
  const zichtbaar = lijst.filter((f) => f.nummer);
  if (zichtbaar.length === 0) return null;

  return (
    <details className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-stone-800">🧾 Facturen van WordSwap ({zichtbaar.length})</summary>
      <ul className="mt-3 divide-y divide-stone-100 text-sm">
        {zichtbaar.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <a
                href={`/api/portal/factuur/${f.nummer}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald-800 hover:underline"
              >
                {f.soort === "credit" ? "Creditfactuur" : "Factuur"} {f.nummer}
              </a>
              <span className="ml-2 text-stone-500">
                {f.datum.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })} · {f.regels.map((r) => r.omschrijving).join(", ")}
              </span>
            </span>
            <span className={f.totaalCent < 0 ? "font-medium text-red-700" : "font-medium"}>{euroTekst(f.totaalCent)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
