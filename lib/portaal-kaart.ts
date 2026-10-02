/**
 * Wat de klant zelf in het portaal kan, en waar het staat: de kaart die de
 * klantchat meekrijgt om vragen als "waar zie ik mijn berichten?" of "hoe
 * upload ik een document?" goed te beantwoorden.
 *
 * Bewust KORT (tokens: hij gaat mee in elke chatbeurt, in het vaste deel dat
 * gecachet wordt) en alleen in de klantchat, niet in de bouwer van migraties.
 *
 * BIJ ELKE WIJZIGING AAN HET PORTAAL: werk deze kaart bij. tests/portaal-kaart.mts
 * controleert dat elke naam hieronder (KAART_NAMEN) echt in het portaal staat
 * én in de kaart; hernoem je een knop of tabblad zonder de kaart bij te
 * werken, dan wordt de testrit rood.
 */

/** Namen die de kaart noemt, met het bestand in app/portal waar ze staan. */
export const KAART_NAMEN: [naam: string, bestand: string][] = [
  ["Website bewerken", "PortaalSchil.tsx"],
  ["Berichten & mail", "PortaalSchil.tsx"],
  ["Account", "PortaalSchil.tsx"],
  ["Wijs aan", "Chat.tsx"],
  ["Stap terug", "Chat.tsx"],
  ["Concept weggooien", "Chat.tsx"],
  ["Draai terug", "Chat.tsx"],
  ["Nieuw gesprek", "Chat.tsx"],
  ["Vindbaarheid", "Vindbaarheid.tsx"],
  ["Hulp &amp; support", "ChatHulp.tsx"],
  ["Fotobank", "Fotobank.tsx"],
  ["Documentenbank", "DocumentBank.tsx"],
  ["Videobank", "VideoBank.tsx"],
  ["Audiobank", "AudioBank.tsx"],
  ["Link kopiëren", "BankHulp.tsx"],
  ["Kies de naam voor Google", "BankHulp.tsx"],
  ["Omschrijving aanpassen", "Fotobank.tsx"],
  ["Verversen", "InzendingenLijst.tsx"],
  ["Mogelijk spam", "InzendingenLijst.tsx"],
  ["Geen spam", "InzendingenLijst.tsx"],
  ["Bevestigingsmails", "BevestigingsMails.tsx"],
  ["Stuur je website een appje", "WhatsappBlok.tsx"],
  ["Je website en gegevens meenemen", "MeenemenBlok.tsx"],
];

export const PORTAAL_KAART = `
PORTAAL (wat de eigenaar zelf kan; verwijs precies, verzin geen knoppen):
- Balk bovenin, drie tabbladen. "Website bewerken": deze chat met voorbeeld; Wijs aan, Stap terug, Concept weggooien, na publiceren "Draai terug", Nieuw gesprek; via ⋯ kleur, icoontjes, links controleren en Vindbaarheid (titel, Google-omschrijving, webadres, deel-voorbeeld); vragen aan Jos via Hulp & support. "Berichten & mail": formulierberichten (zoeken, filteren, meerdere tegelijk afhandelen, Verversen; spam apart, twijfel met label Mogelijk spam en knoppen Spam/Geen spam), meldingsadres, handtekening en logo, Stuur je website een appje (WhatsApp), afspraken, Bevestigingsmails, eigen mailserver. "Account": facturen, Je website en gegevens meenemen (ook opzeggen), meelezen.
- Banken via 📎: Fotobank, Documentenbank, Videobank, Audiobank. Daar: zelf uploaden (eerst "Kies de naam voor Google"), zoeken, Link kopiëren voor mail of nieuwsbrief (alleen als het online staat), opruimen wat nergens staat. Alles daarin is openbaar. De fotobank toont per foto de alt-tekst; "Omschrijving aanpassen" geeft jou de opdracht: pas die foto's alt-tekst aan op elke plek.
- Bestandsnamen wijzig je nooit (staan op meerdere pagina's, maten, nieuwsbrieven): laat opnieuw uploaden onder de goede naam en zet dat bestand op de gevraagde plekken; het oude blijft staan. Een opgeruimd bestand haalt alleen Jos terug (Hulp & support).
`.trim();
