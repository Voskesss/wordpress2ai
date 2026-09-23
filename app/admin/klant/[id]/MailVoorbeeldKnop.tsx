"use client";

/** ⓘ: opent het voorbeeld van de mail die de klant krijgt, met wat er nu in
 * het omliggende formulier staat. Verstuurt niets. */
export default function MailVoorbeeldKnop({
  soort,
  siteId,
  leadId,
  extra,
  velden = [],
  klein = false,
}: {
  soort: string;
  /** Een klant (siteId) of een potentiële klant uit de leadlijst (leadId) */
  siteId?: number;
  leadId?: number;
  /** Vaste parameters, bv. { afspraakId: "12" } */
  extra?: Record<string, string>;
  /** Formuliervelden die mee moeten: [veldnaam, parameternaam] */
  velden?: [string, string][];
  klein?: boolean;
}) {
  return (
    <button
      type="button"
      title="Bekijk de mail die de klant krijgt"
      aria-label="Bekijk de mail die de klant krijgt"
      onClick={(e) => {
        const form = e.currentTarget.closest("form");
        const fd = form ? new FormData(form) : new FormData();
        const q = new URLSearchParams({
          soort,
          ...(leadId ? { leadId: String(leadId) } : { siteId: String(siteId) }),
          ...(extra ?? {}),
        });
        for (const [veld, param] of velden) {
          const w = String(fd.get(veld) ?? "").trim();
          if (w) q.set(param, w);
        }
        window.open(`/api/admin/mail-voorbeeld?${q.toString()}`, "_blank", "noopener");
      }}
      className={
        klein
          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-300 text-xs font-semibold text-stone-500 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 text-base font-semibold text-stone-600 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
      }
    >
      ⓘ
    </button>
  );
}
