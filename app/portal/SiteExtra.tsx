import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formulierInzendingen, kennisDocumenten } from "@/db/schema";
import {
  bewaarNotificatieEmail,
  uploadKennisDocument,
  verwijderKennisDocument,
} from "./acties";

export default async function SiteExtra({
  siteId,
  siteRepo,
  notificatieEmail,
}: {
  siteId: number;
  siteRepo: string;
  notificatieEmail: string | null;
}) {
  const inzendingen = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.siteRepo, siteRepo))
    .orderBy(desc(formulierInzendingen.id))
    .then((r) => r.slice(0, 10));
  const documenten = await db
    .select()
    .from(kennisDocumenten)
    .where(eq(kennisDocumenten.siteId, siteId))
    .orderBy(desc(kennisDocumenten.id));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {/* Formulier-inzendingen */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h3 className="font-display text-lg font-semibold">
          Berichten via je contactformulier
        </h3>
        {inzendingen.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">
            Nog geen berichten ontvangen.
          </p>
        ) : (
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {inzendingen.map((inz) => (
              <div
                key={inz.id}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm"
              >
                <p className="text-xs text-stone-400">
                  {inz.aangemaakt.toLocaleString("nl-NL")}
                </p>
                <dl className="mt-1 space-y-0.5">
                  {Object.entries(inz.velden as Record<string, string>).map(
                    ([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="font-semibold text-stone-700 shrink-0 capitalize">
                          {k}:
                        </dt>
                        <dd className="text-stone-600 break-words min-w-0">{v}</dd>
                      </div>
                    )
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
        <form action={bewaarNotificatieEmail} className="mt-5 border-t border-stone-100 pt-4">
          <input type="hidden" name="siteId" value={siteId} />
          <label className="block text-sm font-semibold">
            Stuur nieuwe berichten door naar
            <div className="mt-1.5 flex gap-2">
              <input
                name="email"
                type="email"
                defaultValue={notificatieEmail ?? ""}
                placeholder="jouw@bedrijf.nl"
                className="flex-1 min-w-0 rounded-xl border border-stone-300 px-4 py-2.5 font-normal text-sm focus:border-violet-600 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
              >
                Opslaan
              </button>
            </div>
          </label>
        </form>
      </div>

      {/* Kennisdocumenten (voor de toekomstige chatbot) */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display text-lg font-semibold">
            Documenten over je bedrijf
          </h3>
          <span className="rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            voor de WordSwap-chatbot — binnenkort
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-600">
          Upload teksten over je diensten, prijzen of veelgestelde vragen
          (.txt of .md, max 1 MB). Zodra de chatbot voor je website
          beschikbaar is, beantwoordt hij bezoekersvragen op basis hiervan.
        </p>
        {documenten.length > 0 && (
          <ul className="mt-4 space-y-2">
            {documenten.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              >
                <span className="truncate font-medium">{doc.naam}</span>
                <form action={verwijderKennisDocument}>
                  <input type="hidden" name="siteId" value={siteId} />
                  <input type="hidden" name="docId" value={doc.id} />
                  <button
                    type="submit"
                    className="text-stone-400 hover:text-red-600 cursor-pointer"
                    aria-label={`Verwijder ${doc.naam}`}
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={uploadKennisDocument} className="mt-4 flex gap-2 flex-wrap">
          <input type="hidden" name="siteId" value={siteId} />
          <input
            type="file"
            name="document"
            accept=".txt,.md,.markdown"
            required
            className="flex-1 min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-violet-700 file:font-semibold file:cursor-pointer"
          />
          <button
            type="submit"
            className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
          >
            Upload
          </button>
        </form>
      </div>
    </div>
  );
}
