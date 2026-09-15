import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { abonnementen, wpBackups } from "@/db/schema";
import ActieKnop from "@/app/admin/klant/[id]/ActieKnop";
import { zegAbonnementOp } from "./acties";

/** Alles zelf meenemen (website en gegevens) en zelf opzeggen: geen lock-in, ook in de praktijk. */
export default async function MeenemenBlok({ siteId }: { siteId: number }) {
  const [abo] = await db.select().from(abonnementen).where(eq(abonnementen.siteId, siteId)).catch(() => []);
  const opgezegd = abo?.status === "gestopt";
  const backups = await db
    .select()
    .from(wpBackups)
    .where(eq(wpBackups.siteId, siteId))
    .orderBy(desc(wpBackups.id))
    .catch(() => []);

  return (
    <div id="meenemen" className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="font-display text-lg font-semibold">📦 Je website en gegevens meenemen</h3>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">
        Alles is van jou. Je kunt het op elk moment downloaden, ook als je gewoon blijft.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`/api/portal/meenemen/website?siteId=${siteId}`}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-emerald-600 hover:text-emerald-800"
        >
          ⬇ Websitebestanden (zip)
        </a>
        <a
          href={`/api/portal/meenemen/gegevens?siteId=${siteId}`}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-emerald-600 hover:text-emerald-800"
        >
          ⬇ Formulierberichten, chats en facturen (zip)
        </a>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        De websitebestanden zijn gewone webpagina&apos;s, foto&apos;s en opmaak: je kunt ze bij elke hostingpartij neerzetten.
      </p>
      {backups.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#dde7d9] bg-[#f6f9f2] p-4">
          <p className="text-sm font-semibold text-stone-800">🛟 Je oude WordPress-site (terugweg-garantie)</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            De complete kopie van je WordPress-site van vóór de overstap. Wil je ooit terug, dan heb je hiermee alles;
            wij helpen je desgewenst met terugzetten.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {backups.map((b) => (
              <li key={b.id}>
                <a
                  href={`/api/portal/meenemen/wordpress?siteId=${siteId}&id=${b.id}`}
                  className="font-semibold text-emerald-800 hover:underline"
                >
                  ⬇ {b.bestandsnaam}
                </a>{" "}
                <span className="text-xs text-stone-500">
                  {b.grootteBytes ? `${Math.round(b.grootteBytes / (1024 * 1024))} MB · ` : ""}
                  {b.aangemaakt.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}
                  {b.omschrijving && <> · {b.omschrijving}</>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-4 border-t border-stone-100 pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-stone-600">Abonnement opzeggen</summary>
        {opgezegd ? (
          <p className="mt-2 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
            Je abonnement is opgezegd; er wordt niets meer afgeschreven. Jos neemt contact met je op over wat er met je website
            gebeurt. Je bestanden kun je hierboven nog steeds downloaden.
          </p>
        ) : (
          <form action={zegAbonnementOp} className="mt-3 space-y-3 text-sm text-stone-700">
            <input type="hidden" name="siteId" value={siteId} />
            <div className="space-y-1.5 leading-relaxed text-stone-600">
              <p>Opzeggen kan per maand. Dit gebeurt er dan:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>De automatische afschrijving stopt per direct.</li>
                <li>
                  Je website blijft online tot het einde van de periode waarvoor je betaald hebt, <strong>plus één maand
                  extra</strong> — zo heb je nooit tijdsdruk bij een verhuizing.
                </li>
                <li>
                  Je domeinnaam staat bij TransIP op <strong>jouw eigen naam</strong>: jij (of je nieuwe webbouwer) kunt hem
                  altijd verhuizen, ook zonder ons. Je krijgt van ons een overzicht van je domeininstellingen mee, zodat ook je
                  e-mail gewoon blijft werken.
                </li>
                <li>Downloaden van je bestanden en gegevens (hierboven) kan tot alles is afgerond.</li>
              </ul>
              <p>
                <strong>Tip:</strong> download eerst je bestanden hierboven.
              </p>
            </div>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="bevestig" required className="mt-1 accent-emerald-700" />
              Ja, ik wil mijn WordSwap-abonnement opzeggen.
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="verwijderen" className="mt-1 accent-emerald-700" />
              Verwijder daarna ook mijn account en gegevens. Dat gebeurt binnen drie maanden; facturen bewaren we wettelijk zeven jaar.
            </label>
            <ActieKnop
              label="Opzegging versturen"
              bezigLabel="Versturen..."
              klaarLabel="✓ Ontvangen"
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
            />
          </form>
        )}
      </details>
    </div>
  );
}
