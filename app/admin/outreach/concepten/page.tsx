import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { prospectMails, prospects } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import ActieKnop from "../../klant/[id]/ActieKnop";
import { prospectMailOpslaan, verstuurOutreach } from "../../acties";
import ConceptenKnop from "../ConceptenKnop";
import MailBewerker from "../MailBewerker";

export const metadata: Metadata = {
  title: "Concepten",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** De concepten-werkbank: alle nieuwe prospects met hun klaargezette mail 1
 * onder elkaar — nalezen, bijsturen, versturen. Eén taak per pagina. */
export default async function Concepten() {
  await requireAdmin();
  const nieuwe = (
    await db.select().from(prospects).where(eq(prospects.status, "nieuw")).orderBy(asc(prospects.id))
  ).filter((p) => p.email.includes("@"));
  const concepten = await db.select().from(prospectMails).where(eq(prospectMails.nummer, 1));
  const conceptVoor = (id: number) => concepten.find((c) => c.prospectId === id) ?? null;
  const klaar = nieuwe.filter((p) => conceptVoor(p.id));
  const zonder = nieuwe.filter((p) => !conceptVoor(p.id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin/outreach" className="text-sm text-stone-500 hover:text-violet-700">
        ← Outreach
      </Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">✍️ Concepten</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Hier staan de klaargezette eerste mails voor je nieuwe prospects. Lees
        na, stuur bij (zelf typen of een AI-aanwijzing geven) en verstuur — of
        sla er een over. Er gaat nooit iets automatisch de deur uit.
      </p>

      <ConceptenKnop aantalNieuw={zonder.length} />

      {nieuwe.length === 0 && (
        <p className="mt-8 text-stone-500">
          Geen nieuwe prospects met een e-mailadres — voeg er eerst een paar toe
          via <Link href="/admin/outreach" className="text-violet-700 hover:underline">Outreach</Link>.
        </p>
      )}

      <div className="mt-8 space-y-6">
        {klaar.map((p) => {
          const c = conceptVoor(p.id)!;
          return (
            <div key={p.id} className="rounded-3xl border-2 border-violet-200 bg-white p-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {p.bedrijf}{" "}
                    <a
                      href={`https://${p.website.replace(/^https?:\/\//, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-sm font-normal text-violet-700 hover:underline"
                    >
                      {p.website} ↗
                    </a>
                  </p>
                  <p className="text-sm text-stone-500 break-all">{p.email}</p>
                </div>
                {p.prijs && (
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                    prijs in mail: {p.prijs}
                  </span>
                )}
              </div>

              {(p.kenmerken || p.observatie) && (
                <p className="mt-3 rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2 text-xs text-stone-600">
                  <strong>Waarnemingen:</strong>{" "}
                  {[p.observatie, p.kenmerken].filter(Boolean).join(" · ")}
                </p>
              )}

              <form action={prospectMailOpslaan} className="mt-4 grid gap-2">
                <input type="hidden" name="prospectId" value={p.id} />
                <input type="hidden" name="nummer" value="1" />
                <MailBewerker
                  beginOnderwerp={c.onderwerp}
                  beginTekst={c.tekst}
                  bedrijf={p.bedrijf}
                  website={p.website}
                  observatie={p.observatie}
                />
                <div>
                  <ActieKnop
                    label="💾 Bewaar wijzigingen"
                    bezigLabel="Opslaan..."
                    className="rounded-full border border-violet-300 px-4 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 cursor-pointer"
                  />
                </div>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                <form action={verstuurOutreach}>
                  <input type="hidden" name="id" value={p.id} />
                  <ActieKnop
                    label="📤 Verstuur mail 1"
                    bezigLabel="Versturen..."
                    className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
                  />
                </form>
                <p className="text-xs text-stone-400">
                  Let op: versturen gebruikt de <em>bewaarde</em> versie —
                  eerst opslaan als je iets hebt aangepast.
                </p>
              </div>
            </div>
          );
        })}

        {zonder.length > 0 && (
          <div className="rounded-3xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">
            Nog zonder concept:{" "}
            {zonder.map((p) => p.bedrijf).join(", ")} — klik hierboven op
            &ldquo;Zet concepten klaar&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
