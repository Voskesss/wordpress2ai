/**
 * Knop met een uitleg die meteen verschijnt zodra je erover gaat.
 *
 * Waarom niet gewoon `title`: de browser wacht daar ongeveer anderhalve
 * seconde mee en toont hem klein en grijs. In de praktijk zie je hem nooit.
 * Dit is pure CSS (geen JavaScript), dus het werkt ook in een servercomponent.
 *
 * De uitleg staat bóven de knop, links uitgelijnd, zodat hij bij een rij
 * knoppen nooit buiten de kaart valt.
 */
export default function MetUitleg({
  tekst,
  children,
}: {
  tekst: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-80 max-w-[calc(100vw-3rem)] rounded-xl bg-stone-800 px-3 py-2 text-left text-xs leading-relaxed font-normal text-stone-50 opacity-0 shadow-lg transition-opacity duration-75 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {tekst}
      </span>
    </span>
  );
}
