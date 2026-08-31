import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nieuwe website",
  description:
    "Liever een compleet nieuwe website in plaats van je WordPress-site overzetten? Kies voor een AI-ontwerp (snel en voordelig) of een ontwerp door een designer — altijd met de AI-beheerder erbij.",
};

const stappen = [
  {
    nr: "1",
    kop: "Vertel wat je nodig hebt",
    tekst:
      "Vul de intake hieronder in: wat doe je, welke pagina's heb je nodig, welke stijl past bij je. Vijf minuten werk.",
  },
  {
    nr: "2",
    kop: "Wij bouwen een voorstel",
    tekst:
      "Je krijgt een werkende voorbeeldsite te zien — geen schetsen of moodboards, maar het echte ding. Feedback geef je gewoon in gewone taal.",
  },
  {
    nr: "3",
    kop: "Live, mét AI-beheerder",
    tekst:
      "Na jouw akkoord gaat de site live, inclusief de AI-chat waarmee je hem daarna zelf aanpast. Zelfde rust als bij een overstap.",
  },
];

const invoer =
  "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal text-base sm:text-sm focus:border-violet-600 focus:outline-none";

export default function NieuweWebsite() {
  return (
    <>
      <div className="mx-auto max-w-4xl px-6 pt-20">
        <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
          Extra dienst — naast de WordPress-overstap
        </p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">
          Liever een héle nieuwe website? Kan ook.
        </h1>
        <p className="mt-5 text-lg text-stone-600 leading-relaxed max-w-2xl">
          Nog geen website, of is je huidige site niet meer te redden? Wij
          bouwen hem opnieuw — snel, zonder WordPress, en altijd met de
          AI-beheerder erbij zodat je hem daarna zelf kunt aanpassen door het
          gewoon te typen.
        </p>
      </div>

      {/* Twee smaken */}
      <div className="mx-auto max-w-4xl px-6 py-12 grid gap-6 sm:grid-cols-2">
        <div className="reveal rounded-3xl border-2 border-violet-600 bg-violet-50/40 p-8">
          <h2 className="font-display text-xl font-semibold">AI-ontwerp</h2>
          <p className="mt-3 font-display text-4xl font-semibold">
            vanaf €250{" "}
            <span className="text-base font-normal text-stone-500">eenmalig</span>
          </p>
          <p className="mt-1 text-sm font-medium text-stone-600">
            tot 8 pagina&apos;s €250 · tot 20 pagina&apos;s €500 · daarboven €750
          </p>
          <p className="mt-2 text-sm text-stone-500">
            De AI ontwerpt en bouwt je site op basis van jouw verhaal, huisstijl
            en voorbeelden die je mooi vindt. Binnen dagen een werkend
            voorstel; onbeperkt bijsturen via de chat tot het klopt.
          </p>
          <ul className="mt-5 space-y-2.5 text-stone-600 text-sm">
            {[
              "Compleet ontwerp + bouw van al je pagina's",
              "Jouw logo, kleuren en foto's verwerkt",
              "Supersnel, veilig en goed vindbaar in Google",
              "Contactformulier en AI-beheerder inbegrepen",
            ].map((p) => (
              <li key={p} className="flex gap-2.5">
                <span className="mt-0.5 text-violet-600 shrink-0">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="font-display text-xl font-semibold">
            Ontwerp door een designer
          </h2>
          <p className="mt-3 font-display text-4xl font-semibold">
            vanaf €1750{" "}
            <span className="text-base font-normal text-stone-500">eenmalig</span>
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Een menselijke ontwerper maakt een uniek design op maat — met
            gesprekken, revisierondes en oog voor je merk. De AI bouwt het
            daarna pixel-precies.
          </p>
          <ul className="mt-5 space-y-2.5 text-stone-600 text-sm">
            {[
              "Persoonlijk ontwerptraject met revisierondes",
              "Uniek design, volledig op je merk toegesneden",
              "Alles van het AI-ontwerp zit er ook in",
              "Vaste prijs vooraf na de intake",
            ].map((p) => (
              <li key={p} className="flex gap-2.5">
                <span className="mt-0.5 text-violet-600 shrink-0">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mx-auto max-w-4xl px-6 text-sm text-stone-500">
        Daarna geldt hetzelfde als voor iedereen: de AI-koppeling voor €5 – €20
        per maand, afgestemd op je gebruik. Heb je nog een WordPress-site die
        gewoon goed is? Dan is{" "}
        <Link href="/prijzen" className="font-semibold text-violet-700 underline">
          de overstap
        </Link>{" "}
        voordeliger — dat blijft ons hoofdvak.
      </p>

      {/* Stappen */}
      <div className="mx-auto max-w-4xl px-6 py-14">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Zo werkt het
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {stappen.map((s) => (
            <div key={s.nr} className="reveal">
              <span className="font-display flex h-10 w-10 items-center justify-center rounded-full bg-violet-700 text-white font-semibold">
                {s.nr}
              </span>
              <h3 className="mt-3 font-semibold">{s.kop}</h3>
              <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
                {s.tekst}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Intake */}
      <div className="bg-[#f6f1e7] border-y border-stone-200">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Start de intake
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            Vertel ons in vijf minuten wat je nodig hebt — wij komen binnen één
            werkdag terug met een voorstel en een vaste prijs.
          </p>
          <form
            method="POST"
            action="/api/formulier"
            className="mt-8 space-y-4 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm"
          >
            <input type="hidden" name="_site" value="wordswap" />
            <input type="hidden" name="_formulier" value="nieuwe-website" />
            <input type="hidden" name="_bedankt" value="/bedankt" />
            <input
              type="text"
              name="_extra"
              defaultValue=""
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Je naam
                <input name="naam" type="text" required className={invoer} />
              </label>
              <label className="block text-sm font-semibold">
                E-mailadres
                <input name="email" type="email" required className={invoer} />
              </label>
            </div>
            <label className="block text-sm font-semibold">
              Je bedrijf (en huidige website, als die er is)
              <input name="bedrijf" type="text" className={invoer} />
            </label>
            <label className="block text-sm font-semibold">
              Welk ontwerp past bij je?
              <select name="ontwerp" className={invoer} defaultValue="ai">
                <option value="ai">AI-ontwerp (vanaf €250)</option>
                <option value="designer">
                  Ontwerp door een designer (vanaf €1750)
                </option>
                <option value="advies">Weet ik nog niet — adviseer me</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Vertel over je site: wat doe je, welke pagina&apos;s heb je
              nodig, welke sites vind je mooi?
              <textarea name="omschrijving" rows={5} required className={invoer} />
            </label>
            <button
              type="submit"
              className="lift rounded-full bg-violet-700 px-7 py-3 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600 cursor-pointer"
            >
              Verstuur intake →
            </button>
            <p className="text-xs text-stone-400">
              Vrijblijvend — je zit nergens aan vast tot je akkoord geeft op het
              voorstel.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
