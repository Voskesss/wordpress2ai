/**
 * Foto-verwijzing vervangen in één paginabron, zo gericht mogelijk: de
 * eigenaar wees één foto aan, dus als dezelfde foto vaker op de pagina staat
 * proberen we alleen díé plek te raken. De aanwijs-tool stuurt de HTML van
 * het aangewezen element mee; daarmee herkennen we de juiste <img> aan zijn
 * alt-tekst. Zijn de plekken niet te onderscheiden (zelfde foto, zelfde
 * alt-tekst), dan vervangen we ze allemaal op de pagina — en meldt de route
 * dat eerlijk, zodat het nooit stilletjes gebeurt.
 */

const IMG_TAG = /<img\b[^>]*>/gi;

function altVan(tag: string): string | undefined {
  return tag.match(/\balt=["']([^"']*)["']/i)?.[1];
}

/** Kiest het bestand waarin de aangewezen foto vervangen moet worden.
 * Voorkeur: het paginabestand dat de eigenaar bekijkt. Maar staat de
 * aangewezen plek daar niet in (herkenbaar aan de alt-tekst), dan komt de
 * foto uit een gedeeld blok (delen/) — dan is DAT het doelbestand, en geldt
 * de afspraak: een gedeeld blok wijzigen = overal wijzigen. Geen eenduidige
 * keuze → undefined (de route valt dan terug op alle vindplaatsen). */
export function kiesDoelBron<T extends { pad: string; inhoud: string }>(
  bronnen: T[],
  oudPad: string,
  aangewezenPad: string | null,
  elementHtml?: string | null,
): T | undefined {
  const alt = elementHtml ? altVan(elementHtml) : undefined;
  const plekken = (b: T) =>
    [...b.inhoud.matchAll(IMG_TAG)].filter((m) => m[0].includes(oudPad));
  const heeftAlt = (b: T) =>
    alt !== undefined && plekken(b).some((m) => (altVan(m[0]) ?? "") === alt);
  const hier = aangewezenPad
    ? bronnen.find((b) => b.pad === aangewezenPad)
    : undefined;
  // De bekeken pagina zelf, tenzij de aangewezen plek daar aantoonbaar níét
  // in staat maar wél ergens anders (dan wees de eigenaar een gedeeld blok aan)
  if (hier && (alt === undefined || heeftAlt(hier) || !bronnen.some(heeftAlt)))
    return hier;
  const deel = bronnen.filter((b) => b.pad.startsWith("delen/") && heeftAlt(b));
  if (deel.length === 1) return deel[0];
  return hier;
}

export function vervangFotoInPagina(opties: {
  inhoud: string;
  oudPad: string;
  nieuwPad: string;
  /** HTML van het aangewezen element (uit de aanwijs-tool), als die er is */
  elementHtml?: string | null;
}): {
  inhoud: string;
  /** true = precies de aangewezen plek geraakt */
  gericht: boolean;
  /** aantal foto-plekken (img-tags) op deze pagina dat is vervangen */
  vervangen: number;
  /** aantal foto-plekken op deze pagina waar de oude foto nog staat */
  restant: number;
} {
  const { inhoud, oudPad, nieuwPad, elementHtml } = opties;
  const esc = oudPad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const verwijzing = new RegExp(`(/?)${esc}`, "g");
  const plekken = [...inhoud.matchAll(IMG_TAG)].filter((m) =>
    m[0].includes(oudPad),
  );

  const altGewenst = elementHtml ? altVan(elementHtml) : undefined;
  if (plekken.length > 1 && altGewenst !== undefined) {
    const passend = plekken.filter((m) => (altVan(m[0]) ?? "") === altGewenst);
    if (passend.length === 1) {
      const plek = passend[0];
      const nieuweTag = plek[0].replace(verwijzing, `$1${nieuwPad}`);
      const nieuweInhoud =
        inhoud.slice(0, plek.index) +
        nieuweTag +
        inhoud.slice(plek.index + plek[0].length);
      const restant = [...nieuweInhoud.matchAll(IMG_TAG)].filter((m) =>
        m[0].includes(oudPad),
      ).length;
      return { inhoud: nieuweInhoud, gericht: true, vervangen: 1, restant };
    }
  }

  verwijzing.lastIndex = 0;
  return {
    inhoud: inhoud.replace(verwijzing, `$1${nieuwPad}`),
    gericht: false,
    vervangen: plekken.length,
    restant: 0,
  };
}
