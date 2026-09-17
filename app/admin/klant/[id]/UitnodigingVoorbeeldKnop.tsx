"use client";

/** ⓘ naast "Koppel / nodig uit": opent de uitnodigingsmail zoals de klant hem krijgt,
 * met het e-mailadres en de link die nu in het formulier staan. Verstuurt niets. */
export default function UitnodigingVoorbeeldKnop({ siteId }: { siteId: number }) {
  return (
    <button
      type="button"
      title="Bekijk de mail die de klant krijgt"
      aria-label="Bekijk de mail die de klant krijgt"
      onClick={(e) => {
        const form = e.currentTarget.closest("form");
        const fd = form ? new FormData(form) : new FormData();
        const q = new URLSearchParams({ siteId: String(siteId) });
        for (const [veld, param] of [["email", "email"], ["bekijkLink", "link"]] as const) {
          const w = String(fd.get(veld) ?? "").trim();
          if (w) q.set(param, w);
        }
        window.open(`/api/admin/uitnodiging-voorbeeld?${q.toString()}`, "_blank", "noopener");
      }}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 text-base font-semibold text-stone-600 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
    >
      ⓘ
    </button>
  );
}
