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

function aanhef(naam?: string | null): string {
  const voornaam = naam?.trim().split(/\s+/)[0];
  return voornaam ? `Hallo ${voornaam},` : "Hallo,";
}

/** Eerste mail (terugvaltekst als de AI niet beschikbaar is): bedanken, aanbod, voorproefje. */
export function maakEerste(naam?: string | null, website?: string | null): { onderwerp: string; tekst: string } {
  const site = website?.trim();
  return {
    onderwerp: site ? `Je aanvraag over ${site}` : "Je websitecheck-aanvraag",
    tekst: `${aanhef(naam)}

Bedankt voor je aanvraag via onze advertentie${site ? ` — ik heb naar ${site} gekeken` : ""}.

Kort wat wij doen: we zetten je site over naar ons platform. Hij wordt sneller en veiliger, je vindbaarheid blijft behouden, en er is daarna niets meer te onderhouden — geen updates, geen plugins. Iets aanpassen doe je door in een chat te typen wat er anders moet.

Vanaf €19 per maand, alles inbegrepen. Zal ik als proef alvast je homepage overzetten? Dan zie je op een echte link hoe jouw site er bij ons uitziet — kost je niets en je zit nergens aan vast.

Eén reply met "laat maar zien" is genoeg. Liever even bellen? Laat weten wat een goed moment is.`,
  };
}

/** Stap 2: korte opvolger, verwijst naar de eerste mail en herhaalt het voorproefje-aanbod. */
export function maakOpvolger(naam?: string | null, website?: string | null): { onderwerp: string; tekst: string } {
  const site = website?.trim();
  return {
    onderwerp: site ? `Nog even over ${site}` : "Nog even over je website",
    tekst: `${aanhef(naam)}

Ik mailde je vorige week over je website — misschien is het bericht ondergesneeuwd, dat snap ik.

Daarom nog één keer kort: ik zet als proef gratis je homepage over, zodat je op een echte link ziet hoe jouw site er zonder WordPress uitziet. Sneller, geen updates meer, en aanpassen door gewoon te typen wat er anders moet.

Eén reply met "laat maar zien" is genoeg. En is het niets voor je, ook prima — dan hoor ik het graag, dan houd ik erover op.`,
  };
}

/** Stap 3: laatste mail — netjes afronden zonder te duwen. */
export function maakLaatste(naam?: string | null): { onderwerp: string; tekst: string } {
  return {
    onderwerp: "Laatste berichtje van mij",
    tekst: `${aanhef(naam)}

Ik heb je een paar keer gemaild over je website en wil je niet blijven storen — dit is mijn laatste berichtje.

Mocht het later alsnog spelen (site traag, updates die blijven zeuren, of gewoon geen zin meer in het onderhoud): op wordswap.nl staat een demo waarin je ziet hoe het bij ons werkt. Je bent altijd welkom.

Veel succes met je site!`,
  };
}

/**
 * Stap 4: bericht voor het contactformulier op hún eigen website — voor als
 * mails mogelijk in de spam belanden. Plakken en versturen doet Jos zelf.
 */
export function maakFormulierBericht(naam?: string | null): { onderwerp: string; tekst: string } {
  return {
    onderwerp: "Via je contactformulier (mail komt mogelijk niet aan)",
    tekst: `${aanhef(naam)}

Je vroeg via onze advertentie een websitecheck aan, en ik heb je daarover een paar keer gemaild — maar ik ben bang dat mijn mails in je spamfolder belanden. Vandaar even via je eigen contactformulier.

Kijk anders even in je spam naar mail van jos@wordswap.nl, of stuur me een berichtje — dan weet ik dat het aankomt. Geen interesse meer? Ook goed, dan laat ik je verder met rust.

Groet, Jos Klijnhout — WordSwap (wordswap.nl)`,
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
