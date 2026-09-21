/**
 * Hoeveel bewaren wij van een bericht dat via een formulier binnenkomt?
 *
 * Praktijken met gegevens van hun eigen klanten (een fysiopraktijk, een
 * advocatenkantoor, een boekhouder) krijgen altijd dezelfde vraag: waar staan
 * die gegevens en wie kan erbij. Zolang het antwoord "in onze database, en
 * WordSwap kan meelezen" is, houdt dat gesprek op. Met deze standen is er een
 * antwoord dat klopt.
 *
 * Het staat voor elke klant open, niet alleen voor die beroepen.
 */

export const STANDEN = ["normaal", "geen-meelezen", "niet-bewaren"] as const;
export type Stand = (typeof STANDEN)[number];

export const UITLEG: Record<Stand, { label: string; kort: string; gevolg: string }> = {
  normaal: {
    label: "Normaal",
    kort: "Berichten worden bewaard. De klant ziet ze in zijn portaal, WordSwap kan meekijken bij problemen.",
    gevolg: "Geen beperkingen.",
  },
  "geen-meelezen": {
    label: "WordSwap kan niet meelezen",
    kort: "Berichten worden bewaard en de klant ziet ze gewoon, maar WordSwap ziet de inhoud niet.",
    gevolg:
      "Het vangnet blijft: raakt een mail kwijt, dan staat het bericht er nog. Bij een probleem met een formulier kunnen wij niet in de berichten kijken om het te vinden.",
  },
  "niet-bewaren": {
    label: "Niets bewaren, alleen doorsturen",
    kort: "Het bericht gaat per mail naar de klant en wordt nergens opgeslagen. Ook bijlagen niet.",
    gevolg:
      "Geen overzicht in het portaal, geen export, en geen vangnet: komt de mail niet aan, dan is het bericht weg. De bezoeker krijgt dat dan wel te zien, zodat hij kan bellen.",
  },
};

export function stand(waarde: string | null | undefined): Stand {
  return (STANDEN as readonly string[]).includes(waarde ?? "") ? (waarde as Stand) : "normaal";
}

/** Mag de inhoud van het bericht in onze database komen? */
export function magBewaren(waarde: string | null | undefined): boolean {
  return stand(waarde) !== "niet-bewaren";
}

/** Mag WordSwap (admin) de inhoud van deze berichten zien? */
export function magMeelezen(waarde: string | null | undefined): boolean {
  return stand(waarde) === "normaal";
}

/** Ziet de klant zelf zijn berichten nog in het portaal? */
export function klantZietBerichten(waarde: string | null | undefined): boolean {
  return stand(waarde) !== "niet-bewaren";
}
