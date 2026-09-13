import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { aankondigingen } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import ActieKnop from "../klant/[id]/ActieKnop";
import { aankondigingBijwerken, aankondigingPlaatsen } from "../acties";

export const metadata: Metadata = { title: "Aankondigingen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

export default async function Aankondigingen() {
  await requireAdmin();
  const lijst = await db.select().from(aankondigingen).orderBy(desc(aankondigingen.id));
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">← Alle klanten</Link>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">Aankondigingen</h1>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Een aankondiging verschijnt bovenaan het portaal bij alle ingelogde klanten, tot ze hem wegklikken
        (dat onthoudt hun browser). Zet hem uit als hij niet meer geldt.
      </p>
      <form action={aankondigingPlaatsen} className="mt-8 rounded-3xl border-2 border-violet-200 bg-violet-50/40 p-6 grid gap-3">
        <h2 className="font-display text-xl font-semibold">Nieuwe aankondiging</h2>
        <label className="block text-sm font-semibold">Titel<input name="titel" required maxLength={120} placeholder="Nieuw: laat de AI zelf kijken" className={invoerStijl} /></label>
        <label className="block text-sm font-semibold">Tekst<textarea name="tekst" required rows={3} maxLength={1000} placeholder="Klopt een wijziging niet? Klik onder het antwoord op 'Klopt het niet? Laat de AI zelf kijken'…" className={invoerStijl} /></label>
        <label className="block text-sm font-semibold">Link (optioneel)<input name="link" type="url" placeholder="https://wordswap.nl/…" className={invoerStijl} /></label>
        <div><ActieKnop label="Plaatsen" bezigLabel="Plaatsen..." klaarLabel="✓ Geplaatst" className="rounded-full bg-violet-700 px-6 py-2.5 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer" /></div>
      </form>
      <div className="mt-8 space-y-3">
        {lijst.length === 0 && <p className="text-stone-500">Nog geen aankondigingen.</p>}
        {lijst.map((a) => (
          <div key={a.id} className={`rounded-3xl border p-5 ${a.actief ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50 opacity-70"}`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.titel}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{a.tekst}</p>
                {a.link && <a href={a.link} className="mt-1 inline-block text-sm text-violet-700 hover:underline" target="_blank" rel="noopener">{a.link}</a>}
                <p className="mt-1 text-xs text-stone-400">{a.aangemaakt.toLocaleString("nl-NL")} · {a.actief ? "zichtbaar" : "uit"}</p>
              </div>
              <div className="flex gap-2">
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
        ))}
      </div>
    </div>
  );
}
