/** Bestandsnamen voor de banken. Los van de servercode, zodat de browser
 * dezelfde regels gebruikt bij het kiezen van een naam vóór het uploaden. */

/**
 * Een bestandsnaam die nog niet bestaat. Een upload overschrijft nooit
 * stilletjes een bestaand bestand: dan verandert wat er achter een al
 * verstuurde link staat. Bestaat de naam al, dan -2, -3 enzovoort.
 * `bestaand` bevat volledige paden (map/naam) of kale namen, afhankelijk van
 * wat `opbouw` maakt.
 */
export function vrijeNaam(stam: string, ext: string, bestaand: Set<string>, opbouw: (naam: string) => string = (n) => n): string {
  let naam = `${stam}${ext}`;
  for (let n = 2; bestaand.has(opbouw(naam)); n++) naam = `${stam}-${n}${ext}`;
  return naam;
}

/** Schone stam en extensie uit een geüploade bestandsnaam. */
export function schoneNaamDelen(naam: string, standaard = "document"): { stam: string; ext: string } {
  const schoon = (naam.split("/").pop() ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const punt = schoon.lastIndexOf(".");
  const stam = (punt > 0 ? schoon.slice(0, punt) : schoon).replace(/\./g, "-").replace(/-+$/, "").slice(0, 80) || standaard;
  const ext = punt > 0 ? schoon.slice(punt) : "";
  return { stam, ext };
}
