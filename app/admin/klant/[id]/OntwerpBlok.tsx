import {
  ontwerpBijwerken,
  ontwerpZichtbaarheid,
  ontwerpMaken,
  ontwerpPromoveren,
  ontwerpVerwijderen,
} from "@/app/admin/acties";
import { ontwerpStatus } from "@/lib/ontwerp";
import ActieKnop from "./ActieKnop";
import BevestigKnop from "./BevestigKnop";

const KNOP =
  "rounded-full px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-70";

/** Ontwerp-route: een nieuw ontwerp naast live en werkversie, met promotie
 * via het gewone concept/akkoord/publiceer-pad. */
export default async function OntwerpBlok({
  site,
  melding,
}: {
  site: { id: number; githubRepo: string; siteSlug: string | null; isDemo: boolean; ontwerpZichtbaar: boolean; ontwerpSlug: string | null };
  melding?: string;
}) {
  if (site.isDemo || !site.siteSlug) return null;
  let status: Awaited<ReturnType<typeof ontwerpStatus>> | null = null;
  try {
    status = await ontwerpStatus(site.githubRepo);
  } catch {
    /* GitHub even niet bereikbaar: blok toont dat hieronder */
  }
  const url = site.ontwerpSlug ? `https://${site.ontwerpSlug}.wordswap.workers.dev` : null;

  return (
    <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
      <h2 id="ontwerp" className="scroll-mt-24 font-display text-xl font-semibold">
        Ontwerpversie
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Een nieuw ontwerp voor de hele site, gebouwd naast de live versie en de
        werkversie. Alles mag anders, zolang het door de bouw-controle komt.
        Promotie zet het als gewoon concept op de werkversie: de klant geeft
        daar akkoord en publiceert zoals altijd.
      </p>
      {melding && (
        <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          {melding}
        </p>
      )}
      {!status && (
        <p className="mt-3 text-sm text-stone-500">
          Status kon niet worden opgehaald (GitHub onbereikbaar?). Herlaad de pagina.
        </p>
      )}
      {status && !status.bestaat && (
        <form action={ontwerpMaken} className="mt-4" title="Maakt de ontwerp-omgeving aan: een kopie van de live site op een eigen adres, met een banner erop en onvindbaar voor Google. Daarna kan er vrij aan gebouwd worden.">
          <input type="hidden" name="siteId" value={site.id} />
          <ActieKnop
            label="Ontwerpversie aanmaken"
            bezigLabel="Aanmaken..."
            className={`${KNOP} bg-violet-700 text-white hover:bg-violet-600`}
          />
        </form>
      )}
      {status?.bestaat && (
        <>
          <p className="mt-3 text-sm">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-violet-700 underline"
              >
                {url.replace("https://", "")}
              </a>
            ) : (
              <span className="text-stone-500">geen actief adres — Tonen of Opnieuw deployen maakt een nieuw, onraadbaar adres</span>
            )}{" "}
            <span className="text-stone-500">
              — {status.voor} wijziging(en) vóór op live
              {status.achter > 0 ? (
                <strong className="text-amber-700">
                  {" "}
                  en {status.achter} achter (eerst bijwerken vóór promotie)
                </strong>
              ) : (
                ", bij met live"
              )}
              .
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={ontwerpMaken} title="Zet de laatste stand van de ontwerp-versie opnieuw op het ontwerp-adres. Gebruik dit nadat er (bijvoorbeeld via Claude Code) aan het ontwerp is gebouwd en gepusht.">
              <input type="hidden" name="siteId" value={site.id} />
              <ActieKnop
                label="Opnieuw deployen"
                bezigLabel="Deployen... (nieuw adres kan ±1 min duren)"
                klaarLabel="✓ Gedeployed"
                className={`${KNOP} border border-stone-300 text-stone-700 hover:bg-stone-50`}
              />
            </form>
            <form action={ontwerpBijwerken} title="Haalt wijzigingen die de klant intussen op de live site deed (teksten, foto's) het ontwerp in, zodat die niet verloren gaan. Altijd eerst doen vóór 'Naar de werkversie'.">
              <input type="hidden" name="siteId" value={site.id} />
              <ActieKnop
                label="Bijwerken vanaf live"
                bezigLabel="Bijwerken..."
                klaarLabel="✓ Bijgewerkt"
                className={`${KNOP} border border-stone-300 text-stone-700 hover:bg-stone-50`}
              />
            </form>
            <form action={ontwerpPromoveren} title="Draait eerst de bouw-controle (formulieren, links, mobiel, SEO). Foutloos? Dan komt het ontwerp als gewoon concept op de werkversie: de klant bekijkt het in zijn portaal, geeft akkoord en publiceert zoals altijd. Bij fouten gebeurt er niets en zie je hier wat er mis is.">
              <input type="hidden" name="siteId" value={site.id} />
              <BevestigKnop
                label="Naar de werkversie"
                bezigLabel="Controleren en klaarzetten..."
                vraag="Bouw-controle draaien en het ontwerp als concept op de werkversie zetten? De klant ziet het daarna in zijn portaal."
                className={`${KNOP} bg-violet-700 text-white hover:bg-violet-600`}
              />
            </form>
            <form action={ontwerpVerwijderen} title="Ruimt de ontwerp-versie en het ontwerp-adres op. De live site en de werkversie blijven onaangeroerd; een al klaargezet concept blijft bestaan.">
              <input type="hidden" name="siteId" value={site.id} />
              <BevestigKnop
                label="Ontwerp verwijderen"
                bezigLabel="Opruimen..."
                vraag="Ontwerp-branch en -adres definitief opruimen? Een al klaargezet concept blijft bestaan."
                className={`${KNOP} border border-red-200 text-red-700 hover:bg-red-50`}
              />
            </form>
          </div>
          <form action={ontwerpZichtbaarheid} className="mt-4 flex items-center gap-3" title="Bepaalt of de klant het ontwerpvoorstel in zijn eigen portaal ziet, met een bekijk-knop. Standaard uit, zodat je rustig kunt bouwen. Verbergen haalt het adres direct weg, dus een eerder gedeelde link is meteen dood; opnieuw tonen maakt een vers adres (eerste keer kan ±1 min duren).">
            <input type="hidden" name="siteId" value={site.id} />
            <input type="hidden" name="aan" value={site.ontwerpZichtbaar ? "nee" : "ja"} />
            <ActieKnop
              label={site.ontwerpZichtbaar ? "Zichtbaar in klantportaal — verbergen (adres vervalt direct)" : "Nog verborgen voor de klant — tonen in portaal"}
              bezigLabel={site.ontwerpZichtbaar ? "Verbergen..." : "Adres maken en tonen... (±1 min)"}
              klaarLabel={site.ontwerpZichtbaar ? "✓ Verborgen — adres vervallen" : "✓ Zichtbaar voor de klant"}
              className={`${KNOP} ${site.ontwerpZichtbaar ? "bg-emerald-600 text-white hover:bg-emerald-500" : "border border-stone-300 text-stone-700 hover:bg-stone-50"}`}
            />
          </form>
          <p className="mt-3 text-xs text-stone-500">
            Bewerken kan ook lokaal (Claude Code): branch <code>ontwerp</code> in de
            klantrepo uitchecken, pushen, en <code>scripts/ontwerp.mts deploy {site.githubRepo}</code> draaien.
          </p>
        </>
      )}
    </div>
  );
}
