import Link from "next/link";

function ChatMockup() {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-violet-200 bg-white p-4 shadow-xl shadow-violet-200/50 text-left text-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs text-zinc-400">jouw-site.nl — chat</span>
      </div>
      <div className="space-y-3 pt-4">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-white">
          Zet ons nieuwe telefoonnummer op de contactpagina: 06-12345678
        </div>
        <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2.5 text-zinc-700">
          Gedaan! Bekijk het concept hier 👉{" "}
          <span className="text-violet-600 underline font-medium">preview-link</span>
        </div>
        <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-white">
          Perfect, publiceer maar 🚀
        </div>
        <div className="w-fit rounded-2xl rounded-bl-sm bg-emerald-100 px-4 py-2.5 font-medium text-emerald-800">
          Staat live! ✅ Dat was 1 minuut werk.
        </div>
      </div>
    </div>
  );
}

const herkenbaar = [
  {
    emoji: "🔧",
    kop: "Wéér een plugin-update",
    tekst:
      "Elke week meldingen: updaten, updaten, updaten. En durf je het niet? Dan ligt je site open voor hackers.",
  },
  {
    emoji: "💸",
    kop: "Betalen voor elke aanpassing",
    tekst:
      "Een tekstje wijzigen? Je webbouwer mailen, wachten, en een factuur ontvangen. Voor twee zinnen.",
  },
  {
    emoji: "🏋️",
    kop: "Dure hosting die maar doorloopt",
    tekst:
      "Elke maand betalen, of je site nu iets doet of stilstaat. Plus losse abonnementen voor plugins.",
  },
  {
    emoji: "😰",
    kop: "Zelf klooien in WordPress",
    tekst:
      "Inloggen, zoeken waar dat blokje ook alweer zat, per ongeluk iets slopen... en dan maar hopen.",
  },
];

const voordelen = [
  {
    emoji: "💬",
    kop: "Typ het, en het staat erop",
    tekst: "Wijziging nodig? Gewoon vragen in de chat. In 1 minuut geregeld.",
    kleur: "bg-violet-50 border-violet-200",
  },
  {
    emoji: "🔒",
    kop: "Nooit meer updates",
    tekst: "Geen plugins, geen lekken, niets te onderhouden. Klaar is klaar.",
    kleur: "bg-emerald-50 border-emerald-200",
  },
  {
    emoji: "⚡",
    kop: "Bloedsnel & goed voor Google",
    tekst: "Je nieuwe site laadt direct. Google beloont dat met betere posities.",
    kleur: "bg-amber-50 border-amber-200",
  },
  {
    emoji: "👀",
    kop: "Eerst zien, dan live",
    tekst: "Elke wijziging eerst als preview. Pas na jouw akkoord staat het erop.",
    kleur: "bg-sky-50 border-sky-200",
  },
  {
    emoji: "🔓",
    kop: "Geen lock-in",
    tekst: "Maandelijks opzegbaar. Je site en je AI-account blijven van jou.",
    kleur: "bg-rose-50 border-rose-200",
  },
  {
    emoji: "🧘",
    kop: "Eindelijk rust",
    tekst: "Je website is gewoon áf. Jij kunt weer ondernemen.",
    kleur: "bg-lime-50 border-lime-200",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-300/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-20 -right-32 h-96 w-96 rounded-full bg-amber-200/50 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 grid items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-semibold text-violet-700">
              👋 Klaar met WordPress-gedoe?
            </p>
            <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Je website aanpassen in{" "}
              <span className="bg-gradient-to-r from-violet-600 to-emerald-500 bg-clip-text text-transparent">
                1 minuut
              </span>
              . Gewoon door het te vragen.
            </h1>
            <p className="mt-6 text-lg text-zinc-600 max-w-xl">
              Geen plugin-updates. Geen dure hosting. Geen webbouwer nodig voor
              elke kleine wijziging. Wij zetten je WordPress-site één keer over
              — daarna regel je álles via een simpele chat.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="rounded-full bg-violet-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-300 hover:bg-violet-500 transition-colors"
              >
                Ja, verlos me van het gedoe →
              </Link>
              <Link
                href="/hoe-het-werkt"
                className="rounded-full border-2 border-zinc-200 px-7 py-3.5 font-semibold hover:border-violet-300 transition-colors"
              >
                Eerst zien hoe het werkt
              </Link>
            </div>
          </div>
          <ChatMockup />
        </div>
      </section>

      {/* Het probleem */}
      <section className="bg-zinc-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-center text-3xl sm:text-5xl font-bold tracking-tight">
            Herken je dit? 😤
          </h2>
          <p className="mt-4 text-center text-lg text-zinc-400 max-w-2xl mx-auto">
            Een WordPress-site is nooit af. Hij blijft tijd, geld en energie
            kosten zolang hij bestaat.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {herkenbaar.map((item) => (
              <div
                key={item.kop}
                className="rounded-3xl bg-zinc-900 border border-zinc-800 p-7"
              >
                <span className="text-3xl">{item.emoji}</span>
                <h3 className="mt-3 text-lg font-bold">{item.kop}</h3>
                <p className="mt-2 text-zinc-400">{item.tekst}</p>
              </div>
            ))}
          </div>
          <p className="mt-14 text-center text-xl font-semibold">
            Het kan anders. Véél anders. 👇
          </p>
        </div>
      </section>

      {/* De oplossing */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl sm:text-5xl font-bold tracking-tight">
          Zo werkt je website{" "}
          <span className="bg-gradient-to-r from-violet-600 to-emerald-500 bg-clip-text text-transparent">
            vanaf nu
          </span>
        </h2>
        <p className="mt-4 text-center text-lg text-zinc-600 max-w-2xl mx-auto">
          We zetten je site één keer over naar een moderne, veilige omgeving.
          Daarna is aanpassen net zo makkelijk als een appje sturen.
        </p>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {voordelen.map((v) => (
            <div key={v.kop} className={`rounded-3xl border p-7 ${v.kleur}`}>
              <span className="text-3xl">{v.emoji}</span>
              <h3 className="mt-3 font-bold">{v.kop}</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                {v.tekst}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Prijs-teaser + CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-violet-800 px-8 py-16 text-center text-white shadow-xl shadow-violet-200">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Eén keer overstappen. Voor altijd rust.
          </h2>
          <p className="mt-4 text-lg text-violet-200 max-w-xl mx-auto">
            Eenmalig vanaf €500 voor de complete overstap (inclusief e-mail en
            SEO-behoud), daarna €20 per maand. Dat is minder dan de meeste
            mensen nu al kwijt zijn aan hosting en plugins.
          </p>
          <div className="mt-8 flex justify-center flex-wrap gap-4">
            <Link
              href="/contact"
              className="rounded-full bg-white px-7 py-3.5 font-semibold text-violet-700 hover:bg-violet-50 transition-colors"
            >
              Vrijblijvend kennismaken
            </Link>
            <Link
              href="/prijzen"
              className="rounded-full border-2 border-violet-400 px-7 py-3.5 font-semibold text-white hover:border-white transition-colors"
            >
              Alle prijzen
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
