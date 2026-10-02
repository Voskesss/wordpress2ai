import type { LivegangCheck } from "@/lib/livegang";
import { zetLivegangAfgevinkt } from "@/app/admin/acties";
import ActieKnop from "./ActieKnop";

/** Knopje om een punt zelf af te vinken of het afvinken terug te draaien. */
function AfvinkKnop({ siteId, sleutel, aan }: { siteId: number; sleutel: string; aan: boolean }) {
  return (
    <form action={zetLivegangAfgevinkt} className="mt-1">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="sleutel" value={sleutel} />
      <input type="hidden" name="aan" value={aan ? "1" : "0"} />
      <ActieKnop
        label={aan ? "Zelf afvinken (ik heb het gecontroleerd)" : "Terugzetten"}
        bezigLabel="Bezig..."
        className="text-xs font-semibold text-violet-700 underline cursor-pointer"
      />
    </form>
  );
}

/** Livegang-checklist bovenaan de klantpagina: controleert zichzelf. Wat wij
 * niet kunnen meten (Search Console via een bestand bijvoorbeeld) vink je zelf af. */
export default function LivegangChecklist({ checks, siteId }: { checks: LivegangCheck[]; siteId: number }) {
  const open = checks.filter((c) => !c.ok);
  const dringend = open.some((c) => c.dringend);
  const klaar = open.length === 0;
  return (
    <details
      open={!klaar}
      className={`mt-6 rounded-3xl border p-5 sm:p-6 ${
        klaar ? "border-emerald-200 bg-emerald-50/60" : dringend ? "border-red-300 bg-red-50/60" : "border-amber-200 bg-amber-50/50"
      }`}
    >
      <summary className="cursor-pointer list-none">
        <span className="font-display text-xl font-semibold">
          {klaar ? "✅ Livegang compleet" : `🚀 Livegang: ${checks.length - open.length} van ${checks.length} klaar`}
        </span>
        {!klaar && (
          <span className="ml-2 text-sm text-stone-600">
            {dringend ? "Er gaat nu iets mis voor bezoekers, zie rood." : "Nog open, zie hieronder."}
          </span>
        )}
      </summary>
      <ul className="mt-4 space-y-2">
        {checks.map((c) => (
          <li key={c.sleutel} className="flex gap-3 text-sm">
            <span className="shrink-0">{c.ok ? "✅" : c.dringend ? "🔴" : "⬜"}</span>
            <span>
              <span className={c.ok ? "text-stone-600" : "font-semibold text-stone-900"}>{c.label}</span>
              {c.handmatig && <span className="ml-2 text-xs text-stone-500">zelf afgevinkt</span>}
              {!c.ok && c.uitleg && <span className={`block ${c.dringend ? "text-red-800" : "text-stone-600"}`}>{c.uitleg}</span>}
              {!c.ok && !c.dringend && <AfvinkKnop siteId={siteId} sleutel={c.sleutel} aan />}
              {c.handmatig && <AfvinkKnop siteId={siteId} sleutel={c.sleutel} aan={false} />}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-stone-500">
        Deze lijst controleert zichzelf bij elk bezoek aan deze pagina, ook of het domein echt de nieuwe site toont.
        Wat wij niet kunnen meten, vink je zelf af; een rood punt kan dat niet.
      </p>
    </details>
  );
}
