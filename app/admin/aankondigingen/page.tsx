import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { aankondigingen, aankondigingenGezien, sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { gezienOverzicht } from "@/lib/aankondiging-gezien";
import Voorbeeld from "./Voorbeeld";
import ActieKnop from "../klant/[id]/ActieKnop";
import { aankondigingBewerken, aankondigingBijwerken, aankondigingPlaatsen } from "../acties";

export const metadata: Metadata = { title: "Aankondigingen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

export default async function Aankondigingen() {
  const admin = await requireAdmin();
  const lijst = await db.select().from(aankondigingen).orderBy(desc(aankondigingen.id));
  const [siteRijen, gezienRijen] = await Promise.all([
    db.select({ naam: sites.naam, clerkUserId: sites.clerkUserId, isDemo: sites.isDemo, githubRepo: sites.githubRepo }).from(sites),
    db.select({ aankondigingId: aankondigingenGezien.aankondigingId, clerkUserId: aankondigingenGezien.clerkUserId }).from(aankondigingenGezien),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">← Alle klanten</Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Aankondigingen</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Een aankondiging verschijnt bovenaan het portaal bij alle ingelogde klanten, tot ze hem wegklikken
        (dat wordt per account onthouden). Bij elke aankondiging zie je wie hem al gezien heeft; heeft iedereen
        hem gezien, dan kan hij weg. Met Voorbeeld zie je hem zoals de klant, ook als je hem zelf al wegklikte.
      </p>
      <form action={aankondigingPlaatsen} className="mt-8 rounded-3xl border-2 border-violet-200 bg-violet-50/40 p-6 grid gap-3">
        <h2 className="font-display text-xl font-semibold">Nieuwe aankondiging</h2>
        <label className="block text-sm font-semibold">Titel<input name="titel" required maxLength={120} placeholder="Nieuw: laat de AI zelf kijken" className={invoerStijl} /></label>
        <label className="block text-sm font-semibold">Tekst<textarea name="tekst" required rows={5} maxLength={1000} placeholder="Klopt een wijziging niet? Klik onder het antwoord op 'Klopt het niet? Laat de AI zelf kijken'…" className={invoerStijl} /></label>
        <label className="block text-sm font-semibold">Link (optioneel)<input name="link" type="url" placeholder="https://wordswap.nl/…" className={invoerStijl} /></label>
        <div><ActieKnop label="Plaatsen" bezigLabel="Plaatsen..." klaarLabel="✓ Geplaatst" className="rounded-full bg-violet-700 px-6 py-2.5 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer" /></div>
      </form>
      <div className="mt-8 space-y-3">
        {lijst.length === 0 && <p className="text-stone-500">Nog geen aankondigingen.</p>}
        {lijst.map((a) => {
          const g = gezienOverzicht(siteRijen, gezienRijen, a.id, admin.id);
          const iedereen = g.totaal > 0 && g.nietGezien.length === 0;
          return (
          <div key={a.id} className={`rounded-3xl border p-5 ${a.actief ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50 opacity-70"}`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.titel}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{a.tekst}</p>
                {a.link && <a href={a.link} className="mt-1 inline-block text-sm text-violet-700 hover:underline" target="_blank" rel="noopener">{a.link}</a>}
                <p className="mt-1 text-xs text-stone-400">{a.aangemaakt.toLocaleString("nl-NL")} · {a.actief ? "zichtbaar" : "uit"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-stone-700">
                    Gezien door {g.gezien.length} van {g.totaal} klant{g.totaal === 1 ? "" : "en"}
                  </span>
                  {iedereen && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      Iedereen heeft hem gezien: kan weg
                    </span>
                  )}
                </div>
                {g.totaal > 0 && (
                  <details className="mt-1 text-sm text-stone-600">
                    <summary className="cursor-pointer text-violet-700 hover:underline">Wie wel en wie niet</summary>
                    {g.nietGezien.length > 0 && <p className="mt-2"><strong>Nog niet:</strong> {g.nietGezien.join(" · ")}</p>}
                    {g.gezien.length > 0 && <p className="mt-1"><strong>Wel:</strong> {g.gezien.join(" · ")}</p>}
                    <p className="mt-1 text-xs text-stone-500">Wie niet inlogt, ziet hem nooit: er gaat geen mail mee.</p>
                  </details>
                )}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-violet-700 hover:underline">Bewerken</summary>
                  <form action={aankondigingBewerken} className="mt-3 grid gap-3">
                    <input type="hidden" name="id" value={a.id} />
                    <label className="block text-sm font-semibold">Titel<input name="titel" required maxLength={120} defaultValue={a.titel} className={invoerStijl} /></label>
                    <label className="block text-sm font-semibold">Tekst<textarea name="tekst" required rows={8} maxLength={1000} defaultValue={a.tekst} className={invoerStijl} /></label>
                    <label className="block text-sm font-semibold">Link (optioneel)<input name="link" type="url" defaultValue={a.link ?? ""} className={invoerStijl} /></label>
                    <p className="text-xs text-stone-500">Wie hem al wegklikte, krijgt hem niet opnieuw te zien.</p>
                    <div><ActieKnop label="Opslaan" bezigLabel="Opslaan..." klaarLabel="✓ Opgeslagen" className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer" /></div>
                  </form>
                </details>
              </div>
              <div className="flex gap-2">
                <Voorbeeld a={{ id: a.id, titel: a.titel, tekst: a.tekst, link: a.link }} />
                <form action={aankondigingBijwerken}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="actie" value={a.actief ? "uit" : "aan"} />
                  <ActieKnop label={a.actief ? "Uitzetten" : "Aanzetten"} bezigLabel="…" klaarLabel="✓" className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-violet-400 cursor-pointer" />
                </form>
                <form action={aankondigingBijwerken}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="actie" value="verwijder" />
                  <ActieKnop label="Verwijderen" bezigLabel="…" klaarLabel="✓" className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer" />
                </form>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
