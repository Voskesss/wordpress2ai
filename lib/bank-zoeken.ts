/** Past een zoekterm toe op bestandsnamen in de banken: hoofdletters,
 * streepjes en spaties maken niet uit ("boekje 2025" vindt boekje-2025.pdf). */
export function zoekOpNaam<T>(lijst: T[], zoek: string, naamVan: (x: T) => string): T[] {
  const schoon = (s: string) => s.toLowerCase().replace(/[-_.\s]+/g, " ").trim();
  const z = schoon(zoek);
  if (!z) return lijst;
  return lijst.filter((x) => schoon(naamVan(x).split("/").pop() ?? "").includes(z));
}
