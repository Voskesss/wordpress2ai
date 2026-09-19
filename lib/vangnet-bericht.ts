/**
 * Hoe de waarschuwing van het dubbeling-vangnet in het antwoord terechtkomt.
 * Apart gehouden van de chatbeurt omdat hier de fouten zaten die de eigenaar
 * echt raken: een keuzeregel die niet onderaan staat (dan worden het geen
 * knoppen maar kale tekst), twee keuzeregels onder elkaar, of een waarschuwing
 * die wordt onderdrukt terwijl de eigenaar daar niet om vroeg.
 */

/** Vroeg de eigenaar zelf al om "alleen hier"? Dan is een waarschuwing dat het
 * elders anders blijft juist ruis — hij heeft het expres zo gevraagd. */
export function vraagtAlleenHier(bericht: string): boolean {
  return /\balleen\b.{0,40}\b(hier|die|deze|dat|dit|daar|homepage|pagina|plek|kaart|blok|regel|zin|foto)\b|\b(die|deze) (plek|pagina|kaart) alleen\b|nergens anders|verder niets|de rest laten staan/i.test(
    bericht,
  );
}

/** Bouwt het uiteindelijke antwoord op. De keuzeregel is ALTIJD de laatste
 * regel: het portaal maakt er knoppen van en WhatsApp een keuzelijst, en dat
 * werkt alleen als er niets meer achter staat. */
export function bouwVangnetAntwoord(opties: {
  /** Het antwoord van de AI zoals het er nu staat */
  reply: string;
  /** Wat het vangnet vond; leeg = niets aan de hand */
  meldingen: string[];
  /** Regel voor de testomgeving; op productie leeg laten */
  debug?: string;
}): { reply: string; vraag: boolean } {
  let reply = opties.reply;
  const vraag = opties.meldingen.length > 0;
  if (vraag) {
    // Er kan er maar één keuzeregel onderaan staan; deze waarschuwing gaat
    // voor de keuzes die de AI zelf bedacht.
    reply = reply.replace(/\n\s*KEUZES:[^\n]*\s*$/, "");
    reply += `\n\n${opties.meldingen
      .map((m) => `⚠️ **${m}**`)
      .join("\n")}\nZal ik het overal gelijktrekken, of moest dit bewust alleen hier?`;
  }
  if (opties.debug) reply += `\n\n[vangnet: ${opties.debug}]`;
  if (vraag) reply += `\nKEUZES: Overal doorvoeren | Het moest alleen hier`;
  return { reply, vraag };
}
