import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formulierBevestigingen, sites } from "@/db/schema";
import ActieKnop from "@/app/admin/klant/[id]/ActieKnop";
import BevestigKnop from "@/app/admin/klant/[id]/BevestigKnop";
import { metKlantOpmaak } from "@/lib/mail";
import { BRON_LABEL, bevestigingsHtml, type Bron } from "@/lib/formulier-bevestiging";
import {
  bewaarBevestiging,
  formulierenInlezen,
  nieuwBevestigingsVoorstel,
  testBevestiging,
  zetBevestigingAan,
} from "./acties-bevestigingen";

const BRON_KLEUR: Record<Bron, string> = {
  standaard: "border-stone-200 bg-stone-50 text-stone-600",
  site: "border-stone-200 bg-stone-50 text-stone-600",
  ai: "border-violet-200 bg-violet-50 text-violet-800",
  klant: "border-emerald-200 bg-emerald-50 text-emerald-800",
  wordswap: "border-sky-200 bg-sky-50 text-sky-800",
};

const leesbaar = (naam: string) => (naam.charAt(0).toUpperCase() + naam.slice(1)).replace(/-/g, " ");

/**
 * Per formulier de automatische bevestigingsmail aan de invuller: bekijken, aanpassen, een nieuw
 * AI-voorstel vragen, uitzetten en een test naar jezelf sturen. Staat in het portaal (klant) en
 * in de admin bij de klant (WordSwap); wie het laatst wijzigde is zichtbaar.
 */
export default async function BevestigingsMails({ siteId }: { siteId: number }) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return null;
  const rijen = await db
    .select()
    .from(formulierBevestigingen)
    .where(eq(formulierBevestigingen.siteId, siteId))
    .orderBy(asc(formulierBevestigingen.formulier))
    .catch(() => []);

  return (
    <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">✉️ Bevestigingsmails</h3>
        <form action={formulierenInlezen}>
          <input type="hidden" name="siteId" value={siteId} />
          <ActieKnop
            label="↻ Formulieren opnieuw inlezen"
            bezigLabel="Inlezen..."
            klaarLabel="✓ Ingelezen"
            className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-600 hover:border-emerald-600 hover:text-emerald-800 cursor-pointer"
          />
        </form>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">
        Wie een formulier op je website invult, krijgt automatisch een bevestiging. Per formulier bepaal je zelf wat
        daarin staat. <strong>{"{naam}"}</strong> wordt vervangen door de naam van de invuller; je handtekening en logo
        komen er vanzelf onder.
      </p>

      {rijen.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
          Nog geen formulieren gevonden. Klik op <em>Formulieren opnieuw inlezen</em>, of wacht tot er iemand een
          formulier invult: dan verschijnt het hier vanzelf, met een voorstel voor de tekst.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rijen.map((r) => {
            const bron = (r.bron in BRON_LABEL ? r.bron : "standaard") as Bron;
            const paginas = r.paginas as string[];
            const voorbeeld = metKlantOpmaak(
              site,
              bevestigingsHtml({ tekst: r.tekst ?? "", naam: "Sanne" }),
            );
            const velden = (formulier: string) => (
              <>
                <input type="hidden" name="siteId" value={siteId} />
                <input type="hidden" name="formulier" value={formulier} />
              </>
            );
            return (
              <details key={r.id} className="group rounded-2xl border border-stone-200 bg-white">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3">
                  <span className="font-semibold text-stone-900">{leesbaar(r.formulier)}</span>
                  <span className="text-xs text-stone-500">
                    {paginas.length ? paginas.join(", ") : "niet meer op de website gevonden"}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${BRON_KLEUR[bron]}`}>
                      {BRON_LABEL[bron]}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        r.aan ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-500"
                      }`}
                    >
                      {r.aan ? "aan" : "uit"}
                    </span>
                  </span>
                </summary>
                <div className="grid gap-4 border-t border-stone-100 px-4 py-4 lg:grid-cols-2">
                  <form action={bewaarBevestiging} className="space-y-3">
                    {velden(r.formulier)}
                    <label className="block text-xs font-semibold text-stone-600">
                      Onderwerp
                      <input
                        name="onderwerp"
                        defaultValue={r.onderwerp ?? ""}
                        required
                        maxLength={150}
                        className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal text-stone-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-stone-600">
                      Tekst
                      <textarea
                        name="tekst"
                        defaultValue={r.tekst ?? ""}
                        required
                        rows={7}
                        maxLength={2000}
                        className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal leading-relaxed text-stone-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </label>
                    <ActieKnop
                      label="Opslaan"
                      bezigLabel="Opslaan..."
                      className="rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                    />
                  </form>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-600">Zo ziet de invuller hem (voorbeeld met de naam Sanne)</p>
                    <div className="mt-1 max-h-80 overflow-auto rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <p className="mb-3 text-xs text-stone-500">
                        <strong>Van:</strong> {site.naam} · <strong>Onderwerp:</strong> {r.onderwerp}
                      </p>
                      <div className="text-sm" dangerouslySetInnerHTML={{ __html: voorbeeld }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={testBevestiging}>
                        {velden(r.formulier)}
                        <ActieKnop
                          label="Stuur test naar mij"
                          bezigLabel="Versturen..."
                          klaarLabel="✓ Verstuurd"
                          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-emerald-600 hover:text-emerald-800 cursor-pointer"
                        />
                      </form>
                      <form action={nieuwBevestigingsVoorstel}>
                        {velden(r.formulier)}
                        <BevestigKnop
                          label="✨ Nieuw voorstel"
                          bezigLabel="Schrijven..."
                          vraag="Een nieuw voorstel van de AI vervangt de huidige tekst. Doorgaan?"
                          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                        />
                      </form>
                      <form action={zetBevestigingAan}>
                        {velden(r.formulier)}
                        <input type="hidden" name="aan" value={r.aan ? "0" : "1"} />
                        <ActieKnop
                          label={r.aan ? "Zet uit" : "Zet aan"}
                          bezigLabel="..."
                          klaarLabel="✓"
                          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-red-300 hover:text-red-700 cursor-pointer"
                        />
                      </form>
                    </div>
                    {!r.aan && (
                      <p className="mt-2 text-xs text-stone-500">
                        Staat uit: invullers krijgen geen bevestiging. De melding aan jou komt gewoon door.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
