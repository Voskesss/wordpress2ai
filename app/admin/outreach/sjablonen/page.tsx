import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { mailSjablonen } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { standaardSjabloon } from "@/lib/outreach";
import ActieKnop from "../../klant/[id]/ActieKnop";
import MailBewerker from "../MailBewerker";
import { sjabloonActie, sjabloonOpslaan } from "../../acties";

export const metadata: Metadata = {
  title: "Mailsjablonen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

const mailNamen: Record<number, string> = {
  1: "Mail 1 — eerste contact",
  2: "Mail 2 — kostenvraag",
  3: "Mail 3 — nette afsluiter",
};

export default async function Sjablonen() {
  await requireAdmin();
  const alle = await db.select().from(mailSjablonen).orderBy(asc(mailSjablonen.nummer), asc(mailSjablonen.id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin/outreach" className="text-sm text-stone-500 hover:text-violet-700">
        ← Outreach
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Mailsjablonen</h1>
      <p className="mt-3 text-stone-600 leading-relaxed">
        De basisteksten van de drie outreach-mails. Per mail kun je meerdere
        versies bewaren; de versie met het vinkje wordt gebruikt. Geen actieve
        versie = de ingebouwde standaardtekst. Bij elke prospect wordt
        onthouden met welke versie mail 1 is verstuurd, zodat je later ziet
        welke versie de meeste reacties oplevert.
      </p>
      <p className="mt-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 text-sm text-violet-900">
        Invulvelden die je in de tekst mag gebruiken:{" "}
        <code className="font-mono">{"{{bedrijf}}"}</code>,{" "}
        <code className="font-mono">{"{{website}}"}</code>,{" "}
        <code className="font-mono">{"{{observatie}}"}</code> (jouw notitie),{" "}
        <code className="font-mono">{"{{opening}}"}</code> (de automatische
        constatering: traag / kapot / verouderd),{" "}
        <code className="font-mono">{"{{prijsregel}}"}</code> (het prijsvoorstel
        of &quot;eenmalig, vanaf €150&quot;) en{" "}
        <code className="font-mono">{"{{prijs}}"}</code>. De groet en de
        afmeldknop komen er automatisch onder — die hoef je niet te typen.
      </p>

      {[1, 2, 3].map((nr) => {
        const versies = alle.filter((s) => s.nummer === nr);
        const standaard = standaardSjabloon(nr as 1 | 2 | 3);
        const heeftActief = versies.some((v) => v.actief);
        return (
          <section key={nr} className="mt-10">
            <h2 className="font-display text-2xl font-semibold">{mailNamen[nr]}</h2>
            {!heeftActief && (
              <p className="mt-1 text-sm text-stone-500">
                Nu in gebruik: de ingebouwde standaardtekst (hieronder als
                startpunt ingevuld).
              </p>
            )}

            {versies.map((v) => (
              <details key={v.id} className={`mt-3 rounded-3xl border p-5 ${v.actief ? "border-emerald-300 bg-emerald-50/40" : "border-stone-200 bg-white"}`}>
                <summary className="cursor-pointer font-semibold">
                  {v.actief ? "✅ " : ""}{v.naam}
                  {v.actief && <span className="ml-2 text-xs font-normal text-emerald-700">— deze wordt gebruikt</span>}
                </summary>
                <form action={sjabloonOpslaan} className="mt-4 grid gap-3">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="nummer" value={nr} />
                  <label className="block text-sm font-semibold">
                    Naam van deze versie
                    <input name="naam" defaultValue={v.naam} required className={invoerStijl} />
                  </label>
                  <MailBewerker beginOnderwerp={v.onderwerp} beginTekst={v.tekst} sjabloon />
                  <div className="flex flex-wrap gap-2">
                    <ActieKnop label="Opslaan" bezigLabel="Opslaan..." className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer" />
                  </div>
                </form>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!v.actief && (
                    <form action={sjabloonActie}>
                      <input type="hidden" name="id" value={v.id} />
                      <ActieKnop label="Gebruik deze versie" bezigLabel="..." className="rounded-full border border-emerald-300 px-4 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer" />
                    </form>
                  )}
                  {v.actief && (
                    <form action={sjabloonActie}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="deactiveer" value="1" />
                      <ActieKnop label="Terug naar de standaardtekst" bezigLabel="..." className="rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-600 hover:border-stone-400 cursor-pointer" />
                    </form>
                  )}
                  <form action={sjabloonActie}>
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="verwijder" value="1" />
                    <ActieKnop label="Verwijderen" bezigLabel="..." className="text-xs text-red-500 hover:text-red-700 cursor-pointer" />
                  </form>
                </div>
              </details>
            ))}

            <details className="mt-3 rounded-3xl border-2 border-dashed border-stone-300 p-5">
              <summary className="cursor-pointer font-semibold text-stone-600">
                ＋ Nieuwe versie maken
              </summary>
              <form action={sjabloonOpslaan} className="mt-4 grid gap-3">
                <input type="hidden" name="nummer" value={nr} />
                <input type="hidden" name="activeren" value="1" />
                <label className="block text-sm font-semibold">
                  Naam van deze versie
                  <input name="naam" placeholder={`bv. "versie B — korter"`} required className={invoerStijl} />
                </label>
                <MailBewerker beginOnderwerp={standaard.onderwerp} beginTekst={standaard.tekst} sjabloon />
                <div>
                  <ActieKnop label="Opslaan en meteen gebruiken" bezigLabel="Opslaan..." className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer" />
                </div>
              </form>
            </details>
          </section>
        );
      })}
    </div>
  );
}
