export default function ChatHulp() {
  return (
    <details className="mb-2 shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
      <summary className="cursor-pointer font-semibold">
        Hoe pas ik mijn website aan?
      </summary>
      <div className="mt-3 max-h-56 overflow-y-auto space-y-3 text-xs leading-relaxed">
        <ol className="list-decimal space-y-2 pl-4">
          <li>
            <strong>Vertel wat en waar.</strong> Bijvoorbeeld: “Zet op de
            contactpagina dat we zaterdag van 9 tot 16 uur open zijn.” Verstuur
            met de pijl.
          </li>
          <li>
            <strong>Bekijk je concept.</strong> Dat is een voorstel, nog niet
            zichtbaar voor bezoekers. Op je telefoon kies je “Bekijk concept”.
            Klopt het niet? Typ wat er anders moet.
          </li>
          <li>
            <strong>Zet het zelf live.</strong> Controleer tekst, foto’s en
            links. Klik daarna op “Publiceer” en wacht op de bevestiging.
          </li>
        </ol>
        <p>
          Een foto vervangen? Stuur je foto mee en noem de pagina en de plek.
          Met “Wijs aan” kun je het onderdeel ook aanklikken.
        </p>
        <p>
          “Concept weggooien” verwijdert je nog niet gepubliceerde wijzigingen.
          “Stap terug” draait alleen de laatste stap van het concept terug.
        </p>
        <a
          href="mailto:info@wordswap.nl"
          className="font-semibold text-violet-700 underline"
        >
          Kom je er niet uit? Mail Jos
        </a>
      </div>
    </details>
  );
}
