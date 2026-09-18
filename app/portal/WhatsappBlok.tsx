import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { sites, whatsappKoppelingen } from "@/db/schema";
import { toonNummer } from "@/lib/whatsapp/berichten";
import { formulierInzendingen } from "@/db/schema";
import ActieKnop from "@/app/admin/klant/[id]/ActieKnop";
import { vraagWhatsappNummerAan } from "./acties";

/** Toont "Stuur je website een appje": welke telefoons gekoppeld zijn en hoe
 * je begint. WordSwap zet de nummers vast (in de admin), zodat alleen de
 * telefoon van de eigenaar bij zijn website kan. */
export default async function WhatsappBlok({ siteId }: { siteId: number }) {
  const [site] = await db
    .select({ actief: sites.whatsappActief })
    .from(sites)
    .where(eq(sites.id, siteId));
  if (!site?.actief) return null;
  const nummer = (process.env.WHATSAPP_WEERGAVE_NUMMER ?? "").replace(/\D/g, "");

  // Al een nummer doorgegeven dat nog niet gekoppeld is?
  const aangevraagd = (
    await db
      .select({ velden: formulierInzendingen.velden })
      .from(formulierInzendingen)
      .where(
        and(
          eq(formulierInzendingen.formulier, "whatsapp-nummer"),
          eq(formulierInzendingen.gearchiveerd, false),
        ),
      )
      .catch(() => [])
  ).some((r) => (r.velden as Record<string, string>).siteId === String(siteId));

  const gekoppeld = await db
    .select()
    .from(whatsappKoppelingen)
    .where(and(eq(whatsappKoppelingen.siteId, siteId), isNotNull(whatsappKoppelingen.telefoon)))
    .orderBy(desc(whatsappKoppelingen.id));

  return (
    <div className="min-w-0 rounded-3xl border border-stone-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold">Stuur je website een appje</h3>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          beta
        </span>
      </div>
      <p className="mt-2 text-sm text-stone-600">
        App wat er anders moet: een tekst, foto&apos;s of een spraakbericht. Je krijgt een
        link naar het concept terug en zet het met één tik live. Niets gaat online zonder die tik.
      </p>

      {gekoppeld.length > 0 ? (
        <>
          <ul className="mt-4 space-y-2">
            {gekoppeld.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900"
              >
                <span className="font-medium">✓ {toonNummer(k.telefoon)}</span>
                {k.omschrijving && <span className="text-xs text-emerald-800">{k.omschrijving}</span>}
              </li>
            ))}
          </ul>
          {nummer && (
            <a
              href={`https://wa.me/${nummer}?text=${encodeURIComponent("Hoi!")}`}
              className="mt-4 inline-block rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Open WhatsApp
            </a>
          )}
          <p className="mt-2 text-xs text-stone-500">
            Alleen deze telefoons kunnen je website aansturen. Wil je er een toevoegen of een
            nummer eraf halen? Laat het ons even weten.
          </p>
        </>
      ) : aangevraagd ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ✓ Je nummer is doorgegeven. Wij zetten het klaar en laten het je weten; daarna kun je
          meteen appen.
        </p>
      ) : (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
          <p>
            Er is nog geen telefoon gekoppeld. Geef je mobiele nummer door, dan zetten wij het voor
            je klaar. Zo weten we zeker dat alleen jouw telefoon bij je website kan.
          </p>
          <form action={vraagWhatsappNummerAan} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="siteId" value={siteId} />
            <label className="block text-sm font-semibold text-stone-700">
              Mobiel nummer <span className="font-normal text-stone-500">(met landcode)</span>
              <input
                name="nummer"
                placeholder="+31 6 12 34 56 78"
                className="mt-1 block w-56 rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <ActieKnop
              label="Geef mijn nummer door"
              bezigLabel="Doorgeven..."
              klaarLabel="✓ Doorgegeven"
              className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
            />
          </form>
          <p className="mt-2 text-xs text-stone-500">
            Begin met + en je landcode (in Nederland +31), dan weten we zeker dat we de juiste
            telefoon koppelen.
          </p>
        </div>
      )}

      <details className="mt-3 text-sm text-stone-600">
        <summary className="cursor-pointer font-semibold text-violet-700 hover:text-violet-600">
          Hoe werkt het, en wat betekent beta?
        </summary>
        <div className="mt-2 space-y-2">
          <p>
            <strong>Zo gaat het:</strong> je stuurt een appje naar het WordSwap-nummer, bijvoorbeeld
            &quot;zet bij openingstijden dat we zaterdag dicht zijn&quot;. Je krijgt een link naar
            het concept terug, plus de knoppen Publiceren en Weggooien. Pas als jij op Publiceren
            tikt, staat het op je website.
          </p>
          <p>
            <strong>Wat kan er mee:</strong> tekst, foto&apos;s en spraakberichten (die worden voor
            je uitgeschreven). Pdf&apos;s en video&apos;s kunnen nog niet via WhatsApp; die stuur je
            mee in de chat hier in het portaal.
          </p>
          <p>
            <strong>Veilig:</strong> alleen de telefoons hierboven komen binnen. Appt een ander
            nummer, dan gebeurt er niets en krijgt WordSwap een seintje.
          </p>
          <p>
            <strong>Waarom beta:</strong> dit is nieuw. Het werkt, maar een antwoord kan er soms
            naast zitten. Daarom kijken wij mee hoe het gaat, en vraagt je website af en toe of het
            antwoord klopte. Met &quot;Nee, klopt niet&quot; help je ons het beter te maken.
          </p>
          <p>
            <strong>Belangrijk:</strong> bekijk het concept altijd even vóór je publiceert. Is het
            niet goed, app dan gewoon wat er anders moet, of kies Weggooien. Je website blijft dan
            precies zoals hij was.
          </p>
        </div>
      </details>
    </div>
  );
}
