/**
 * Interne links in de lopende tekst van landingspagina's: [ankertekst](/pad).
 * Alleen eigen paden (beginnend met /), zodat een tikfout nooit naar buiten
 * linkt. Zuiver, zodat het te testen is (Jos, 11-10-2026: vanuit zinnen als
 * "een alternatief voor WordPress" naar de pagina daarover linken).
 */
export type TekstDeel = { tekst: string; naar?: string };

const LINK = /\[([^\]]+)\]\((\/[a-z0-9\-/#]*)\)/g;

export function tekstDelen(tekst: string): TekstDeel[] {
  const uit: TekstDeel[] = [];
  let vanaf = 0;
  for (const m of tekst.matchAll(LINK)) {
    if (m.index! > vanaf) uit.push({ tekst: tekst.slice(vanaf, m.index) });
    uit.push({ tekst: m[1], naar: m[2] });
    vanaf = m.index! + m[0].length;
  }
  if (vanaf < tekst.length) uit.push({ tekst: tekst.slice(vanaf) });
  return uit;
}

/** De tekst zonder linkopmaak, voor plekken die geen links kennen (structured data). */
export const zonderLinks = (tekst: string) => tekst.replace(LINK, "$1");
