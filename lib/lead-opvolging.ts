/**
 * Opvolg-cadans voor leads: bepaalt op basis van de tijdlijn (uitgaande mails en
 * reacties) wat de volgende stap is, en levert de kant-en-klare teksten daarvoor.
 * Er wordt nooit automatisch verstuurd: de cron zet het concept klaar en Jos
 * verstuurt via de Mailer (of plakt de formuliertekst zelf).
 */

export const OPVOLGER_NA_DAGEN = 4; // na mail 1 zonder reactie
export const LAATSTE_NA_DAGEN = 7; // na de opvolger zonder reactie
export const FORMULIER_NA_DAGEN = 7; // na de laatste mail: via hun eigen contactformulier

export type OpvolgStap = "opvolger" | "laatste" | "formulier";
/** Alle mailstappen, inclusief de eerste mail die voor elke nieuwe lead wordt klaargezet. */
export type MailStap = "eerste" | OpvolgStap;

/**
 * Welke stap staat er nu klaar te zetten? null = niets doen.
 * aantalUit telt álle uitgaande mails (Mailer + eigen Soverin-mails).
 * De eerste mail maakt Jos altijd zelf; de cadans begint pas daarna.
 */
export function volgendeStap(o: {
  aantalUit: number;
  laatsteUit: Date | null;
  heeftReactie: boolean;
  nu: Date;
}): OpvolgStap | null {
  if (o.heeftReactie || o.aantalUit === 0 || !o.laatsteUit) return null;
  const dagen = Math.floor((o.nu.getTime() - o.laatsteUit.getTime()) / 86_400_000);
  if (o.aantalUit === 1 && dagen >= OPVOLGER_NA_DAGEN) return "opvolger";
  if (o.aantalUit === 2 && dagen >= LAATSTE_NA_DAGEN) return "laatste";
  if (o.aantalUit === 3 && dagen >= FORMULIER_NA_DAGEN) return "formulier";
  return null; // na de formulier-stap houdt de opvolging op
}

/**
 * Is een klaarstaande mail achterhaald? Dat is zo zodra er ná het klaarzetten
 * een mail naar deze lead is gegaan, ook een die Jos zelf vanuit zijn eigen
 * postvak stuurde. Anders blijft er een kaartje staan voor iets dat al weg is.
 */
export function conceptAchterhaald(conceptKlaarOp: Date | null, laatsteUit: Date | null): boolean {
  return Boolean(conceptKlaarOp && laatsteUit && laatsteUit.getTime() > conceptKlaarOp.getTime());
}

function aanhef(naam?: string | null): string {
  const voornaam = naam?.trim().split(/\s+/)[0];
  return voornaam ? `Hallo ${voornaam},` : "Hallo,";
}

/** Eerste mail (terugvaltekst als de AI niet beschikbaar is): servicegericht,
 * met direct een concreet voorstel. Geen demo, geen gratis voorproefje. */
export function maakEerste(naam?: string | null, website?: string | null): { onderwerp: string; tekst: string } {
  const site = website?.trim();
  return {
    onderwerp: site ? `Voorstel voor ${site}` : "Voorstel voor je website",
    tekst: `${aanhef(naam)}

Bedankt voor je aanvraag via onze advertentie${site ? `. Ik heb naar ${site} gekeken` : ""}.

Wat wij doen: wij zetten de hele site voor je over en jij hoeft niets te doen. Alles blijft precies zoals het is (tenzij je meteen een mooier ontwerp wilt), je vindbaarheid in Google blijft gelijk of wordt beter, en de site wordt sneller. Daarna is er niets meer te onderhouden: geen updates, geen plugins. Iets wijzigen? Je typt het gewoon in een chat en wij zorgen dat het goed komt.

Mijn voorstel: het overzetten kost eenmalig vanaf €150 (afhankelijk van de omvang van je site), daarna €19 per maand voor hosting, beheer en aanpassingen.

Vragen? Reply gerust, of laat weten wanneer ik je kan bellen.`,
  };
}

/** Stap 2: korte opvolger, verwijst naar het voorstel uit de eerste mail. */
export function maakOpvolger(naam?: string | null, website?: string | null): { onderwerp: string; tekst: string } {
  const site = website?.trim();
  return {
    onderwerp: site ? `Nog even over ${site}` : "Nog even over je website",
    tekst: `${aanhef(naam)}

Ik mailde je vorige week een voorstel voor je website. Misschien is het bericht ondergesneeuwd, dat snap ik.

Daarom nog één keer kort: wij zetten je hele site voor je over, alles blijft zoals het is, hij wordt sneller, en daarna heb je er geen onderhoud meer aan. Het voorstel uit mijn vorige mail staat gewoon nog.

Heb je vragen, reply gerust. Bellen kan ook. En is het niets voor je, ook prima: dan hoor ik het graag en houd ik erover op.`,
  };
}

/** Stap 3: laatste mail, netjes afronden zonder te duwen. */
export function maakLaatste(naam?: string | null): { onderwerp: string; tekst: string } {
  return {
    onderwerp: "Laatste berichtje van mij",
    tekst: `${aanhef(naam)}

Ik heb je een paar keer gemaild over je website en wil je niet blijven storen. Dit is mijn laatste berichtje.

Mocht het later alsnog spelen (site traag, updates die blijven zeuren, of gewoon geen zin meer in het onderhoud): je vindt ons op wordswap.nl. Je bent altijd welkom.

Veel succes met je site!`,
  };
}

/**
 * Stap 4: bericht voor het contactformulier op hún eigen website, voor als
 * mails mogelijk in de spam belanden. Plakken en versturen doet Jos zelf.
 */
export function maakFormulierBericht(naam?: string | null): { onderwerp: string; tekst: string } {
  return {
    onderwerp: "Via je contactformulier (mail komt mogelijk niet aan)",
    tekst: `${aanhef(naam)}

Je vroeg via onze advertentie een websitecheck aan, en ik heb je daarover een paar keer gemaild, maar ik ben bang dat mijn mails in je spamfolder belanden. Vandaar even via je eigen contactformulier.

Kijk anders even in je spam naar mail van jos@wordswap.nl, of stuur me een berichtje, dan weet ik dat het aankomt. Geen interesse meer? Ook goed, dan laat ik je verder met rust.

Groet, Jos van WordSwap (wordswap.nl)`,
  };
}

export function maakStap(
  stap: OpvolgStap,
  naam?: string | null,
  website?: string | null,
): { onderwerp: string; tekst: string } {
  if (stap === "opvolger") return maakOpvolger(naam, website);
  if (stap === "laatste") return maakLaatste(naam);
  return maakFormulierBericht(naam);
}

export const STAP_LABELS: Record<MailStap, string> = {
  eerste: "Eerste mail",
  opvolger: "Opvolgmail",
  laatste: "Laatste mail",
  formulier: "Bericht via hun contactformulier",
};
