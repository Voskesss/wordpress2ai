import { richtprijs, type ScanResultaat } from "./prospectscan-shared";

/** Browser-safe: bouwt uit een scanresultaat de opvolgmail voor een warme lead
 * (websitecheck aangevraagd via de advertentie). Bevindingen in gewone taal,
 * richtprijs, en als slot het voorproefje-aanbod — trede 1→2 van het trappetje.
 * De tekst komt als concept in de Mailer; Jos leest na en verstuurt zelf. */

function klantTaal(regel: string): string | null {
  const dode = regel.match(/dode links?[^(]*\(o\.a\. ([^)]+)\)|dode link[^(]*\(([^)]+) geeft/i);
  if (dode) {
    const pad = (dode[1] ?? dode[2] ?? "").trim();
    return `Er zitten links op je site die nergens meer heen gaan${pad ? ` (bijvoorbeeld ${pad})` : ""} — bezoekers die daarop klikken krijgen een foutmelding.`;
  }
  if (/kapotte afbeelding/i.test(regel))
    return "Een paar afbeeldingen laden niet meer — dat is vaak het eerste wat een bezoeker opvalt.";
  const sec = regel.match(/\((\d+[.,]\d)s laadtijd\)/)?.[1]?.replace(".", ",");
  if (sec)
    return `Je site deed er bij mij ${sec} seconden over om te laden — precies de tijd waarin een bezoeker beslist om weg te klikken.`;
  if (/stokoude|verouderde WordPress/i.test(regel))
    return "Je site draait op een WordPress-versie die al een tijd geen updates meer krijgt — daar komen op den duur veiligheidsproblemen van.";
  if (/viewport ontbreekt/i.test(regel))
    return "Op een telefoon toont je site de desktop-versie in het klein, terwijl meer dan de helft van je bezoekers juist op zijn telefoon kijkt.";
  const jaar = regel.match(/copyright[^,]*op (\d{4})/i)?.[1];
  if (jaar)
    return `Onderaan je site staat nog ${jaar} — klein detail, maar het wekt de indruk dat er niet meer naar de site wordt omgekeken.`;
  if (/mixed content/i.test(regel))
    return "Een deel van je site laadt nog onbeveiligd mee, waardoor browsers waarschuwingen kunnen tonen.";
  if (/geen https/i.test(regel))
    return "Je site heeft geen slotje (https) — browsers markeren hem als 'niet veilig'.";
  if (/oude jQuery|RevSlider|readme/i.test(regel))
    return "Er draait verouderde techniek mee die bekend staat om veiligheidslekken.";
  return null;
}

export function maakOpvolgmail(
  r: ScanResultaat,
  naam?: string,
  opties?: { gebeld?: boolean }
): { onderwerp: string; tekst: string } {
  const punten = [...new Set(
    [...(r.kapot ?? []), ...(r.bevindingen ?? [])]
      .map(klantTaal)
      .filter((x): x is string => Boolean(x))
  )].slice(0, 4);

  const prijs = richtprijs(r.paginas ?? 0);
  const aanhef = naam?.trim() ? `Hallo ${naam.trim()},` : "Hallo,";

  const bevindingenBlok = punten.length
    ? `Dit viel me op:\n\n${punten.map((p) => `- ${p}`).join("\n")}\n\nNiets dramatisch, maar wel dingen die je bezoekers merken.`
    : `Goed nieuws: technisch ziet je site er netjes uit — geen kapotte dingen gevonden en de snelheid is prima. De winst zit voor jou vooral in het gemak: geen updates, geen hosting-gedoe, en aanpassen door gewoon te typen wat er anders moet.`;

  const prijsRegel = prijs
    ? `Mijn voorstel: voor een site van jouw omvang kost het overzetten eenmalig ${prijs}, daarna €19 per maand — hosting, beheer en aanpassingen via de chat inbegrepen.`
    : `Mijn voorstel: het overzetten kost eenmalig vanaf €150 (afhankelijk van de omvang van je site), daarna €19 per maand — hosting, beheer en aanpassingen via de chat inbegrepen.`;

  return {
    onderwerp: `Voorstel voor ${r.domein}`,
    tekst: `${aanhef}

Bedankt voor je aanvraag — ik heb naar ${r.domein} gekeken.${
      opties?.gebeld
        ? " Ik probeerde je net al even te bellen, maar dat kwam vast niet gelegen — daarom de uitkomst op de mail."
        : ""
    }

${bevindingenBlok}

Wat wij doen: wij zetten de hele site voor je over — jij hoeft niets te doen. Alles blijft zoals het is (tenzij je meteen een mooier ontwerp wilt), je vindbaarheid in Google blijft gelijk of wordt beter, en de site wordt sneller. Daarna heb je er geen onderhoud meer aan; iets wijzigen typ je gewoon in een chat.

${prijsRegel}

Vragen? Reply gerust. Liever even bellen? Laat weten wat een goed moment is — dan bel ik je.`,
  };
}
