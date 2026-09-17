import { geefWebsiteAkkoord, meldWebsiteOpmerking, websiteAkkoordLater } from "./acties";
import { TELEFOON } from "@/lib/persoonlijk";

/** Eerste inlog op een site in opbouw: bekijken en akkoord geven op de oplevering,
 * of eerst uitproberen, of laten weten dat er iets niet klopt. */
export default function WebsiteAkkoord({
  siteId,
  siteNaam,
  bekijkUrl,
  voorbeeldSrc,
}: {
  siteId: number;
  siteNaam: string;
  bekijkUrl: string;
  /** Eigen voorbeeldweg (zelfde adres als het portaal): klantsites staan inlijsten
   * alleen toe vanaf wordswap.nl, dus rechtstreeks laden blijft op dev leeg. */
  voorbeeldSrc: string;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
      <p className="eyebrow">JE NIEUWE WEBSITE STAAT KLAAR</p>
      <h1 className="font-display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
        Is je website goed overgezet?
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-stone-600">
        Dit is de nieuwe website van <strong>{siteNaam}</strong>. Kijk rustig of alles klopt: je teksten, je foto&apos;s
        en je pagina&apos;s. Je huidige website blijft online tot we samen de overstap afronden.
      </p>

      {(
        <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2 text-sm">
            <span className="truncate text-stone-500">{(bekijkUrl || siteNaam).replace(/^https:\/\//, "")}</span>
            {bekijkUrl && (
              <a href={bekijkUrl} target="_blank" rel="noopener" className="shrink-0 font-semibold text-emerald-800 hover:underline">
                Open in nieuw tabblad ↗
              </a>
            )}
          </div>
          <iframe src={voorbeeldSrc} title={`Nieuwe website van ${siteNaam}`} className="h-[55vh] min-h-[22rem] w-full bg-white" />
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <form action={geefWebsiteAkkoord} className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <input type="hidden" name="siteId" value={siteId} />
          <p className="font-semibold text-stone-900">Ziet er goed uit</p>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-stone-600">
            Je geeft akkoord op je nieuwe website. Jos neemt daarna contact op voor de afronding.
          </p>
          <button type="submit" className="button-primary mt-4 cursor-pointer justify-center">
            ✓ Ik geef akkoord
          </button>
        </form>

        <form action={websiteAkkoordLater} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5">
          <input type="hidden" name="siteId" value={siteId} />
          <p className="font-semibold text-stone-900">Eerst even uitproberen</p>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-stone-600">
            Pas zelf iets aan via de chat en ervaar hoe makkelijk het gaat. Akkoord geven kan daarna altijd nog.
          </p>
          <button
            type="submit"
            className="mt-4 rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-800 hover:border-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            Naar mijn website →
          </button>
        </form>

        <details className="group rounded-2xl border border-stone-200 bg-white p-5">
          <summary className="cursor-pointer list-none">
            <p className="font-semibold text-stone-900">Er klopt iets niet</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Laat Jos weten wat er anders moet. <span className="font-semibold text-emerald-800 group-open:hidden">Schrijf het op →</span>
            </p>
          </summary>
          <form action={meldWebsiteOpmerking} className="mt-3">
            <input type="hidden" name="siteId" value={siteId} />
            <textarea
              name="tekst"
              required
              rows={4}
              placeholder="Bijvoorbeeld: op de pagina Contact staat nog ons oude telefoonnummer."
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              className="mt-2 rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-800 hover:border-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              Verstuur naar Jos
            </button>
          </form>
        </details>
      </div>
      <p className="mt-6 text-sm text-stone-500">
        Liever even bellen? {TELEFOON}. Of antwoord op de mail die je van Jos kreeg.
      </p>
    </div>
  );
}
