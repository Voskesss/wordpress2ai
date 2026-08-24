import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Je website aanpassen?
          <br />
          <span className="text-emerald-600">Vraag het gewoon.</span>
        </h1>
        <p className="mt-6 text-lg text-zinc-600 max-w-2xl mx-auto">
          Wij zetten je WordPress-site één keer om naar een snelle, veilige
          website zonder onderhoud. Daarna typ je in een chat wat je wilt —
          &ldquo;zet ons nieuwe telefoonnummer op de contactpagina&rdquo; — en
          het staat binnen twee minuten live.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-lg bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-700"
          >
            Vrijblijvend kennismaken
          </Link>
          <Link
            href="/hoe-het-werkt"
            className="rounded-lg border border-zinc-300 px-6 py-3 font-medium hover:border-zinc-400"
          >
            Hoe het werkt
          </Link>
        </div>
      </section>

      <section className="bg-zinc-50 border-y border-zinc-200">
        <div className="mx-auto max-w-5xl px-6 py-16 grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-red-600">
              Vroeger: WordPress
            </h2>
            <ul className="mt-4 space-y-3 text-zinc-700">
              <li>Steeds updates van plugins en thema&apos;s — vergeet je het, dan loop je risico op hackers of een crash.</li>
              <li>Voor elk tekstje zelf in een ingewikkeld systeem duiken, of iemand inhuren.</li>
              <li>Hosting die doorloopt, of je site nu iets doet of niet.</li>
              <li>Plugins die stoppen, kapotgaan of ineens een abonnement worden.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-emerald-600">
              Nu: gewoon vragen
            </h2>
            <ul className="mt-4 space-y-3 text-zinc-700">
              <li>Eén keer overgezet naar een moderne, snelle en veilige omgeving — geen plugins, geen kwetsbare techniek.</li>
              <li>Aanpassen? Typ het in de chat en keur het resultaat zelf goed vóór het live gaat.</li>
              <li>Geen updates, geen hosting-gedoe, geen onderhoud.</li>
              <li>Nooit vastgezet: verder met je eigen AI-account kan altijd.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold">
          Vroeger: wachten op de developer. Nu: gewoon vragen.
        </h2>
        <p className="mt-4 text-zinc-600 max-w-xl mx-auto">
          Eén keer €500 voor de overstap, daarna €20 per maand voor de
          AI-koppeling. Eindelijk klaar met dat gedoe.
        </p>
        <Link
          href="/prijzen"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-700"
        >
          Bekijk de prijzen
        </Link>
      </section>
    </>
  );
}
