import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formulierInzendingen, kennisDocumenten } from "@/db/schema";
import {
  bewaarNotificatieEmail,
  inzendingVerwerken,
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
  const alle = await db
    .select()
    .from(formulierInzendingen)
    .where(eq(formulierInzendingen.siteRepo, siteRepo))
    .orderBy(desc(formulierInzendingen.id));
  const inzendingen = alle.filter((i) => !i.gearchiveerd).slice(0, 30);
  const gearchiveerd = alle.filter((i) => i.gearchiveerd).slice(0, 50);
  const documenten = await db
    .select()
    .from(kennisDocumenten)
    .where(eq(kennisDocumenten.siteId, siteId))
    .orderBy(desc(kennisDocumenten.id));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {/* Formulier-inzendingen */}
      <div className="min-w-0 rounded-3xl border border-stone-200 bg-white p-4 sm:p-6">
        <h3 className="font-display text-lg font-semibold">
          Berichten via je formulieren
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
                <p className="flex items-center justify-between gap-2 text-xs text-stone-400">
                  {inz.aangemaakt.toLocaleString("nl-NL")}
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-medium capitalize text-violet-700">
                    {inz.formulier}
                  </span>
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
                <div className="mt-2 flex gap-3">
                  <form action={inzendingVerwerken}>
                    <input type="hidden" name="id" value={inz.id} />
                    <input type="hidden" name="siteId" value={siteId} />
                    <input type="hidden" name="actie" value="archiveer" />
                    <button type="submit" className="text-xs font-medium text-stone-500 hover:text-violet-700 cursor-pointer">
                      ✓ Afgehandeld
                    </button>
                  </form>
                  <form action={inzendingVerwerken}>
                    <input type="hidden" name="id" value={inz.id} />
                    <input type="hidden" name="siteId" value={siteId} />
                    <input type="hidden" name="actie" value="verwijder" />
                    <button type="submit" className="text-xs text-stone-400 hover:text-red-600 cursor-pointer">
                      Verwijderen
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        {gearchiveerd.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
              Afgehandeld ({gearchiveerd.length})
            </summary>
            <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
              {gearchiveerd.map((inz) => (
                <div key={inz.id} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
                  <p className="flex flex-wrap items-center gap-2">
                    <span>{inz.aangemaakt.toLocaleDateString("nl-NL")}</span>
                    <span className="font-medium capitalize text-stone-600">{inz.formulier}</span>
                    <span className="truncate">
                      {Object.entries(inz.velden as Record<string, string>)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </span>
                  </p>
                  <div className="mt-1 flex gap-3">
                    <form action={inzendingVerwerken}>
                      <input type="hidden" name="id" value={inz.id} />
                      <input type="hidden" name="siteId" value={siteId} />
                      <input type="hidden" name="actie" value="terug" />
                      <button type="submit" className="hover:text-violet-700 cursor-pointer">↩ Terugzetten</button>
                    </form>
                    <form action={inzendingVerwerken}>
                      <input type="hidden" name="id" value={inz.id} />
                      <input type="hidden" name="siteId" value={siteId} />
                      <input type="hidden" name="actie" value="verwijder" />
                      <button type="submit" className="hover:text-red-600 cursor-pointer">Verwijderen</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
        <form action={bewaarNotificatieEmail} className="mt-5 border-t border-stone-100 pt-4">
          <input type="hidden" name="siteId" value={siteId} />
          <p className="mb-3 break-words rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-700">
            {notificatieEmail ? (
              <>
                📬 Inzendingen van <strong>alle formulieren</strong> op je site
                worden gemaild naar <strong className="break-all">{notificatieEmail}</strong> — en de
                invuller krijgt automatisch een nette bevestiging.
              </>
            ) : (
              <>
                ⚠️ Er is nog <strong>geen e-mailadres</strong> ingesteld:
                inzendingen zie je dan alleen hier in het overzicht. Vul
                hieronder je adres in om ze ook per mail te ontvangen.
              </>
            )}
          </p>
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
      <div className="min-w-0 rounded-3xl border border-stone-200 bg-white p-4 sm:p-6">
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
