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
  home: "Eigenaar van een lunchroom typt een berichtje op haar telefoon achter de zonnige toonbank",
  "website-laten-onderhouden": "Zelfstandige met rood haar zit ontspannen aan een zonnige keukentafel met zijn laptop",
  "wordpress-overzetten": "Eigenaar van een cadeauwinkel werkt tevreden op haar laptop aan de toonbank",
  "nieuwe-website": "Twee ondernemers kiezen samen kleuren en schetsen voor hun nieuwe website",
  "website-koppelen-aan-ai": "Bloemist leest een bericht op haar telefoon tussen de tulpen en zonnebloemen",
  "website-abonnement": "Meubelmaker kijkt op een tablet in zijn lichte werkplaats",
  "wordpress-website-traag": "Vrouw wacht met haar kin op haar hand tot haar laptop klaar is met laden",
  "website-kapsalon": "Kapster knipt een klant met kort rood haar in een lichte salon",
  "website-schildersbedrijf": "Schilder verft een groen kozijn van een bakstenen huis op een zonnige dag",
  "website-hoveniersbedrijf": "Hovenier plant kleurige bloemen in een net aangelegde tuin",
  "website-installatiebedrijf": "Installateur loopt met zijn gereedschapskoffer naar de voordeur, zijn bus staat in de straat",
  "website-bouwbedrijf": "Aannemer met helm kijkt op een tablet op een zonnige bouwplaats",
  "wordpress-gehackt": "Ondernemer kijkt geschrokken naar haar laptop met haar telefoon in de hand",
  "wordpress-kritieke-fout": "Bakker kijkt 's ochtends bezorgd naar zijn laptop achter in zijn winkel",
  "webbouwer-onbereikbaar": "Ondernemer wacht bij het raam met zijn telefoon in de hand op antwoord",
  "wat-kost-een-website-per-maand": "Zelfstandige zet aan de keukentafel kosten op een rij met rekenmachine en notitieboek",
  "wordpress-alternatief": "Eigenaar van een fietsenwinkel vergelijkt op een tablet de mogelijkheden aan haar toonbank",
  "website-adviesbureau": "Team van een adviesbureau overlegt bij een glazen wand met memobriefjes",
  "website-detacheringsbureau": "Recruiter belt met een kandidaat en maakt aantekeningen aan haar bureau",
  "website-accountant": "Accountant leest een document aan zijn bureau in een licht kantoor",
  "website-financieel-adviseur": "Financieel adviseur bereidt aan een ronde tafel een klantgesprek voor",
  "website-coach": "Coach schrijft in een notitieboek in een lichte praktijkruimte",
  "website-mediator": "Zonnige mediationruimte met ronde tafel, water en gele tulpen",
  "website-kunstenaar": "Schilder fotografeert een kleurrijk doek in haar lichte atelier",
  "website-stichting": "Vrijwilligers zetten samen een buurtfeest op in een zonnige moestuin",
};

export type PaginaFoto = { src: string; alt: string };

/** De herofoto van deze pagina, of null als het bestand er (nog) niet is. */
export function fotoVoor(slug: string): PaginaFoto | null {
  const alt = FOTO_ALT[slug];
  if (!alt) return null;
  const pad = join(process.cwd(), "public", "images", "paginas", `${slug}.webp`);
  return existsSync(pad) ? { src: `/images/paginas/${slug}.webp`, alt } : null;
}
