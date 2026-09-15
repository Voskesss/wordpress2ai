import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { betaalverzoeken } from "@/db/schema";
import { euroTekst, inclBtwCent } from "@/lib/mollie";

export const metadata: Metadata = {
  title: "Betalen aan WordSwap",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Betalen({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ fout?: string }>;
}) {
  const { token } = await params;
  const { fout } = await searchParams;
  const [v] = await db.select().from(betaalverzoeken).where(eq(betaalverzoeken.token, token));
  if (!v || v.wijze !== "link") notFound();
  const incl = inclBtwCent(v.bedragExclCent);

  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <p className="eyebrow">BETALEN AAN WORDSWAP</p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">{v.omschrijving}</h1>

      {v.status === "betaald" ? (
        <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          Deze betaling is al voldaan. Dank je wel! De factuur heb je per mail gekregen.
        </p>
      ) : v.status !== "open" ? (
        <p className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-stone-700">
          Deze betaallink is niet meer geldig. Heb je een vraag? Mail even naar jos@wordswap.nl.
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-sm">
            <p className="text-stone-500">Voor {v.klantBedrijf ?? v.klantNaam}</p>
            <dl className="mt-3 space-y-1.5">
              <div className="flex justify-between">
                <dt>Bedrag exclusief btw</dt>
                <dd>{euroTekst(v.bedragExclCent)}</dd>
              </div>
              <div className="flex justify-between text-stone-500">
                <dt>Btw 21%</dt>
                <dd>{euroTekst(incl - v.bedragExclCent)}</dd>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-1.5 text-base font-semibold">
                <dt>Te betalen</dt>
                <dd>{euroTekst(incl)}</dd>
              </div>
            </dl>
          </div>
          {v.soort === "eerste" && (
            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              Met deze betaling geef je ook toestemming om je maandbedrag voortaan automatisch af te schrijven. Opzeggen kan
              altijd per maand.
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Door te betalen ga je akkoord met{" "}
            {v.soort === "eerste" && <>de opdrachtbevestiging (in je mail), </>}de{" "}
            <a href="/voorwaarden" className="text-emerald-800 underline underline-offset-2">algemene voorwaarden</a> en de{" "}
            <a href="/verwerkersovereenkomst" className="text-emerald-800 underline underline-offset-2">verwerkersovereenkomst</a>.
            We leggen datum en betaling vast als bevestiging.
          </p>
          {fout && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-800">
              Het starten van de betaling lukte niet. Probeer het zo nog eens, of mail jos@wordswap.nl.
            </p>
          )}
          <form action={`/api/betalen/${token}`} method="post" className="mt-6">
            <button type="submit" className="button-primary w-full justify-center cursor-pointer">
              {v.soort === "eerste" ? "Betalen via iDEAL" : "Betalen"} →
            </button>
          </form>
          <p className="mt-3 text-center text-xs text-stone-400">Je betaalt veilig via Mollie. Na je betaling krijg je de factuur per mail.</p>
        </>
      )}
    </div>
  );
}
