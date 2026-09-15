import { akkoordVerwerkersovereenkomst } from "./acties";
import { VERWERKERS_VERSIE } from "@/lib/verwerkersovereenkomst";

/** Eén keer tonen bij de eerste inlog van een klant met een eigen site:
 * pas na akkoord op de verwerkersovereenkomst gaat het portaal open. */
export default function VerwerkersAkkoord() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <p className="eyebrow">NOG ÉÉN AFSPRAAK</p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">Hoe wij met de gegevens van jouw bezoekers omgaan</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-stone-600">
        <p>
          Bezoekers van jouw website laten gegevens achter, bijvoorbeeld via je contactformulier.
          Volgens de privacywet (AVG) ben jij daarvoor verantwoordelijk en bewaren en versturen wij
          ze alleen in jouw opdracht. Die afspraken staan in de{" "}
          <a href="/verwerkersovereenkomst" target="_blank" className="font-semibold text-emerald-800 underline underline-offset-2">
            verwerkersovereenkomst
          </a>{" "}
          (versie {VERWERKERS_VERSIE}) — in gewone taal, twee minuten leeswerk.
        </p>
        <p>
          Kort samengevat: we gebruiken de gegevens van jouw bezoekers nooit voor onszelf, we
          beveiligen ze, we waarschuwen je direct bij een datalek, en zeg je op, dan krijg je alles
          mee en verwijderen wij de rest.
        </p>
      </div>
      <form action={akkoordVerwerkersovereenkomst} className="mt-8">
        <button type="submit" className="button-primary cursor-pointer">
          Ik ga akkoord → naar mijn website
        </button>
      </form>
      <p className="mt-3 text-xs text-stone-400">We leggen je account, de datum en de versie vast als bevestiging.</p>
    </div>
  );
}
