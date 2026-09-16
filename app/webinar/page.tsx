import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { webinars } from "@/db/schema";
import { josFoto } from "@/lib/persoonlijk";
import { formatWanneer } from "@/lib/webinar";
import { vindHoek } from "@/lib/hoeken";

export const metadata: Metadata = {
  title: "Gratis webinar: kun jij van het websitegedoe af?",
  description:
    "Updates die je niet durft te doen, wachten op je bouwer? Na dit gratis webinar weet je of jij van het gedoe af kunt. Ook als het eerlijke antwoord nee is.",
  alternates: { canonical: "/webinar" },
};

export const dynamic = "force-dynamic";

const inputStijl =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-100";

const herkenning = [
  "Ik durf nergens aan te zitten. Straks ligt de site eruit.",
  "Ik betaal voor onderhoud, maar ik weet niet waarvoor.",
  "Mijn openingstijden op de site kloppen al maanden niet.",
  "Ik moet nog iets aan de site doen. Dat denk ik al een half jaar.",
];

const naAfloop = [
  "Wat er inmiddels kan: jij zegt wat er op je site moet, en het gedoe eromheen is geregeld.",
  "Waarom dit juist nu speelt, nu steeds meer klanten anders zoeken. En waarom niets doen duurder is dan het voelt.",
  "Wanneer het bij jou past, ook als je site nog vrij nieuw is. En wanneer niet.",
];

const voorWieWel = [
  "Je hebt een eigen bedrijf en al een website, meestal in WordPress.",
  "Je wilt je huidige website houden, met je eigen uitstraling, alleen zonder het gedoe.",
  "Je bent het gedoe eromheen zat, van updates tot wachten op je bouwer.",
  "Je wilt dat het gewoon geregeld is, zodat jij met je vak bezig kunt.",
];

const voorWieNiet = [
  "Je website is groot en ingewikkeld, met veel maatwerk.",
  "Je hebt een webshop.",
  "Je site heeft een ledenportaal of een plek waar klanten inloggen.",
  "Je plaatst bijna elke dag een nieuw blog.",
];

export default async function Webinar({
  searchParams,
}: {
  searchParams: Promise<{ hoek?: string | string[] }>;
}) {
  // Kop per advertentie (?hoek=vakman); zonder of met onbekende hoek de standaardkop
  const hoek = vindHoek((await searchParams).hoek);
  const komende = await db
    .select()
    .from(webinars)
    .where(and(eq(webinars.actief, true), gte(webinars.wanneer, new Date())))
    .orderBy(asc(webinars.wanneer));

  const foto = josFoto();
  const eerstvolgende = komende[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mx-auto max-w-4xl font-display text-center text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
        {hoek ? (
          hoek.kop
        ) : (
          <>
            Je wilde één zin op je website zetten.
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">
              Het werd weer een heel gedoe.
            </span>
          </>
        )}
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-stone-600 leading-relaxed">
        {hoek
          ? hoek.tekst
          : "Wachtwoord kwijt, negen updates die klaarstaan, dus toch maar een mailtje naar je bouwer. Twee weken later staat het erop, met een factuur voor die ene zin."}{" "}
        <strong>Na dit webinar weet je of jij van het gedoe af kunt.</strong>
      </p>

      {/* Uitgelicht webinar: collage links, inhoud rechts */}
      <div className="mt-12 grid overflow-hidden rounded-[2rem] bg-violet-50/60 border border-violet-100 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative hidden min-h-[26rem] lg:block">
          <div className="absolute left-8 top-8 h-24 w-24 rounded-[2rem] bg-gradient-to-br from-violet-600 to-violet-400 opacity-90" />
          <div className="absolute right-10 top-14 h-14 w-14 rounded-full bg-amber-300" />
          <div className="absolute bottom-24 left-6 h-16 w-28 rounded-2xl bg-white shadow-lg p-3">
            <p className="text-[10px] font-semibold text-stone-500">Jij zegt:</p>
            <p className="mt-0.5 truncate text-[11px] text-stone-800">&ldquo;zet zaterdag open tot 17:00&rdquo;</p>
          </div>
          <div className="absolute bottom-10 right-8 h-12 w-32 rounded-2xl bg-violet-700 p-3 shadow-lg">
            <p className="text-[11px] font-semibold text-white">✓ Geregeld</p>
          </div>
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto}
              alt="Jos Klijnhout"
              className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border-4 border-white object-cover shadow-2xl"
            />
          ) : (
            <div className="font-display absolute left-1/2 top-1/2 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.5rem] border-4 border-white bg-gradient-to-br from-violet-600 to-violet-400 text-5xl font-semibold text-white shadow-2xl">
              JK
            </div>
          )}
        </div>

        <div className="p-8 sm:p-12">
          <span className="rounded-full bg-violet-100 px-3.5 py-1.5 text-sm font-semibold text-violet-700">
            Gratis webinar
          </span>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight">Weg uit WordPress — zonder gedoe</h2>
          <p className="mt-4 text-stone-600 leading-relaxed">
            Jos Klijnhout, oprichter van WordSwap, begint bij de ergernis die je vast kent. Eén keer zie je met eigen
            ogen dat het anders kan. En nee, je hoeft niet opnieuw te beginnen: <strong>je eigen ontwerp, teksten en
            foto&apos;s gaan gewoon mee.</strong> Techniek laten we erbuiten: die hoef jij niet te kennen. Je hoeft
            niets voor te bereiden, luisteren is genoeg.
          </p>
          <div className="mt-6 space-y-2 text-stone-700">
            <p>
              📅{" "}
              {eerstvolgende
                ? formatWanneer(eerstvolgende.wanneer) + " uur"
                : "Nieuwe datum volgt"}
            </p>
            <p>⏱ Maximaal 30 minuten, inclusief je vragen</p>
            <p>💻 Online, gewoon vanaf je eigen plek</p>
          </div>
          <a
            href="#inschrijven"
            className="lift mt-8 inline-block rounded-lg bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-sm hover:bg-violet-600"
          >
            {eerstvolgende ? "Reserveer je plek" : "Bekijk wat je nu al kunt doen"}
          </a>
        </div>
      </div>

      {/* Herkenning en na afloop */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="font-display text-xl font-semibold">Knik je bij minstens één hiervan?</h2>
          <ul className="mt-4 space-y-3 text-stone-700">
            {herkenning.map((zin) => (
              <li key={zin} className="flex gap-3">
                <span className="shrink-0 text-violet-600">“</span>
                <span className="italic">{zin}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="font-display text-xl font-semibold">Na afloop weet je</h2>
          <ul className="mt-4 space-y-3 text-stone-700">
            {naAfloop.map((punt) => (
              <li key={punt} className="flex gap-3">
                <span className="shrink-0 text-violet-600">✓</span>
                {punt}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Voor wie wel en niet */}
      <div className="mx-auto mt-6 grid max-w-4xl gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-6">
          <h2 className="font-display text-xl font-semibold">Dit webinar is voor jou als</h2>
          <ul className="mt-4 space-y-2.5 text-stone-700">
            {voorWieWel.map((punt) => (
              <li key={punt} className="flex gap-3">
                <span className="shrink-0 text-violet-600">✓</span>
                {punt}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="font-display text-xl font-semibold">Minder geschikt als</h2>
          <ul className="mt-4 space-y-2.5 text-stone-700">
            {voorWieNiet.map((punt) => (
              <li key={punt} className="flex gap-3">
                <span className="shrink-0 text-stone-400">–</span>
                {punt}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Zit je in een van deze situaties? Dan past onze aanpak waarschijnlijk niet bij je site. Dat zeggen we
            liever nu dan na een half uur. Twijfel je? Doe de{" "}
            <Link href="/contact" className="text-violet-700 underline underline-offset-2">
              gratis websitecheck
            </Link>
            . Je krijgt een eerlijk antwoord, ook als dat &lsquo;blijf waar je zit&rsquo; is.
          </p>
        </section>
      </div>

      <div id="inschrijven" className="mx-auto mt-10 max-w-3xl scroll-mt-24 rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        {komende.length === 0 ? (
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold">Nog geen datum gepland</h2>
            <p className="mt-2 text-stone-600">
              Het volgende webinar staat nog niet in de agenda. Wil je niet wachten? Vraag de{" "}
              <Link href="/contact" className="text-violet-700 underline underline-offset-2">
                gratis websitecheck
              </Link>{" "}
              aan. We kijken vrijblijvend naar je eigen site en laten je weten of jij van het gedoe af kunt.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold">Schrijf je gratis in</h2>
            <form action="/api/formulier" method="POST" className="mt-5 space-y-5">
              <input type="hidden" name="_site" value="wordswap" />
              <input type="hidden" name="_formulier" value="webinar" />
              <input type="hidden" name="_bedankt" value="/bedankt" />
              {hoek && <input type="hidden" name="_hoek" value={hoek.sleutel} />}
              <input type="text" name="_extra" defaultValue="" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

              <div>
                <label htmlFor="webinar" className="block text-sm font-semibold">
                  Kies een datum
                </label>
                <select id="webinar" name="webinar_id" required className={inputStijl}>
                  {komende.map((w) => (
                    <option key={w.id} value={w.id}>
                      {formatWanneer(w.wanneer)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="naam" className="block text-sm font-semibold">Naam</label>
                  <input id="naam" name="naam" type="text" required className={inputStijl} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold">E-mailadres</label>
                  <input id="email" name="email" type="email" required className={inputStijl} />
                </div>
              </div>
              <div>
                <label htmlFor="website" className="block text-sm font-semibold">
                  Je huidige website (optioneel)
                </label>
                <input id="website" name="website" type="text" inputMode="url" placeholder="bijv. www.mijnbedrijf.nl" className={inputStijl} />
              </div>

              <button
                type="submit"
                className="lift w-full rounded-lg bg-violet-700 px-7 py-3.5 font-semibold text-white shadow-sm hover:bg-violet-600"
              >
                Ja, reserveer mijn plek
              </button>
              <p className="text-center text-xs text-stone-400">
                Je zit nergens aan vast. Je krijgt meteen een bevestiging per mail, en op tijd de link om mee te doen.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
