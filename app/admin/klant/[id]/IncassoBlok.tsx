import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, betaalverzoeken, betalingen, facturen, sites } from "@/db/schema";
import { euroTekst, inclBtwCent, isTestmodus, mollie, vandaagNl } from "@/lib/mollie";
import {
  annuleerBedragWijziging,
  betaalverzoekIntrekken,
  factuurCorrigeren,
  factuurOpnieuwMailen,
  losseOpdracht,
  mailBetaallink,
  opzeggenPer,
  opzeggingIntrekken,
  startAbonnement,
  stopAbonnement,
  terugbetalen,
  wijzigMaandbedrag,
} from "../../acties-abonnement";
import ActieKnop from "./ActieKnop";

type Site = typeof sites.$inferSelect;

const invoer =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal text-sm focus:border-violet-600 focus:outline-none";
const knopGroen = "rounded-full bg-[#31956B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245747] cursor-pointer";
const knopRand =
  "rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer";
const knopRood = "rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 cursor-pointer";
const kaart = "rounded-2xl border border-stone-200 bg-stone-50/60 p-4";

function datumNl(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function plusDagen(dagen: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dagen);
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

const BETAALSTATUS: Record<string, string> = {
  paid: "betaald",
  open: "open",
  pending: "in behandeling",
  failed: "mislukt",
  expired: "verlopen",
  canceled: "geannuleerd",
};

export default async function IncassoBlok({
  site,
  melding,
  klantNaam,
  klantEmail,
}: {
  site: Site;
  melding?: string;
  klantNaam: string;
  klantEmail: string;
}) {
  const [abonnement] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, site.id)).catch(() => []);
  const verzoeken = await db
    .select()
    .from(betaalverzoeken)
    .where(eq(betaalverzoeken.siteId, site.id))
    .orderBy(desc(betaalverzoeken.id))
    .catch(() => []);
  const betaalHistorie = await db
    .select()
    .from(betalingen)
    .where(eq(betalingen.siteId, site.id))
    .orderBy(desc(betalingen.id))
    .then((r) => r.slice(0, 15))
    .catch(() => []);
  const alleFacturen = await db
    .select()
    .from(facturen)
    .where(eq(facturen.siteId, site.id))
    .orderBy(desc(facturen.id))
    .catch(() => []);
  const klantFacturen = alleFacturen.filter((f) => f.nummer);
  const gecrediteerd = new Map<number, number>();
  for (const c of alleFacturen) {
    if (c.soort === "credit" && c.creditVoorId) gecrediteerd.set(c.creditVoorId, (gecrediteerd.get(c.creditVoorId) ?? 0) - c.totaalCent);
  }

  const actief = abonnement?.status === "actief" || abonnement?.status === "mislukt";
  let volgendeAfschrijving: string | null = null;
  if (actief && abonnement?.mollieCustomerId && abonnement.mollieSubscriptionId) {
    try {
      const sub = await mollie<{ nextPaymentDate?: string }>(
        `/customers/${abonnement.mollieCustomerId}/subscriptions/${abonnement.mollieSubscriptionId}`,
      );
      volgendeAfschrijving = sub.nextPaymentDate ?? null;
    } catch {
      /* niet tonen */
    }
  }
  const kanAfschrijven = abonnement?.status === "actief" && Boolean(abonnement.mollieMandateId);
  const openLinks = verzoeken.filter((v) => v.soort === "los" && v.wijze === "link" && v.status === "open");
  const vandaag = vandaagNl();

  return (
    <div id="abonnement" className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-display text-xl font-semibold">💶 Incasso en facturen</h2>
        {abonnement && (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              abonnement.status === "actief"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : abonnement.status === "mislukt"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-stone-200 bg-stone-50 text-stone-600"
            }`}
          >
            {{ wacht_op_eerste: "wacht op eerste betaling", actief: "incasso actief", mislukt: "laatste incasso mislukt", gestopt: "gestopt" }[abonnement.status]}
          </span>
        )}
        {isTestmodus() && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            testmodus: er gaat geen echt geld om
          </span>
        )}
      </div>
      {melding && <p className="mt-3 rounded-xl bg-violet-50 px-4 py-2.5 text-sm text-violet-900">{melding}</p>}

      {/* 1. Abonnement */}
      <section className={`mt-4 ${kaart}`}>
        <h3 className="font-semibold">Maandabonnement</h3>
        {abonnement && abonnement.status !== "gestopt" ? (
          <div className="mt-2 space-y-3 text-sm text-stone-700">
            <p>
              <strong>{abonnement.klantBedrijf ?? abonnement.naam}</strong>
              {abonnement.klantBedrijf && <> (t.a.v. {abonnement.naam})</>} · {abonnement.email}
              <br />
              <strong>{euroTekst(abonnement.maandbedragCent)}</strong> per maand excl. btw ({euroTekst(inclBtwCent(abonnement.maandbedragCent))} incl. btw)
              {abonnement.eenmaligCent > 0 && abonnement.status === "wacht_op_eerste" && (
                <> · plus eenmalige omzetting {euroTekst(abonnement.eenmaligCent)} in de eerste betaling</>
              )}
              {volgendeAfschrijving && <> · volgende afschrijving {datumNl(volgendeAfschrijving)}</>}
            </p>

            {abonnement.status === "wacht_op_eerste" && abonnement.betaallink && (
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <p className="text-xs text-stone-500">
                  De klant heeft de betaallink en de opdrachtbevestiging (pdf) per mail gekregen; jij een kopie. De link verloopt niet.
                  Hieronder de link, mocht je hem ook via WhatsApp of telefoon willen delen:
                </p>
                <input readOnly value={abonnement.betaallink} className={`${invoer} select-all`} />
                <form action={mailBetaallink} className="mt-2">
                  <input type="hidden" name="siteId" value={site.id} />
                  <ActieKnop label="Mail opnieuw versturen" bezigLabel="Mailen..." klaarLabel="✓ Opnieuw gemaild" className={knopRand} />
                </form>
              </div>
            )}
            {abonnement.status === "mislukt" && (
              <p className="text-red-800">
                De laatste incasso is mislukt. Neem contact op met de klant. Lukt het daarna nog steeds niet, stop de incasso en maak een nieuwe betaallink.
              </p>
            )}
            {abonnement.nieuwBedragCent && abonnement.nieuwBedragVanaf && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                <span>
                  Gepland: vanaf {datumNl(abonnement.nieuwBedragVanaf)} wordt het maandbedrag {euroTekst(abonnement.nieuwBedragCent)} excl. btw.
                </span>
                <form action={annuleerBedragWijziging}>
                  <input type="hidden" name="siteId" value={site.id} />
                  <ActieKnop label="Annuleren" bezigLabel="..." klaarLabel="✓" className="text-xs font-semibold underline cursor-pointer" />
                </form>
              </div>
            )}
            {abonnement.stoptOp && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-3 py-2 text-red-900">
                <span>Opgezegd: de incasso stopt op {datumNl(abonnement.stoptOp)}.</span>
                <form action={opzeggingIntrekken}>
                  <input type="hidden" name="siteId" value={site.id} />
                  <ActieKnop label="Opzegging intrekken" bezigLabel="..." klaarLabel="✓" className="text-xs font-semibold underline cursor-pointer" />
                </form>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <details className="min-w-[16rem] flex-1 rounded-xl border border-stone-200 bg-white p-3">
                <summary className="cursor-pointer font-semibold">Maandbedrag wijzigen</summary>
                <form action={wijzigMaandbedrag} className="mt-2 space-y-2">
                  <input type="hidden" name="siteId" value={site.id} />
                  <label className="block text-sm font-semibold">
                    Nieuw bedrag (€ excl. btw)
                    <input name="bedrag" inputMode="decimal" required defaultValue={String(abonnement.maandbedragCent / 100)} className={invoer} />
                  </label>
                  {actief && (
                    <label className="block text-sm font-semibold">
                      Ingangsdatum
                      <input name="vanaf" type="date" required min={plusDagen(1)} defaultValue={volgendeAfschrijving ?? plusDagen(30)} className={invoer} />
                    </label>
                  )}
                  <p className="text-xs text-stone-500">
                    {actief
                      ? "De klant krijgt meteen een mail met het nieuwe bedrag en de datum. Kies de datum ruim vooruit, bij voorkeur een maand."
                      : "Er loopt nog geen incasso, dus het nieuwe bedrag geldt meteen."}
                  </p>
                  <ActieKnop label={actief ? "Wijziging plannen en klant mailen" : "Opslaan"} bezigLabel="Bezig..." className={knopRand} />
                </form>
              </details>

              {actief && !abonnement.stoptOp && (
                <details className="min-w-[16rem] flex-1 rounded-xl border border-stone-200 bg-white p-3">
                  <summary className="cursor-pointer font-semibold">Opzeggen</summary>
                  <form action={opzeggenPer} className="mt-2 space-y-2">
                    <input type="hidden" name="siteId" value={site.id} />
                    <label className="block text-sm font-semibold">
                      Stoppen per
                      <input name="datum" type="date" required min={vandaag} defaultValue={volgendeAfschrijving ?? plusDagen(30)} className={invoer} />
                    </label>
                    <p className="text-xs text-stone-500">
                      De incasso stopt vroeg in de ochtend van die dag. Kies de dag vóór de volgende afschrijving als die maand niet meer betaald moet worden. De klant krijgt een bevestiging.
                    </p>
                    <ActieKnop label="Opzegging plannen" bezigLabel="Bezig..." className={knopRand} />
                  </form>
                  <form action={stopAbonnement} className="mt-3 border-t border-stone-100 pt-3">
                    <input type="hidden" name="siteId" value={site.id} />
                    <ActieKnop label="Of: meteen stoppen" bezigLabel="Stoppen..." className={knopRood} />
                  </form>
                </details>
              )}
              {abonnement.status === "wacht_op_eerste" && (
                <form action={stopAbonnement}>
                  <input type="hidden" name="siteId" value={site.id} />
                  <ActieKnop label="Betaallink intrekken" bezigLabel="Bezig..." className={knopRood} />
                </form>
              )}
            </div>
          </div>
        ) : (
          <form action={startAbonnement} className="mt-3 grid gap-3 sm:grid-cols-4 items-end">
            <input type="hidden" name="siteId" value={site.id} />
            <label className="block text-sm font-semibold sm:col-span-2">
              Naam contactpersoon
              <input name="naam" required defaultValue={abonnement?.naam ?? klantNaam} className={invoer} />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              E-mailadres
              <input name="email" type="email" required defaultValue={abonnement?.email ?? klantEmail} className={invoer} />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Bedrijfsnaam (voor de factuur)
              <input name="bedrijf" defaultValue={abonnement?.klantBedrijf ?? site.naam} className={invoer} />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Adres
              <textarea name="adres" rows={2} placeholder={"Straat 1\n1234 AB Plaats"} defaultValue={abonnement?.klantAdres ?? ""} className={invoer} />
            </label>
            <label className="block text-sm font-semibold">
              KvK klant (optioneel)
              <input name="kvk" defaultValue={abonnement?.klantKvk ?? ""} className={invoer} />
            </label>
            <label className="block text-sm font-semibold">
              Btw-nr klant (optioneel)
              <input name="btw" defaultValue={abonnement?.klantBtw ?? ""} className={invoer} />
            </label>
            <label className="block text-sm font-semibold">
              € per maand (excl. btw)
              <input name="bedrag" inputMode="decimal" required defaultValue={abonnement ? String(abonnement.maandbedragCent / 100) : "12"} className={invoer} />
            </label>
            <label className="block text-sm font-semibold">
              Eenmalige omzetting (€)
              <input name="eenmalig" inputMode="decimal" placeholder="leeg = geen" className={invoer} />
            </label>
            <div className="sm:col-span-4">
              <ActieKnop label="✉️ Betaallink aanmaken en meteen mailen" bezigLabel="Aanmaken en mailen..." className={knopGroen} />
              <p className="mt-2 text-xs text-stone-500">
                Eén klik doet alles: de klant krijgt een mail met de betaallink én de opdrachtbevestiging (pdf) als bijlage; jij krijgt een kopie.
                Hij betaalt via iDEAL in één keer de omzetting en de eerste maand (met 21% btw erbij) en geeft daarmee de machtiging — betalen is akkoord.
                Daarna wordt alleen het maandbedrag automatisch afgeschreven, en bij elke betaling gaat er vanzelf een factuur naar de klant.
              </p>
            </div>
          </form>
        )}
      </section>

      {/* 2. Losse opdracht */}
      <section className={`mt-4 ${kaart}`}>
        <details>
          <summary className="cursor-pointer font-semibold">＋ Losse opdracht factureren</summary>
          <form action={losseOpdracht} className="mt-3 grid gap-3 sm:grid-cols-4 items-end">
            <input type="hidden" name="siteId" value={site.id} />
            <label className="block text-sm font-semibold sm:col-span-3">
              Omschrijving (komt zo op de factuur)
              <input name="omschrijving" required placeholder="Bijv. nieuwe pagina 'Workshops' bouwen" className={invoer} />
            </label>
            <label className="block text-sm font-semibold">
              Bedrag (€ excl. btw)
              <input name="bedrag" inputMode="decimal" required className={invoer} />
            </label>
            {!abonnement && (
              <>
                <label className="block text-sm font-semibold sm:col-span-2">
                  Naam klant
                  <input name="naam" required defaultValue={klantNaam} className={invoer} />
                </label>
                <label className="block text-sm font-semibold sm:col-span-2">
                  E-mailadres klant
                  <input name="email" type="email" required defaultValue={klantEmail} className={invoer} />
                </label>
                <label className="block text-sm font-semibold sm:col-span-4">
                  Bedrijfsnaam (optioneel)
                  <input name="bedrijf" defaultValue={site.naam} className={invoer} />
                </label>
              </>
            )}
            <fieldset className="sm:col-span-4 space-y-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="wijze" value="link" defaultChecked className="accent-emerald-700" />
                Betaallink mailen (de klant betaalt zelf)
              </label>
              <label className={`flex items-center gap-2 ${kanAfschrijven ? "" : "text-stone-400"}`}>
                <input type="radio" name="wijze" value="incasso" disabled={!kanAfschrijven} className="accent-emerald-700" />
                Afschrijven via de bestaande machtiging
                {!kanAfschrijven && <span className="text-xs">(kan pas bij een actieve incasso)</span>}
              </label>
              {kanAfschrijven && (
                <label className="ml-6 flex items-start gap-2 text-xs text-stone-600">
                  <input type="checkbox" name="akkoord" className="mt-0.5 accent-emerald-700" />
                  De klant heeft akkoord gegeven op deze opdracht en dit bedrag. Hij krijgt vooraf een aankondiging per mail.
                </label>
              )}
            </fieldset>
            <div className="sm:col-span-4">
              <ActieKnop label="Versturen" bezigLabel="Bezig..." className={knopGroen} />
            </div>
          </form>
        </details>
        {openLinks.length > 0 && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Openstaande betaallinks</p>
            {openLinks.map((v) => (
              <div key={v.id} className="rounded-xl border border-stone-200 bg-white p-3">
                <p>
                  <strong>{v.omschrijving}</strong> · {euroTekst(inclBtwCent(v.bedragExclCent))} incl. btw · sinds{" "}
                  {v.aangemaakt.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <input readOnly value={`https://wordswap.nl/betalen/${v.token}`} className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs select-all" />
                  <form action={betaalverzoekIntrekken}>
                    <input type="hidden" name="siteId" value={site.id} />
                    <input type="hidden" name="verzoekId" value={v.id} />
                    <ActieKnop label="Intrekken" bezigLabel="..." klaarLabel="✓" className="text-xs font-semibold text-red-700 hover:underline cursor-pointer" />
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Facturen */}
      {klantFacturen.length > 0 && (
        <section className={`mt-4 ${kaart}`}>
          <h3 className="font-semibold">🧾 Facturen ({klantFacturen.length})</h3>
          <ul className="mt-2 divide-y divide-stone-200 text-sm">
            {klantFacturen.map((f) => {
              const nogTerug = f.soort === "factuur" ? f.totaalCent - (gecrediteerd.get(f.id) ?? 0) : 0;
              return (
                <li key={f.id} className="py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <a href={`/api/admin/factuur/${f.nummer}`} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
                        {f.soort === "credit" ? "Credit" : "Factuur"} {f.nummer}
                      </a>{" "}
                      · {f.datum.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })} ·{" "}
                      <span className={f.soort === "credit" ? "text-red-700" : ""}>{euroTekst(f.totaalCent)}</span>
                      <span className="ml-2 text-xs text-stone-500">{f.regels.map((r) => r.omschrijving).join(", ")}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className={`text-xs ${f.verstuurd ? "text-emerald-700" : "text-red-700"}`}>{f.verstuurd ? "✓ gemaild" : "niet gemaild"}</span>
                      <form action={factuurOpnieuwMailen}>
                        <input type="hidden" name="siteId" value={site.id} />
                        <input type="hidden" name="factuurId" value={f.id} />
                        <ActieKnop label="Opnieuw mailen" bezigLabel="Mailen..." klaarLabel="✓" className="text-xs font-semibold text-violet-700 hover:underline cursor-pointer" />
                      </form>
                    </span>
                  </div>
                  {f.soort === "factuur" && nogTerug > 0 && /^tr_\w+$/.test(f.molliePaymentId) && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-stone-500">Terugbetalen</summary>
                      <form action={terugbetalen} className="mt-2 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="siteId" value={site.id} />
                        <input type="hidden" name="factuurId" value={f.id} />
                        <label className="block text-xs font-semibold">
                          Bedrag incl. btw (leeg = alles, {euroTekst(nogTerug)})
                          <input name="bedrag" inputMode="decimal" className="mt-1 w-40 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm" />
                        </label>
                        <ActieKnop label="Terugbetalen en creditfactuur maken" bezigLabel="Bezig..." className={knopRood} />
                      </form>
                    </details>
                  )}
                  {f.soort === "factuur" && nogTerug === f.totaalCent && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-stone-500">Gegevens corrigeren (creditfactuur + herziene factuur)</summary>
                      <form action={factuurCorrigeren} className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input type="hidden" name="siteId" value={site.id} />
                        <input type="hidden" name="factuurId" value={f.id} />
                        <label className="block text-xs font-semibold">
                          Naam
                          <input name="naam" required defaultValue={f.klantNaam} className={invoer} />
                        </label>
                        <label className="block text-xs font-semibold">
                          E-mailadres
                          <input name="email" type="email" required defaultValue={f.klantEmail} className={invoer} />
                        </label>
                        <label className="block text-xs font-semibold">
                          Bedrijfsnaam
                          <input name="bedrijf" defaultValue={f.klantBedrijf ?? ""} className={invoer} />
                        </label>
                        <label className="block text-xs font-semibold">
                          Adres
                          <textarea name="adres" rows={2} defaultValue={f.klantAdres ?? ""} className={invoer} />
                        </label>
                        <label className="block text-xs font-semibold">
                          KvK
                          <input name="kvk" defaultValue={f.klantKvk ?? ""} className={invoer} />
                        </label>
                        <label className="block text-xs font-semibold">
                          Btw-nr
                          <input name="btw" defaultValue={f.klantBtw ?? ""} className={invoer} />
                        </label>
                        <div className="sm:col-span-2">
                          <ActieKnop label="Corrigeer: credit + herziene factuur mailen" bezigLabel="Bezig..." className={knopRand} />
                          <p className="mt-1 text-xs text-stone-400">
                            De bedragen blijven gelijk en er wordt niets terugbetaald — alleen de gegevens op de factuur worden rechtgezet.
                          </p>
                        </div>
                      </form>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 4. Betalingen */}
      {betaalHistorie.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-stone-700">Alle betalingen ({betaalHistorie.length})</summary>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {betaalHistorie.map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span>
                  {b.aangemaakt.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })} ·{" "}
                  {b.soort === "eerste" ? "eerste betaling" : b.soort === "los" ? `losse opdracht${b.omschrijving ? `: ${b.omschrijving}` : ""}` : "maandincasso"}
                </span>
                <span>
                  {euroTekst(b.bedragCent)} ·{" "}
                  <strong className={b.status === "paid" ? "text-emerald-700" : ["failed", "expired", "canceled"].includes(b.status) ? "text-red-700" : "text-stone-500"}>
                    {BETAALSTATUS[b.status] ?? b.status}
                  </strong>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-stone-400">
            Een open of verlopen betaling betekent meestal dat de klant het betaalscherm opende maar niet afrondde. De betaallink zelf blijft werken.
          </p>
        </details>
      )}
    </div>
  );
}
