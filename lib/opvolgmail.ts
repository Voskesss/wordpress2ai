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
  naam?: string
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
    ? `Mocht je daarna willen overstappen: voor een site van jouw omvang is dat eenmalig ${prijs}, daarna €5 tot €20 per maand alles inbegrepen.`
    : `Mocht je daarna willen overstappen: dat is eenmalig vanaf €150, daarna €5 tot €20 per maand alles inbegrepen.`;

  return {
    onderwerp: `Je websitecheck van ${r.domein}`,
    tekst: `${aanhef}

Bedankt voor je aanvraag — ik heb naar ${r.domein} gekeken.

${bevindingenBlok}

Zal ik als proef alvast je homepage overzetten? Dan zie je op een echte link hoe jouw site er zonder WordPress uitziet — sneller, zonder updates, en aan te passen door te typen. Kost je niets en je zit nergens aan vast.

${prijsRegel}

Eén reply met "laat maar zien" is genoeg.`,
  };
}
