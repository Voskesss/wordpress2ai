import ActieKnop from "./ActieKnop";
import BevestigKnop from "./BevestigKnop";
import { routeBAanmelden, routeBAfmelden } from "../../acties-route-b";
import { hoofdBinding, kaalDomein, publiekAdres } from "@/lib/hoofdadres";
import { ONTVANGSTADRES, leesDomeinkaart, regelsVoorHoster, slugVan, statusVan, type DomeinStatus } from "@/lib/route-b";

const MELDING: Record<string, { tekst: string; goed: boolean }> = {
  aangemeld: { tekst: "✓ Aangemeld. Stuur de regels hieronder naar de hoster; het certificaat volgt vanzelf zodra ze erin staan.", goed: true },
  afgemeld: { tekst: "✓ Afgemeld. Het domein loopt niet meer via ons.", goed: true },
  mislukt: { tekst: "Dat lukte niet. Kijk in de logs, of probeer het opnieuw.", goed: false },
  "geen-domein": { tekst: "Vul eerst bij Instellingen het eigen domein en de hosting-naam in.", goed: false },
  "niet-van-deze-site": { tekst: "Dit domein hangt aan een andere site. Er is niets gewijzigd.", goed: false },
};

const NL_STATUS: Record<string, string> = {
  active: "actief",
  pending: "wacht op de regels van de hoster",
  pending_validation: "wordt aangemaakt",
  initializing: "wordt aangemaakt",
  "niet aangemeld": "niet aangemeld",
};
const nl = (s: string) => NL_STATUS[s] ?? s;

/** Tweede route van de livegang: de DNS (en de mail) blijft bij de hoster,
 * alleen het websiteverkeer komt naar ons. Voor sites waarvan het domein in
 * ons eigen Cloudflare-account staat is dit blok niet nodig. */
export default async function RouteBBlok({
  site,
  melding,
}: {
  site: { id: number; domein: string | null; siteSlug: string | null; hoofdadresWww: boolean };
  melding?: string;
}) {
  const domein = kaalDomein(site);
  if (!domein || !site.siteSlug) return null;
  let aangemeld = false;
  let status: DomeinStatus[] = [];
  let storing = false;
  try {
    aangemeld = slugVan((await leesDomeinkaart())[domein]) === site.siteSlug;
    if (aangemeld) status = await statusVan(domein);
  } catch {
    storing = true;
  }
  const hoofd = hoofdBinding(site);
  const regels = regelsVoorHoster(domein, hoofd);
  const allesActief = aangemeld && status.length > 0 && status.every((s) => s.adresStatus === "active" && s.certificaatStatus === "active");
  const m = melding ? MELDING[melding] : null;
  return (
    <details
      id="route-b"
      open={aangemeld || Boolean(m)}
      className="mt-6 scroll-mt-24 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6"
    >
      <summary className="cursor-pointer list-none">
        <span className="font-display text-xl font-semibold">
          {allesActief ? "✅ " : aangemeld ? "⏳ " : ""}Domein blijft bij de hoster
        </span>
        <span className="ml-2 text-sm text-stone-600">
          {aangemeld ? (allesActief ? `${publiekAdres(site)} loopt via ons` : "aangemeld, wacht op de hoster") : "alleen nodig als de hoster de DNS wil houden"}
        </span>
      </summary>
      {m && (
        <p className={`mt-3 rounded-xl border px-3.5 py-2 text-sm ${m.goed ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
          {m.tekst}
        </p>
      )}
      <p className="mt-3 text-sm text-stone-600">
        Normaal komt het domein in ons Cloudflare-account. Wil de hoster de DNS en de mail zelf houden, dan meld je het
        domein hier aan. De hoster zet twee regels in zijn DNS en de website draait bij ons. Aan de mailregels verandert
        niets.
      </p>
      {storing && <p className="mt-3 text-sm text-red-700">De stand kon niet worden opgehaald bij Cloudflare. Ververs de pagina.</p>}

      {aangemeld && (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-stone-400">
            <tr>
              <th className="py-1 pr-3 font-semibold">Adres</th>
              <th className="py-1 pr-3 font-semibold">Verwijzing</th>
              <th className="py-1 font-semibold">Certificaat</th>
            </tr>
          </thead>
          <tbody>
            {status.map((s) => (
              <tr key={s.adres} className="border-t border-stone-100 align-top">
                <td className="py-1.5 pr-3 font-mono text-xs">{s.adres}</td>
                <td className="py-1.5 pr-3">{s.adresStatus === "active" ? "✅ " : "⏳ "}{nl(s.adresStatus)}</td>
                <td className="py-1.5">
                  {s.certificaatStatus === "active" ? "✅ " : "⏳ "}{nl(s.certificaatStatus)}
                  {s.fouten.map((f) => (
                    <span key={f} className="block text-xs text-amber-800">{f}</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
        <p className="font-semibold text-stone-900">Regels voor de hoster</p>
        <p className="mt-1 text-stone-600">
          Hoofdadres van deze site: <b>{publiekAdres(site)}</b>. Alles voor de mail blijft staan.
        </p>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          {regels.map((r) => (
            <li key={r.naam}>
              <span className="font-mono text-xs">
                {r.soort} · {r.naam} → {ONTVANGSTADRES}
              </span>
              <span className="block text-stone-600">{r.uitleg}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {!aangemeld ? (
          <form action={routeBAanmelden}>
            <input type="hidden" name="siteId" value={site.id} />
            <ActieKnop
              label={`Meld ${domein} aan`}
              bezigLabel="Aanmelden..."
              className="cursor-pointer rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600"
            />
          </form>
        ) : (
          <form action={routeBAfmelden}>
            <input type="hidden" name="siteId" value={site.id} />
            <BevestigKnop
              vraag={`${domein} afmelden? Bezoekers van dat adres krijgen dan een foutpagina, tot de hoster de regels terugzet of het domein op een andere manier gekoppeld is.`}
              label="Afmelden"
              bezigLabel="Afmelden..."
              className="cursor-pointer text-xs font-semibold text-red-700 hover:underline"
            />
          </form>
        )}
      </div>
    </details>
  );
}
