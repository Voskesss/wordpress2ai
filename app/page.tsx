import Link from "next/link";

function ChatMockup() {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-700/60 bg-zinc-900/80 p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur text-left text-sm">
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-xs text-zinc-500">jouw-site.nl — chat</span>
      </div>
      <div className="space-y-3 pt-4">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600 px-4 py-2.5 text-white">
          Zet ons nieuwe telefoonnummer op de contactpagina: 06-12345678
        </div>
        <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-2.5 text-zinc-200">
          Gedaan! Bekijk het concept hier 👉{" "}
          <span className="text-emerald-400 underline">preview-link</span>
        </div>
        <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-emerald-600 px-4 py-2.5 text-white">
          Perfect, publiceer maar 🚀
        </div>
        <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-2.5 text-zinc-200">
          Staat live! ✅
        </div>
      </div>
    </div>
  );
}

const bezwaren = [
  {
    kop: "Geen updates meer",
    tekst:
      "Geen plugins, geen thema's, geen beveiligingslekken. Er valt simpelweg niets meer te updaten of te hacken.",
  },
  {
    kop: "Razendsnel",
    tekst:
      "Statische pagina's laden vrijwel direct — sneller dan vrijwel elke WordPress-site. Goed voor bezoekers én voor Google.",
  },
  {
    kop: "Jij houdt de regie",
    tekst:
      "Elke wijziging zie je eerst als concept op een preview-link. Pas na jouw akkoord gaat het live.",
  },
  {
    kop: "Geen lock-in",
    tekst:
      "Maandelijks opzegbaar. Verder met je eigen AI-account of alles meenemen? Kan altijd.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.18),transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 grid items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              Voor ondernemers die klaar zijn met website-gedoe
            </p>
            <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Je website aanpassen?{" "}
              <span className="text-emerald-400">Vraag het gewoon.</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-300 max-w-xl">
              Wij zetten je WordPress-site één keer om naar een snelle, veilige
              website zonder onderhoud. Daarna typ je in een chat wat je wilt —
              en het staat binnen twee minuten live.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="rounded-full bg-emerald-500 px-7 py-3.5 font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors"
              >
                Vrijblijvend kennismaken
              </Link>
              <Link
                href="/hoe-het-werkt"
                className="rounded-full border border-zinc-700 px-7 py-3.5 font-semibold text-zinc-200 hover:border-zinc-500 transition-colors"
              >
                Hoe het werkt
              </Link>
            </div>
          </div>
          <ChatMockup />
        </div>
      </section>

      {/* Vroeger vs nu */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight">
          Vroeger: wachten op de developer.
          <br />
          <span className="text-emerald-600">Nu: gewoon vragen.</span>
        </h2>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Het oude verhaal
            </p>
            <h3 className="mt-2 text-xl font-bold">WordPress is nooit af</h3>
            <ul className="mt-6 space-y-4 text-zinc-600">
              {[
                "Steeds updates van plugins en thema's — vergeet je het, dan loop je risico op hackers of een crash.",
                "Voor elk tekstje zelf in een ingewikkeld systeem duiken, of iemand inhuren.",
                "Hosting die doorloopt, of je site nu iets doet of niet.",
                "Plugins die stoppen, kapotgaan of ineens een abonnement worden.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-1 text-zinc-400">✕</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-zinc-950 p-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Het nieuwe verhaal
            </p>
            <h3 className="mt-2 text-xl font-bold">Eén keer over, daarna rust</h3>
            <ul className="mt-6 space-y-4 text-zinc-300">
              {[
                "Eén keer overgezet naar een moderne, snelle en veilige omgeving — geen kwetsbare techniek.",
                "Aanpassen? Typ het in de chat en keur het resultaat zelf goed vóór het live gaat.",
                "Geen updates, geen hosting-gedoe, geen onderhoud.",
                "Nooit vastgezet: verder met je eigen AI-account kan altijd.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-1 text-emerald-400">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* USP's */}
      <section className="bg-zinc-50 border-y border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {bezwaren.map((b) => (
              <div key={b.kop}>
                <h3 className="font-bold">{b.kop}</h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  {b.tekst}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Eindelijk klaar met dat gedoe?
        </h2>
        <p className="mt-4 text-lg text-zinc-600 max-w-xl mx-auto">
          Eén keer vanaf €500 voor de overstap, daarna €20 per maand. Geen
          verrassingen, geen lock-in.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/prijzen"
            className="rounded-full bg-zinc-900 px-7 py-3.5 font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Bekijk de prijzen
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-zinc-300 px-7 py-3.5 font-semibold hover:border-zinc-500 transition-colors"
          >
            Stel je vraag
          </Link>
        </div>
      </section>
    </>
  );
}
