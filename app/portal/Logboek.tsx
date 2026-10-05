import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { siteActiviteit } from "@/db/schema";

const ICOON: Record<string, string> = {
  concept: "✏️",
  gepubliceerd: "🚀",
  verworpen: "🗑️",
  teruggezet: "↩️",
  upload: "📎",
  berichten: "📬",
  team: "👥",
  verzoek: "🙋",
};

/** "diensten/tuinonderhoud.html" → "diensten/tuinonderhoud", "index.html" → "Home" */
const paginaNaam = (pad: string) => {
  const p = pad.replace(/^\/+/, "").replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "").replace(/\/$/, "");
  return p || "Home";
};

/** Logboek: wie deed wat op deze site, nieuwste bovenaan. */
export default async function Logboek({ siteId, aantal = 40 }: { siteId: number; aantal?: number }) {
  const rijen = await db
    .select()
    .from(siteActiviteit)
    .where(eq(siteActiviteit.siteId, siteId))
    .orderBy(desc(siteActiviteit.id))
    .limit(aantal)
    .catch(() => []);
  return (
    <details className="mt-4 rounded-2xl border border-stone-200 bg-white p-5" open={rijen.length > 0 && rijen.length < 6}>
      <summary className="cursor-pointer font-semibold text-stone-800">📒 Logboek: wie deed wat ({rijen.length})</summary>
      {rijen.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">Nog niets. Zodra iemand iets aanpast, publiceert of uploadt, staat het hier met naam en tijd.</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {rijen.map((r) => (
            <li key={r.id} className="flex gap-3 py-2">
              <span aria-hidden className="shrink-0">{ICOON[r.soort] ?? "•"}</span>
              <span className="min-w-0 flex-1">
                <strong className="text-stone-900">{r.naam}</strong>{" "}
                <span className="text-stone-600 [overflow-wrap:anywhere]">{r.omschrijving}</span>
                {Array.isArray(r.bestanden) && (r.bestanden as string[]).length > 0 && (
                  <span className="block text-xs text-stone-500 [overflow-wrap:anywhere]">
                    Aangepast: {(r.bestanden as string[]).slice(0, 6).map(paginaNaam).join(", ")}
                    {(r.bestanden as string[]).length > 6 ? ` +${(r.bestanden as string[]).length - 6}` : ""}
                  </span>
                )}
                <span className="block text-xs text-stone-400">
                  {r.aangemaakt.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
