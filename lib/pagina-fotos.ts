import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Herofoto's per landingspagina (wens Jos 14-10-2026: "een herofoto
 * bovenaan"; rechts stond op 25 pagina's hetzelfde plaatje). Een foto staat
 * in public/images/paginas/<slug>.webp, 1536x1024. Bestaat het bestand niet,
 * dan valt de pagina terug op de bekende overstap-illustratie, dus een
 * ontbrekende foto maakt niets stuk.
 *
 * Alleen op de server gebruiken (node:fs); zie lib/contactgegevens.ts voor
 * waarom dat ertoe doet.
 */
export const FOTO_ALT: Record<string, string> = {
  "website-laten-onderhouden": "Ondernemer klapt aan het eind van de dag ontspannen zijn laptop dicht",
  "wordpress-overzetten": "Winkeleigenaar aan de keukentafel met haar laptop en een kop koffie, opgelucht",
  "nieuwe-website": "Twee mensen bekijken samen een websiteontwerp op een laptop aan een werktafel",
  "website-koppelen-aan-ai": "Bloemist typt een wijziging op haar telefoon terwijl ze een boeket vasthoudt",
  "website-abonnement": "Ondernemer aan de keukentafel met haar laptop en een kop koffie",
  "wordpress-website-traag": "Man wacht met zijn kin op zijn hand op een laptop die niet opschiet",
  "website-kapsalon": "Kapper knipt een klant met baard in een salon met houten interieur",
  "website-schildersbedrijf": "Schilder fotografeert de net geschilderde kozijnen van een Nederlands huis",
  "website-hoveniersbedrijf": "Hovenier fotografeert een net aangelegde tuin met zijn telefoon",
  "website-installatiebedrijf": "Installateur bij een nieuwe warmtepomp kijkt op zijn telefoon",
  "website-bouwbedrijf": "Aannemer op een kleine bouwplaats met een tablet in zijn hand",
  "website-coach": "Coach schrijft in een notitieboek in een rustige praktijkruimte",
  "website-mediator": "Ronde tafel met water en glazen in een rustige mediationruimte",
  "website-kunstenaar": "Schilder fotografeert een afgerond doek in haar atelier",
  "website-stichting": "Vrijwilligers zetten stoelen klaar in een buurthuis, een van hen maakt een foto",
};

export type PaginaFoto = { src: string; alt: string };

/** De herofoto van deze pagina, of null als het bestand er (nog) niet is. */
export function fotoVoor(slug: string): PaginaFoto | null {
  const alt = FOTO_ALT[slug];
  if (!alt) return null;
  const pad = join(process.cwd(), "public", "images", "paginas", `${slug}.webp`);
  return existsSync(pad) ? { src: `/images/paginas/${slug}.webp`, alt } : null;
}
