import ActieKnop from "./ActieKnop";
import BevestigKnop from "./BevestigKnop";
import { routeBAanmelden, routeBAanmeldenSnel, routeBAfmelden } from "../../acties-route-b";
import { hoofdBinding, kaalDomein } from "@/lib/hoofdadres";
import { ONTVANGSTADRES, leesDomeinkaart, naamInPaneel, regelsVoorHoster, slugVan, statusVan, wijstNaarOns, type DomeinStatus } from "@/lib/route-b";
import { invoerStijl } from "./stijl";

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
  // Het domein dat via ons loopt komt uit de domeinkaart, niet uit het veld
  // bij Instellingen: dat veld wordt pas bij de overstap ingevuld
  let domein: string | null = null;
  let aangemeld = false;
  let kaartStoring = false;
  try {
    const kaart = await leesDomeinkaart();
    domein = Object.keys(kaart).find((d) => slugVan(kaart[d]) === site.siteSlug) ?? null;
    aangemeld = domein !== null;
  } catch {
    kaartStoring = true;
  }
  const ingevuld = kaalDomein(site);
  if (!site.siteSlug) {
    return (
      <details id="route-b" className="mt-6 scroll-mt-24 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
        <summary className="cursor-pointer list-none">
          <span className="font-display text-xl font-semibold">Domein blijft bij de hoster</span>
          <span className="ml-2 text-sm text-stone-600">alleen nodig als de hoster de DNS wil houden</span>
        </summary>
        <p className="mt-3 text-sm text-stone-600">Deze site heeft nog geen hosting-naam. Rol hem eerst uit.</p>
      </details>
    );
  }
  let status: DomeinStatus[] = [];
  let naarOns: Record<string, boolean | null> = {};
  let storing = kaartStoring;
  try {
    if (aangemeld && domein) {
      status = await statusVan(domein);
      naarOns = Object.fromEntries(await Promise.all(status.map(async (s) => [s.adres, await wijstNaarOns(s.adres)] as const)));
    }
  } catch {
    storing = true;
  }
  const vooraf = status.some((s) => s.methode === "txt");
  const certificatenKlaar = status.length > 0 && status.every((s) => s.adresStatus === "active" && s.certificaatStatus === "active");
  const controleRegels = status.flatMap((s) => s.controleRegels);
  const omgezet = status.length > 0 && status.every((s) => naarOns[s.adres] === true);
  const hoofd = hoofdBinding(site);
  const regels = domein ? regelsVoorHoster(domein, hoofd) : [];
  const publiek = domein ? (hoofd === "www" ? `www.${domein}` : domein) : null;
  // Bij de overstap: certificaat klaar, maar het veld bij Instellingen wijst nog naar workers.dev
  const veldNogLeeg = certificatenKlaar && !omgezet && (!ingevuld || ingevuld !== domein);
  const allesActief = aangemeld && certificatenKlaar && omgezet;
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
          {aangemeld
            ? allesActief
              ? `${publiek} loopt via ons`
              : certificatenKlaar
                ? "certificaat klaar, de hoster kan de verwijzing omzetten"
                : vooraf
                  ? "aangemeld, wacht op de controleregels van de hoster"
                  : "aangemeld, wacht op de hoster"
            : "alleen nodig als de hoster de DNS wil houden"}
        </span>
      </summary>
      {m && (
        <p className={`mt-3 rounded-xl border px-3.5 py-2 text-sm ${m.goed ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
          {m.tekst}
        </p>
      )}
      <p className="mt-3 text-sm text-stone-600">
        Normaal komt het domein in ons Cloudflare-account. Wil de hoster de DNS en de mail zelf houden, dan meld je het
        domein hier aan. De hoster zet een paar regels in zijn DNS en de website draait bij ons. Aan de mailregels
        verandert niets. Het veld Domein bij Instellingen laat je leeg tot de overstap: dat veld rolt de site opnieuw
        uit en stuurt formulieren en het maillogo naar het nieuwe adres.
      </p>
      {storing && <p className="mt-3 text-sm text-red-700">De stand kon niet worden opgehaald bij Cloudflare. Ververs de pagina.</p>}
      {veldNogLeeg && (
        <p className="mt-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-900">
          Certificaat klaar. Dit is het moment van de overstap: kijk eerst of de klant een open concept heeft, vul dan bij
          Instellingen het domein <span className="font-mono">{domein}</span> in{hoofd === "www" ? " met het vinkje Hoofdadres met www" : ""} en sla op. Laat daarna pas de verwijzing omzetten.
        </p>
      )}

      {aangemeld && (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-stone-400">
            <tr>
              <th className="py-1 pr-3 font-semibold">Adres</th>
              <th className="py-1 pr-3 font-semibold">Herkend</th>
              <th className="py-1 pr-3 font-semibold">Certificaat</th>
              <th className="py-1 font-semibold">Wijst naar ons</th>
            </tr>
          </thead>
          <tbody>
            {status.map((s) => (
              <tr key={s.adres} className="border-t border-stone-100 align-top">
                <td className="py-1.5 pr-3 font-mono text-xs">{s.adres}</td>
                <td className="py-1.5 pr-3">{s.adresStatus === "active" ? "✅ " : "⏳ "}{nl(s.adresStatus)}</td>
                <td className="py-1.5 pr-3">
                  {s.certificaatStatus === "active" ? "✅ " : "⏳ "}{nl(s.certificaatStatus)}
                  {s.fouten.map((f) => (
                    <span key={f} className="block text-xs text-amber-800">{f}</span>
                  ))}
                </td>
                <td className="py-1.5">{naarOns[s.adres] === true ? "✅ ja" : naarOns[s.adres] === false ? "⬜ nog niet" : "niet te bepalen"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {aangemeld && vooraf && controleRegels.length > 0 && (
        <div className={`mt-4 rounded-2xl border p-4 text-sm ${certificatenKlaar ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
          <p className="font-semibold text-stone-900">
            {certificatenKlaar ? "✅ Stap 1 klaar: controleregels" : "Stap 1: de hoster zet eerst deze controleregels"}
          </p>
          <p className="mt-1 text-stone-600">
            Hiermee maakt Cloudflare het certificaat alvast aan, terwijl de oude site gewoon blijft draaien. Regels met
            dezelfde naam moeten er allemaal in. Laat ze ook na de overstap staan: ze zijn nodig voor het verlengen.
          </p>
          <table className="mt-2 w-full text-left">
            <tbody>
              {controleRegels.map((r) => (
                <tr key={r.naam + r.waarde} className="border-t border-stone-200/70 align-top">
                  <td className="py-1.5 pr-3 font-mono text-xs">TXT</td>
                  <td className="break-all py-1.5 pr-3 font-mono text-xs">{naamInPaneel(r.naam, domein ?? "")}</td>
                  <td className="break-all py-1.5 font-mono text-xs">{r.waarde}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-stone-500">
            De naam is het stuk vóór {domein}; de meeste panelen zetten het domein er zelf achter. De codes zijn ongeveer
            een week geldig.
          </p>
        </div>
      )}

      {domein && (
      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
        <p className="font-semibold text-stone-900">
          {aangemeld && vooraf ? (certificatenKlaar ? "Stap 2: nu mag de hoster de verwijzing omzetten" : "Stap 2: pas daarna de verwijzing (nog niet doen)") : "Regels voor de hoster"}
        </p>
        <p className="mt-1 text-stone-600">
          {publiek ? <>Hoofdadres van deze site: <b>{publiek}</b>. </> : null}Alles voor de mail blijft staan.
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
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {!aangemeld ? (
          <>
            <form action={routeBAanmelden} className="flex w-full flex-wrap items-end gap-3">
              <input type="hidden" name="siteId" value={site.id} />
              <label className="block flex-1 text-sm font-semibold">
                Domein van de klant
                <input
                  name="domein"
                  required
                  defaultValue={ingevuld ?? ""}
                  placeholder="klant.nl (zonder www)"
                  className={invoerStijl}
                />
                <span className="mt-1 block text-xs font-normal text-stone-500">
                  Hoofdadres: {hoofd === "www" ? "met www" : "zonder www"} (vinkje bij Instellingen)
                </span>
              </label>
              <input type="hidden" name="vooraf" value="ja" />
              <ActieKnop
                label="Meld aan (zonder onderbreking)"
                bezigLabel="Aanmelden..."
                className="cursor-pointer rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600"
              />
              <ActieKnop
                formAction={routeBAanmeldenSnel}
                label="Snel aanmelden"
                bezigLabel="Aanmelden..."
                className="cursor-pointer rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700"
              />
            </form>
            <p className="w-full text-xs text-stone-500">
              <b>Zonder onderbreking</b>: voor een site met bezoekers. De hoster zet eerst controleregels, het certificaat
              staat klaar voordat er iets omgaat. <b>Snel</b>: alleen voor een domein waar nu niets op draait; tussen
              omzetten en certificaat zit een paar minuten met een waarschuwing in de browser.
            </p>
          </>
        ) : (
          <form action={routeBAfmelden}>
            <input type="hidden" name="siteId" value={site.id} />
            <input type="hidden" name="domein" value={domein ?? ""} />
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
