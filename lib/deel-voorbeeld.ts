/** Deel-voorbeeld (og-tags): bepaalt hoe een pagina eruitziet als iemand
 * hem deelt via WhatsApp, Facebook of LinkedIn — welk plaatje, welke kop,
 * welke tekst. Zonder deze tags kiest de app zelf iets (of niets), en juist
 * onze doelgroep deelt alles via WhatsApp (wens Jos 26-09).
 *
 * Pure functies, los van de route, zodat de test door het echte pad loopt. */

/** Leest de content van één og-/twitter-meta uit de pagina. */
export function metaUit(html: string, property: string): string {
  const p = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    html.match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`,
        "i",
      ),
    )?.[1] ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`,
        "i",
      ),
    )?.[1] ??
    ""
  );
}

/** Zet of vervangt één og-/twitter-meta in de head. Bestaat hij al, dan
 * wordt hij vervangen; anders komt hij vlak na de titel (of aan het begin
 * van de head als er geen titel is). Lege content = tag weghalen. */
export function zetMeta(html: string, property: string, content: string): string {
  const p = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bestaand = new RegExp(
    `[ \\t]*<meta[^>]+(?:property|name)=["']${p}["'][^>]*>\\n?`,
    "gi",
  );
  const veilig = content.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const tag = `<meta property="${property}" content="${veilig}">`;
  if (!content.trim()) return html.replace(bestaand, "");
  if (bestaand.test(html)) return html.replace(bestaand, `${tag}\n`);
  if (/<\/title>/i.test(html)) return html.replace(/<\/title>/i, `</title>\n${tag}`);
  return html.replace(/<head[^>]*>/i, (m) => `${m}\n${tag}`);
}

/** Volledig adres voor og:image en og:url: deel-apps accepteren geen
 * relatieve paden. */
export function volledigAdres(domein: string, pad: string): string {
  return `https://${domein.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/${pad.replace(/^\/+/, "")}`;
}

/** Alle deel-tags in één keer bijwerken. Kop en tekst vallen bewust NIET
 * terug op titel/omschrijving in de pagina zelf: staan ze er niet, dan
 * gebruiken deel-apps vanzelf de gewone titel en omschrijving, en hoeven
 * we die niet dubbel te onderhouden. */
export function zetDeelVoorbeeld(
  html: string,
  velden: { kop?: string; tekst?: string; fotoUrl?: string; paginaUrl?: string },
): string {
  let uit = html;
  if (velden.kop !== undefined) uit = zetMeta(uit, "og:title", velden.kop);
  if (velden.tekst !== undefined) uit = zetMeta(uit, "og:description", velden.tekst);
  if (velden.fotoUrl !== undefined) {
    uit = zetMeta(uit, "og:image", velden.fotoUrl);
    // Groot kaartje in plaats van piepklein thumbnailtje
    uit = zetMeta(uit, "twitter:card", velden.fotoUrl ? "summary_large_image" : "");
  }
  if (velden.paginaUrl) uit = zetMeta(uit, "og:url", velden.paginaUrl);
  return uit;
}
