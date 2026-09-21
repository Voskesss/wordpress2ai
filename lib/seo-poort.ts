/**
 * De SEO-regels van de opleveringspoort die over de héle site gaan, niet over
 * één pagina. Zelfde opzet als lib/verlies.ts: pure functies, geen I/O. De
 * poort verzamelt per pagina wat hij toch al leest en geeft het hier door.
 *
 * Waarom dit bestaat: de poort bewaakte wel of elke pagina een titel en een
 * omschrijving heeft, maar niet of die titels van elkaar verschillen, of er
 * één hoofdkop is, of een pagina überhaupt ergens vandaan bereikbaar is, en
 * of een bedrijf zich als bedrijf voorstelt aan Google.
 */

export type PaginaGegevens = {
  /** Pad zoals de bezoeker het ziet, bv. "/over-ons/". */
  pad: string;
  /** Bestandspad binnen de site, voor in de melding. */
  rel: string;
  titel?: string;
  omschrijving?: string;
  /** De tekst die WhatsApp en LinkedIn onder het deelplaatje tonen. Staat vaak
   * gelijk aan de omschrijving, maar raakt er los van zodra iemand er één
   * bijwerkt en de ander vergeet. */
  ogOmschrijving?: string;
  /** Aantal <h1> op de pagina. */
  koppen: number;
  /** Interne paden waar deze pagina naartoe linkt. */
  linktNaar: string[];
  noindex: boolean;
};

export type SeoBevinding = { regel: string; waar: string; detail: string; hard: boolean };

/**
 * Hoeveel tekens Google er ongeveer van laat zien. Wat daarna komt telt niet
 * mee voor iemand die de zoekresultaten bekijkt: twee pagina's die pas bij
 * teken 200 uiteenlopen, zien er in Google identiek uit.
 */
const ZICHTBAAR = { titel: 60, omschrijving: 155, ogOmschrijving: 155 } as const;

/** Waar beginnen twee teksten van elkaar te verschillen? */
function eersteVerschil(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

/** Dezelfde titel of omschrijving op meerdere pagina's: Google kiest er dan
 * zelf één en negeert de rest. Klassieke WordPress-erfenis.
 *
 * In twee stappen, want er zijn twee verschillende problemen. Letterlijk
 * gelijk is er één. Maar ook teksten die alleen ná het zichtbare deel
 * verschillen tellen, want in de zoekresultaten ziet niemand dat verschil.
 * Dat tweede is een mildere melding: technisch zijn het andere teksten. */
export function dubbeleTeksten(paginas: PaginaGegevens[]): SeoBevinding[] {
  const uit: SeoBevinding[] = [];
  for (const [veld, naam] of [
    ["titel", "titel"],
    ["omschrijving", "meta description"],
    ["ogOmschrijving", "deeltekst voor WhatsApp en LinkedIn"],
  ] as const) {
    const zichtbaar = ZICHTBAAR[veld];
    const perWaarde = new Map<string, string[]>();
    for (const p of paginas) {
      if (p.noindex) continue;
      const waarde = p[veld]?.trim();
      if (!waarde) continue;
      perWaarde.set(waarde, [...(perWaarde.get(waarde) ?? []), p.rel]);
    }

    // 1. Letterlijk dezelfde tekst
    for (const [waarde, waar] of perWaarde) {
      if (waar.length < 2) continue;
      uit.push({
        regel: "dubbele-teksten",
        waar: waar.join(", "),
        detail: `${waar.length} pagina's delen dezelfde ${naam} ("${kort(waarde)}"). Google kiest er dan zelf één en negeert de rest.`,
        hard: false,
      });
    }

    // 2. Verschillend, maar niet in het stuk dat Google laat zien
    const perBegin = new Map<string, { waarde: string; waar: string[] }[]>();
    for (const [waarde, waar] of perWaarde) {
      if (waar.length > 1) continue; // die zitten al in stap 1
      const begin = waarde.slice(0, zichtbaar);
      if (waarde.length <= zichtbaar) continue; // niets verborgen, dus echt anders
      perBegin.set(begin, [...(perBegin.get(begin) ?? []), { waarde, waar }]);
    }
    for (const [, groep] of perBegin) {
      if (groep.length < 2) continue;
      const positie = eersteVerschil(groep[0].waarde, groep[1].waarde);
      uit.push({
        regel: "dubbele-teksten",
        waar: groep.flatMap((g) => g.waar).join(", "),
        detail: `${groep.length} pagina's hebben een ${naam} die pas vanaf teken ${positie} verschilt, en Google toont er ongeveer ${zichtbaar}. In de zoekresultaten lijken ze dus hetzelfde. Zet het onderscheidende deel vooraan.`,
        hard: false,
      });
    }
  }
  return uit;
}

/** Precies één hoofdkop per pagina: zonder H1 weet Google niet waar de pagina
 * over gaat, met meerdere weet hij het ook niet. */
export function koppenControle(paginas: PaginaGegevens[]): SeoBevinding[] {
  const uit: SeoBevinding[] = [];
  for (const p of paginas) {
    if (p.noindex) continue;
    if (p.koppen === 0)
      uit.push({ regel: "koppen", waar: p.rel, detail: "Geen <h1>: Google weet niet waar deze pagina over gaat.", hard: false });
    else if (p.koppen > 1)
      uit.push({ regel: "koppen", waar: p.rel, detail: `${p.koppen} keer <h1>. Er hoort er precies één te zijn; de rest wordt <h2>.`, hard: false });
  }
  return uit;
}

/** Een pagina die bestaat maar waar vanaf geen enkele andere pagina naartoe
 * linkt. Google vindt hem via de sitemap, maar hij telt nauwelijks mee. */
export function verweesdePaginas(paginas: PaginaGegevens[]): SeoBevinding[] {
  const bereikt = new Set<string>();
  for (const p of paginas)
    for (const doel of p.linktNaar) {
      // Een link kan absoluut zijn (/over-ons/) of relatief (over-ons.html).
      // Relatief hoort er óók bij: zonder dat lijkt op een site met relatieve
      // links élke pagina verweesd. Gevonden op de demo-bakkerij.
      bereikt.add(normaliseer(doel));
      if (!doel.startsWith("/")) bereikt.add(normaliseer(samen(p.pad, doel)));
    }
  const uit: SeoBevinding[] = [];
  for (const p of paginas) {
    const pad = normaliseer(p.pad);
    if (p.noindex || pad === "/" || bereikt.has(pad)) continue;
    uit.push({
      regel: "verweesd",
      waar: p.rel,
      detail: "Geen enkele pagina linkt hiernaartoe. Zet hem in het menu of link ernaar vanaf een verwante pagina.",
      hard: false,
    });
  }
  return uit;
}

/**
 * Soorten waarmee je je als bedrijf voorstelt aan Google.
 *
 * Deze lijst is per definitie onvolledig: schema.org heeft tientallen soorten
 * bedrijven (Bakery, Florist, Plumber...) en die ga je nooit allemaal opsommen.
 * Gevonden toen de demo-bakkerij een keurig Bakery-blok had en de poort alsnog
 * klaagde. Daarom telt hieronder óók een blok dat gewoon een adres of
 * telefoonnummer noemt: dát is het signaal dat het om een vindbare vestiging
 * gaat, ongeacht hoe de soort heet.
 */
const BEDRIJFSSOORTEN =
  /"@type"\s*:\s*"(LocalBusiness|Organization|ProfessionalService|Store|Restaurant|MedicalBusiness|HealthAndBeautyBusiness|HomeAndConstructionBusiness|AutomotiveBusiness|LegalService|FinancialService|AccountingService|Dentist|Physician|VisualArtsStore|Person)"/i;

/**
 * Staat er een telefoonnummer of adres op de site, dan is het een bedrijf met
 * een vindbare vestiging, en dan hoort er een bedrijfsblok in de code te staan
 * met dezelfde gegevens. Dat is wat Google gebruikt voor lokale resultaten.
 */
export function bedrijfsgegevens(opties: {
  heeftTelefoon: boolean;
  heeftAdres: boolean;
  jsonLd: string[];
  telefoonnummers: string[];
}): SeoBevinding[] {
  if (!opties.heeftTelefoon && !opties.heeftAdres) return [];
  const alleJson = opties.jsonLd.join("\n");
  const steltZichVoor =
    BEDRIJFSSOORTEN.test(alleJson) ||
    (/"@type"/.test(alleJson) && /"address"|"telephone"|PostalAddress/i.test(alleJson));
  if (!steltZichVoor) {
    return [
      {
        regel: "bedrijfsgegevens",
        waar: "hele site",
        detail:
          "De site noemt een telefoonnummer of adres, maar stelt zich nergens als bedrijf voor in de code (JSON-LD met LocalBusiness of Organization). Dat is wat Google gebruikt voor lokale resultaten.",
        hard: false,
      },
    ];
  }
  // Wél een blok, maar zonder contactgegevens erin: dan mist juist het nuttige deel.
  const uit: SeoBevinding[] = [];
  if (opties.heeftTelefoon && !/"telephone"/i.test(alleJson))
    uit.push({
      regel: "bedrijfsgegevens",
      waar: "hele site",
      detail: "Het bedrijfsblok noemt geen telephone, terwijl het nummer wel op de site staat.",
      hard: false,
    });
  if (opties.heeftAdres && !/"address"|PostalAddress/i.test(alleJson))
    uit.push({
      regel: "bedrijfsgegevens",
      waar: "hele site",
      detail: "Het bedrijfsblok noemt geen address, terwijl het adres wel op de site staat.",
      hard: false,
    });
  for (const nummer of opties.telefoonnummers) {
    const cijfers = nummer.replace(/\D/g, "").slice(-9);
    if (cijfers.length === 9 && !alleJson.replace(/\D/g, "").includes(cijfers))
      uit.push({
        regel: "bedrijfsgegevens",
        waar: "hele site",
        detail: `Telefoonnummer ${nummer} staat op de site maar niet in het bedrijfsblok. Google vergelijkt die met het Google-bedrijfsprofiel.`,
        hard: false,
      });
  }
  return uit;
}

function kort(s: string): string {
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

/** Relatieve link oplossen vanaf de pagina waar hij op staat. */
function samen(vanaf: string, doel: string): string {
  const basis = vanaf.endsWith("/") ? vanaf : vanaf.replace(/[^/]*$/, "");
  const delen = (basis + doel).split("/");
  const uit: string[] = [];
  for (const d of delen) {
    if (d === "." || d === "") continue;
    if (d === "..") uit.pop();
    else uit.push(d);
  }
  return "/" + uit.join("/");
}

function normaliseer(pad: string): string {
  const zonderVraag = pad.split(/[?#]/)[0];
  const schoon = zonderVraag.replace(/index\.html?$/i, "");
  if (!schoon.startsWith("/")) return `/${schoon}`;
  return schoon.endsWith("/") || schoon === "/" ? schoon : `${schoon}/`;
}
