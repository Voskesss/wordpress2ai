import ActieKnop from "@/app/admin/klant/[id]/ActieKnop";
import AchterWaas from "./AchterWaas";
import { bewaarEigenMailserver, testEigenMailserver } from "./acties";

/**
 * De klant zijn eigen mailbox laten gebruiken voor de berichten van zijn site.
 *
 * Waarom dit in het portaal staat en niet alleen in de admin: het zijn zíjn
 * inloggegevens, en als hij het wachtwoord van zijn mailbox wijzigt moet hij
 * het hier zelf kunnen bijwerken zonder op ons te wachten. Net als bij DNS
 * geldt: kun je het, dan mag je het; twijfel je, vraag het ons.
 *
 * De testknop staat er bewust naast en niet ergens anders. Zonder testen vul
 * je iets verkeerds in, zie je niets gebeuren, en gaat je mail maandenlang
 * stilletjes via ons in plaats van via jezelf.
 */
export default function EigenMailserver({
  siteId,
  smtpHost,
  smtpPoort,
  smtpGebruiker,
  smtpAfzender,
  smtpIngesteld,
  smtpFoutOp,
  smtpFoutTekst,
  eigenAdres,
}: {
  siteId: number;
  smtpHost: string | null;
  smtpPoort: number | null;
  smtpGebruiker: string | null;
  smtpAfzender: string | null;
  smtpIngesteld: boolean;
  smtpFoutOp: Date | null;
  smtpFoutTekst: string | null;
  eigenAdres?: string | null;
}) {
  const veld =
    "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none";

  return (
    <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-semibold">E-mail vanaf je eigen adres</h2>
        {smtpHost ? (
          smtpFoutOp ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
              werkt nu niet
            </span>
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              actief
            </span>
          )
        ) : (
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-500">
            standaard
          </span>
        )}
      </div>

      {smtpFoutOp && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Je mailserver accepteert op dit moment geen berichten.</strong>
          <div className="mt-1">{smtpFoutTekst}</div>
          <div className="mt-2 text-red-700">
            Je bezoekers merken hier niets van: berichten komen gewoon aan, maar ze worden
            voorlopig door ons verstuurd in plaats van vanaf jouw adres. Werk je gegevens
            hieronder bij en druk op Uitproberen. Kom je er niet uit, laat het ons weten.
          </div>
        </div>
      )}

      <p className="mt-2 text-sm text-stone-600">
        {smtpHost ? (
          <>
            De berichten van je website gaan uit vanaf{" "}
            <strong>{smtpAfzender || smtpGebruiker}</strong>, via je eigen mailbox.
          </>
        ) : (
          <>
            Nu versturen wij de berichten van je website voor je. Wil je dat ze vanaf je
            eigen adres komen, vul dan de gegevens van je mailbox in. Die vind je bij je
            mailprovider onder SMTP of uitgaande mail.
          </>
        )}
      </p>
      <AchterWaas
        knop="Ja, ik wijzig mijn mailserver zelf"
        waarschuwing={
          <>
            Hier kun je iets stukmaken zonder het te merken: vul je iets verkeerds in, dan
            blijft je mail aankomen, alleen niet meer vanaf jouw adres. Weet je precies wat
            deze gegevens zijn, ga gerust je gang. Weet je het niet zeker, neem dan even
            contact met ons op; wij zetten het zo voor je klaar.
          </>
        }
      >
        <form action={bewaarEigenMailserver} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="siteId" value={siteId} />
          <label className="block text-sm font-semibold">
            Server voor uitgaande mail
            <input name="host" defaultValue={smtpHost ?? ""} placeholder="smtp.jouwprovider.nl" className={veld} />
            <span className="mt-1 block text-xs font-normal text-stone-500">Leeg laten en opslaan: wij versturen het weer voor je.</span>
          </label>
          <label className="block text-sm font-semibold">
            Poort
            <input name="poort" type="number" defaultValue={smtpPoort ?? 465} className={veld} />
            <span className="mt-1 block text-xs font-normal text-stone-500">Meestal 465, soms 587.</span>
          </label>
          <label className="block text-sm font-semibold">
            Gebruikersnaam
            <input name="gebruiker" defaultValue={smtpGebruiker ?? ""} placeholder="info@jouwdomein.nl" className={veld} />
            <span className="mt-1 block text-xs font-normal text-stone-500">Meestal je volledige e-mailadres.</span>
          </label>
          <label className="block text-sm font-semibold">
            Wachtwoord{" "}
            {smtpIngesteld && (
              <span className="font-normal text-stone-400">(staat ingevuld, alleen invullen om te wijzigen)</span>
            )}
            <input name="wachtwoord" type="password" autoComplete="off" placeholder={smtpIngesteld ? "ongewijzigd laten" : ""} className={veld} />
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Wordt versleuteld opgeslagen en nooit teruggetoond, ook niet aan ons.
            </span>
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">
            Afzenderadres (mag leeg)
            <input name="afzender" defaultValue={smtpAfzender ?? ""} placeholder="noreply@jouwdomein.nl" className={veld} />
            <span className="mt-1 block text-xs font-normal text-stone-500">Leeg laten: dan gebruiken we je gebruikersnaam.</span>
          </label>
          <div className="sm:col-span-2">
            <ActieKnop
              label="Opslaan"
              bezigLabel="Opslaan..."
              className="cursor-pointer rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600"
            />
          </div>
        </form>

        {smtpHost && (
          <form action={testEigenMailserver} className="mt-4 flex flex-wrap items-end gap-3 border-t border-stone-100 pt-4">
            <input type="hidden" name="siteId" value={siteId} />
            <label className="block text-sm font-semibold">
              Stuur een testbericht naar
              <input name="testAdres" type="email" defaultValue={eigenAdres ?? ""} placeholder="jij@jouwdomein.nl" className={veld} />
              <span className="mt-1 block text-xs font-normal text-stone-500">
                Komt hij aan, dan werkt het. Doe dit altijd na een wijziging.
              </span>
            </label>
            <ActieKnop
              label="Uitproberen"
              bezigLabel="Bezig met verbinden..."
              className="cursor-pointer rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            />
          </form>
        )}
      </AchterWaas>
    </section>
  );
}
