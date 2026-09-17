import { and, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sites, whatsappKoppelingen } from "@/db/schema";
import ActieKnop from "@/app/admin/klant/[id]/ActieKnop";
import { maakWhatsappCode, ontkoppelWhatsapp } from "./acties";

/** Toont "Stuur je website een appje": koppelcode aanmaken en gekoppelde
 * nummers beheren. Alleen zichtbaar als WhatsApp voor deze site aan staat. */
export default async function WhatsappBlok({ siteId }: { siteId: number }) {
  const [site] = await db
    .select({ actief: sites.whatsappActief })
    .from(sites)
    .where(eq(sites.id, siteId));
  if (!site?.actief) return null;
  const { userId } = await auth();
  const nummer = (process.env.WHATSAPP_WEERGAVE_NUMMER ?? "").replace(/\D/g, "");

  const gekoppeld = await db
    .select()
    .from(whatsappKoppelingen)
    .where(and(eq(whatsappKoppelingen.siteId, siteId), isNotNull(whatsappKoppelingen.telefoon)))
    .orderBy(desc(whatsappKoppelingen.id));
  const [open] = userId
    ? await db
        .select()
        .from(whatsappKoppelingen)
        .where(
          and(
            eq(whatsappKoppelingen.siteId, siteId),
            eq(whatsappKoppelingen.clerkUserId, userId),
            isNull(whatsappKoppelingen.telefoon),
            gt(whatsappKoppelingen.codeVerloopt, new Date()),
          ),
        )
        .orderBy(desc(whatsappKoppelingen.id))
        .limit(1)
    : [];

  const tekst = open ? `KOPPEL ${open.koppelcode}` : "";
  const toonNummer = nummer ? `+${nummer}` : "het WordSwap-nummer";

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

      {gekoppeld.length > 0 && (
        <ul className="mt-4 space-y-2">
          {gekoppeld.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-emerald-900">
                ✓ +{k.telefoon!.slice(0, 2)} •••• {k.telefoon!.slice(-4)}
              </span>
              <form action={ontkoppelWhatsapp}>
                <input type="hidden" name="siteId" value={siteId} />
                <input type="hidden" name="koppelingId" value={k.id} />
                <ActieKnop
                  label="Ontkoppelen"
                  bezigLabel="Bezig..."
                  className="text-xs font-medium text-stone-500 hover:text-red-600 cursor-pointer"
                />
              </form>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
          <p>
            Stuur dit bericht vanaf je eigen telefoon naar <strong>{toonNummer}</strong>:
          </p>
          <p className="mt-2 font-mono text-lg font-semibold tracking-wider">{tekst}</p>
          {nummer && (
            <a
              href={`https://wa.me/${nummer}?text=${encodeURIComponent(tekst)}`}
              className="mt-3 inline-block rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              Open WhatsApp
            </a>
          )}
          <p className="mt-2 text-xs text-violet-700">
            De code is 30 minuten geldig.
          </p>
          <form action={maakWhatsappCode} className="mt-2">
            <input type="hidden" name="siteId" value={siteId} />
            <ActieKnop
              label="Nieuwe code maken"
              bezigLabel="Code maken..."
              className="text-xs font-semibold text-violet-800 underline underline-offset-2 hover:text-violet-600 cursor-pointer"
            />
          </form>
        </div>
      ) : (
        <form action={maakWhatsappCode} className="mt-4">
          <input type="hidden" name="siteId" value={siteId} />
          <ActieKnop
            label={gekoppeld.length ? "Nog een telefoon koppelen" : "Koppel mijn telefoon"}
            bezigLabel="Code maken..."
            className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
          />
        </form>
      )}
    </div>
  );
}
