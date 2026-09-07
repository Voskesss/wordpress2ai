/** Markering in de berichtenlijst waar een nieuw gesprek begint: alles
 * ervóór blijft bewaard (archief), maar de AI en het portaal kijken alleen
 * naar wat erna komt. */
export const NIEUW_GESPREK = "⟂nieuw-gesprek";

export function vanafLaatsteNieuwGesprek<T extends { tekst: string }>(rows: T[]): T[] {
  let start = 0;
  rows.forEach((r, i) => {
    if (r.tekst === NIEUW_GESPREK) start = i + 1;
  });
  return rows.slice(start);
}
