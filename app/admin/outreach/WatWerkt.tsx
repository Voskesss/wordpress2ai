type ProspectRij = {
  status: string;
  branche: string | null;
  plaats: string | null;
  score: number | null;
  laadMs: number | null;
  kenmerken: string | null;
};

/** Doelgroep-analyse: per segment hoeveel er gemaild zijn en hoeveel daarvan
 * reageerden of klant werden. Laat zien wáár de interesse zit. */
export default function WatWerkt({ rijen }: { rijen: ProspectRij[] }) {
  const gemaild = rijen.filter((r) =>
    ["mail1", "mail2", "mail3", "gereageerd", "klant"].includes(r.status)
  );
  if (gemaild.length < 3) return null; // nog te weinig om iets van te vinden

  const isRaak = (r: ProspectRij) => r.status === "gereageerd" || r.status === "klant";

  // Segmenten opbouwen: branche, score-band en opvallende kenmerken
  const segmenten = new Map<string, { totaal: number; raak: number }>();
  const tel = (naam: string, raak: boolean) => {
    const s = segmenten.get(naam) ?? { totaal: 0, raak: 0 };
    s.totaal += 1;
    if (raak) s.raak += 1;
    segmenten.set(naam, s);
  };

  for (const r of gemaild) {
    const raak = isRaak(r);
    if (r.branche) tel(`branche: ${r.branche.toLowerCase()}`, raak);
    if (r.score != null)
      tel(
        r.score >= 7 ? "zwaar verwaarloosde site (score 7+)" : r.score >= 4 ? "matig bijgehouden (score 4-6)" : "redelijk bijgehouden (score 0-3)",
        raak
      );
    if (r.laadMs != null && r.laadMs > 3000) tel("erg trage site (3s+)", raak);
    const k = r.kenmerken?.toLowerCase() ?? "";
    if (/stokoude|verouderde wordpress/.test(k)) tel("verouderde WordPress", raak);
    if (/elementor/.test(k)) tel("gebouwd met Elementor", raak);
    if (/viewport/.test(k)) tel("niet mobielvriendelijk", raak);
    if (/copyright/.test(k)) tel("verouderde footer/jaartal", raak);
  }

  const lijst = [...segmenten.entries()]
    .filter(([, s]) => s.totaal >= 2)
    .sort((a, b) => b[1].raak / b[1].totaal - a[1].raak / a[1].totaal || b[1].totaal - a[1].totaal)
    .slice(0, 10);
  if (lijst.length === 0) return null;

  const totaalRaak = gemaild.filter(isRaak).length;

  return (
    <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="font-display text-xl font-semibold">📈 Waar zit de interesse?</h2>
      <p className="mt-1 text-sm text-stone-600">
        Van de <strong>{gemaild.length}</strong> gemailde prospects reageerden er{" "}
        <strong>{totaalRaak}</strong>. Per kenmerk (alleen segmenten met minstens 2
        gemailde prospects):
      </p>
      <div className="mt-4 space-y-2">
        {lijst.map(([naam, s]) => {
          const pct = Math.round((s.raak / s.totaal) * 100);
          return (
            <div key={naam} className="flex items-center gap-3 text-sm">
              <span className="w-64 shrink-0 truncate text-stone-700">{naam}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full ${pct >= 30 ? "bg-emerald-500" : pct >= 10 ? "bg-violet-500" : "bg-stone-300"}`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-stone-500">
                {s.raak}/{s.totaal} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-stone-400">
        Kenmerken worden automatisch meegenomen als je een prospect via de
        zoeker of scanner toevoegt. Zet de status op &quot;gereageerd&quot;
        zodra iemand antwoordt — dan groeit dit overzicht vanzelf.
      </p>
    </div>
  );
}
