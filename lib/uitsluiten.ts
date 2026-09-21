/**
 * Beroepsgroepen die niet in de koude bulk horen.
 *
 * Niet omdat het niet mag: het spamverbod maakt geen onderscheid tussen een
 * hovenier en een advocaat, en de grond is dezelfde (een door het bedrijf zelf
 * gepubliceerd zakelijk adres, met een werkende afmeldknop).
 *
 * Wel omdat het gesprek anders loopt. Bij een advocaat of notaris is reageren
 * gratis: waar een hovenier op de afmeldknop klikt, schrijft hij een brief.
 * En zwaarder: deze kantoren hebben geheimhoudingsplicht en moeten kunnen
 * uitleggen waar cliëntgegevens staan. Dat gesprek kun je winnen, maar niet
 * vanuit een koude mail; komt die vraag ná je mail, dan sta je achter.
 *
 * Uitgesloten betekent dus niet weggegooid. Ze blijven op het scherm staan,
 * met de reden erbij, buiten de bulk. Wil Jos er één bellen of met de hand
 * schrijven, dan zet hij de status zelf terug op "nieuw". Dat is bewust een
 * handeling en geen knop die per ongeluk meegaat.
 */

export type Groep = {
  sleutel: string;
  label: string;
  reden: string;
  /** Losse woorden; een treffer in de bedrijfsnaam of het domein is genoeg. */
  woorden: string[];
};

export const GROEPEN: Groep[] = [
  {
    sleutel: "juridisch",
    label: "Juridisch",
    reden:
      "Geheimhoudingsplicht: dit kantoor moet kunnen uitleggen waar cliëntgegevens staan. Dat gesprek voer je niet per koude mail.",
    woorden: [
      "advocaat",
      "advocaten",
      "advocatuur",
      "advocatenkantoor",
      "advocatenpraktijk",
      "notaris",
      "notarissen",
      "notarieel",
      "deurwaarder",
      "gerechtsdeurwaarder",
      "juridisch",
      "juristen",
      "rechtsbijstand",
      "mediation",
      "mediator",
    ],
  },
  {
    sleutel: "financieel",
    label: "Financieel",
    reden:
      "Werkt met cijfers van klanten en zit onder toezicht. Zelfde verhaal als bij juridisch: eerst bellen, niet koud mailen.",
    woorden: ["accountant", "accountants", "accountancy", "registeraccountant", "belastingadviseur", "fiscalist"],
  },
  {
    sleutel: "zorg",
    label: "Zorg",
    reden:
      "Patiëntgegevens en medisch beroepsgeheim. Hosting en formulieren zijn hier een apart gesprek, geen koude mail.",
    woorden: [
      "huisarts",
      "huisartsen",
      "huisartsenpraktijk",
      "tandarts",
      "tandartsen",
      "tandartspraktijk",
      "psycholoog",
      "psychologen",
      "psychotherapie",
      "ggz",
      "apotheek",
      "verloskundige",
      "verloskundigen",
    ],
  },
];

/**
 * In een bedrijfsnaam op hele woorden zoeken, want daar staan spaties:
 * "Advocatenwijk Interieur" is een interieurzaak en geen advocatenkantoor.
 */
function bevatWoord(tekst: string, woord: string): boolean {
  return new RegExp(`(^|[^a-z])${woord}([^a-z]|$)`, "i").test(tekst);
}

/**
 * Hoort dit bedrijf in een groep die we niet koud mailen?
 * Geeft de groep terug, of null als er niets aan de hand is.
 */
export function uitgesloten(
  bedrijf: string | null | undefined,
  website?: string | null,
  branche?: string | null
): Groep | null {
  // In een domein staan geen spaties: "notariskatwijk.nl" en
  // "advocatenkantoorvanwessel.nl" plakken alles aan elkaar. Daar zoeken we
  // dus gewoon of het woord erin voorkomt, zonder woordgrens.
  const domein = (website ?? "").toLowerCase().replace(/[.\-_/]/g, "");
  const tekst = `${bedrijf ?? ""} ${branche ?? ""}`.toLowerCase();
  for (const groep of GROEPEN) {
    for (const woord of groep.woorden) {
      if (bevatWoord(tekst, woord) || domein.includes(woord)) return groep;
    }
  }
  return null;
}

/** De status die een uitgesloten prospect krijgt. */
export const UITGESLOTEN_STATUS = "uitgesloten";
