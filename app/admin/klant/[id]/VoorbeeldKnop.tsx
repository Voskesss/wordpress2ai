"use client";

/** Opent in een nieuw tabblad het voorbeeld van de betaallink-mail en de
 * opdrachtbevestiging, met de waarden die nu in het formulier staan. */
export default function VoorbeeldKnop({ siteNaam }: { siteNaam: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        const form = e.currentTarget.closest("form");
        if (!form) return;
        const fd = new FormData(form);
        const q = new URLSearchParams({ site: siteNaam });
        for (const veld of ["naam", "email", "bedrijf", "adres", "kvk", "btw", "bedrag", "eenmalig", "afspraken"]) {
          const w = String(fd.get(veld) ?? "").trim();
          if (w) q.set(veld, w);
        }
        window.open(`/api/admin/abonnement-voorbeeld?${q.toString()}`, "_blank", "noopener");
      }}
      className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
    >
      👁 Bekijk eerst de mail en de opdrachtbevestiging
    </button>
  );
}
