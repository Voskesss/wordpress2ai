import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Herofoto's per landingspagina (wens Jos 14-10-2026: "een herofoto
 * bovenaan"; rechts stond op 25 pagina's hetzelfde plaatje). Een foto staat
 * in public/images/paginas/<slug>.webp, breed formaat (1600x900); de hero snijdt zelf bij. Bestaat het bestand niet,
 * dan valt de pagina terug op de bekende overstap-illustratie, dus een
 * ontbrekende foto maakt niets stuk.
 *
 * Alleen op de server gebruiken (node:fs); zie lib/contactgegevens.ts voor
 * waarom dat ertoe doet.
 */
export const FOTO_ALT: Record<string, string> = {
  "website-laten-onderhouden": "Ondernemer in een groene trui werkt rustig op zijn laptop aan een eiken bureau met planten",
  "wordpress-overzetten": "Winkeleigenaar zit ontspannen met een kop koffie aan de keukentafel naast haar laptop",
  "nieuwe-website": "Twee ondernemers bekijken samen een websiteontwerp op een laptop, met schetsen en kleurstalen op tafel",
  "website-koppelen-aan-ai": "Bloemist met een boeket in haar hand stuurt een bericht vanaf haar telefoon in haar winkel",
  "website-abonnement": "Meubelmaker kijkt in zijn werkplaats op een tablet naast zijn werkbank",
  "wordpress-website-traag": "Man wacht met zijn kin op zijn hand op een laptop die niet opschiet",
  "website-kapsalon": "Kapper knipt een klant met baard in een salon met houten interieur",
  "website-schildersbedrijf": "Schilder fotografeert de net geschilderde groene kozijnen van een bakstenen huis",
  "website-hoveniersbedrijf": "Hovenier fotografeert een net aangelegde tuin met grindpad",
  "website-installatiebedrijf": "Installateur met gereedschapskist geeft een bewoner een hand bij de voordeur",
  "website-bouwbedrijf": "Aannemer met een tablet op een renovatieproject met steigers en nieuw metselwerk",
  "wordpress-gehackt": "Ondernemer belt om hulp terwijl ze bezorgd naar haar laptop kijkt",
  "wordpress-kritieke-fout": "Bakker kijkt 's ochtends fronsend naar zijn laptop achter in zijn winkel",
  "webbouwer-onbereikbaar": "Ondernemer wacht met zijn telefoon in de hand bij het raam op antwoord",
  "wat-kost-een-website-per-maand": "Zelfstandige zet aan de keukentafel kosten op een rij met rekenmachine en notitieboek",
  "wordpress-alternatief": "Eigenaar van een fietsenwinkel vergelijkt op een tablet de mogelijkheden aan haar toonbank",
  "website-coach": "Coach schrijft in een notitieboek in een rustige praktijkruimte met groene fauteuils",
  "website-mediator": "Ronde eiken tafel met een karaf water en glazen in een rustige mediationruimte",
  "website-kunstenaar": "Schilder fotografeert een groot afgerond doek in haar atelier",
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
