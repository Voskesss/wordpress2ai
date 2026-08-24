import Link from "next/link";

function ChatMockup() {
  const messages = [
    {
      side: "right",
      cls: "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm",
      text: "Zet ons nieuwe telefoonnummer op de contactpagina: 06-12345678",
      delay: "0.3s",
    },
    {
      side: "left",
      cls: "bg-zinc-100 text-zinc-700 rounded-bl-sm",
      text: "Gedaan! Bekijk het concept hier 👉 ",
      link: true,
      delay: "1s",
    },
    {
      side: "right",
      cls: "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm",
      text: "Perfect, publiceer maar 🚀",
      delay: "1.7s",
    },
    {
      side: "left",
      cls: "bg-emerald-100 text-emerald-800 font-medium rounded-bl-sm",
      text: "Staat live! ✅ Dat was 1 minuut werk.",
      delay: "2.4s",
    },
  ];
  return (
    <div className="float-card mx-auto w-full max-w-md rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl p-4 shadow-2xl shadow-fuchsia-300/40 text-left text-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs text-zinc-400">jouw-site.nl — chat</span>
      </div>
      <div className="space-y-3 pt-4">
        {messages.map((m) => (
          <div
            key={m.text}
            style={{ animationDelay: m.delay }}
            className={`msg w-fit max-w-[85%] rounded-2xl px-4 py-2.5 ${m.cls} ${
              m.side === "right" ? "ml-auto" : ""
            }`}
          >
            {m.text}
            {m.link && (
              <span className="text-violet-600 underline font-medium">
                preview-link
              </span>
            )}
          </div>
        ))}
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
    kleur: "from-violet-500/10 to-fuchsia-500/10 border-violet-200",
  },
  {
    emoji: "🔒",
    kop: "Nooit meer updates",
    tekst: "Geen plugins, geen lekken, niets te onderhouden. Klaar is klaar.",
    kleur: "from-emerald-500/10 to-teal-500/10 border-emerald-200",
  },
  {
    emoji: "⚡",
    kop: "Bloedsnel & goed voor Google",
    tekst: "Je nieuwe site laadt direct. Google beloont dat met betere posities.",
    kleur: "from-amber-500/10 to-orange-500/10 border-amber-200",
  },
  {
    emoji: "👀",
    kop: "Eerst zien, dan live",
    tekst: "Elke wijziging eerst als preview. Pas na jouw akkoord staat het erop.",
    kleur: "from-sky-500/10 to-cyan-500/10 border-sky-200",
  },
  {
    emoji: "🔓",
    kop: "Geen lock-in",
    tekst: "Maandelijks opzegbaar. Je site en je AI-account blijven van jou.",
    kleur: "from-rose-500/10 to-pink-500/10 border-rose-200",
  },
  {
    emoji: "🧘",
    kop: "Eindelijk rust",
    tekst: "Je website is gewoon áf. Jij kunt weer ondernemen.",
    kleur: "from-lime-500/10 to-green-500/10 border-lime-200",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob -top-32 -left-32 h-[28rem] w-[28rem] bg-violet-400/50" />
        <div aria-hidden className="blob top-24 -right-24 h-96 w-96 bg-fuchsia-300/50" style={{ animationDelay: "-5s" }} />
        <div aria-hidden className="blob bottom-0 left-1/3 h-80 w-80 bg-amber-200/60" style={{ animationDelay: "-9s" }} />
        <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-28 grid items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 backdrop-blur px-4 py-1.5 text-sm font-semibold text-violet-700 shadow-sm">
              👋 Heb jij een WordPress-website?
            </p>
            <h1 className="mt-6 text-4xl sm:text-[3.4rem] font-bold tracking-tight leading-[1.08]">
              Moet je er bij iedere wijziging zelf weer induiken —{" "}
              <span className="gradient-text">hoe zat het ook alweer?</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-600 max-w-xl">
              Of iemand anders vragen (en betalen) om het aan te passen? Ben je
              er klaar mee om plugins te updaten — en een veiligheidsrisico te
              lopen als je het niet doet?
            </p>
            <p className="mt-4 text-lg font-semibold text-zinc-900 max-w-xl">
              Stap dan nu over van WordPress naar je eigen AI, die alles aanpast
              zoals jíj het wilt. Je hoeft het alleen maar te vragen: de AI zet
              het klaar, en als je tevreden bent zeg je gewoon &ldquo;ja&rdquo;.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="lift rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-fuchsia-300/60"
              >
                Ja, verlos me van het gedoe →
              </Link>
              <Link
                href="/hoe-het-werkt"
                className="lift rounded-full border-2 border-zinc-200 bg-white/70 backdrop-blur px-7 py-3.5 font-semibold"
              >
                Eerst zien hoe het werkt
              </Link>
            </div>
          </div>
          <ChatMockup />
        </div>
      </section>

      {/* Het probleem */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div aria-hidden className="blob -top-20 right-0 h-96 w-96 bg-violet-600/20" />
        <div className="relative mx-auto max-w-6xl px-6 py-28">
          <h2 className="reveal text-center text-4xl sm:text-6xl font-bold tracking-tight">
            Herken je dit? 😤
          </h2>
          <p className="reveal mt-5 text-center text-lg text-zinc-400 max-w-2xl mx-auto">
            Een WordPress-site is nooit af. Hij blijft tijd, geld en energie
            kosten zolang hij bestaat.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {herkenbaar.map((item) => (
              <div
                key={item.kop}
                className="reveal lift rounded-3xl bg-zinc-900/80 border border-zinc-800 p-8 hover:border-violet-500/50"
              >
                <span className="text-4xl">{item.emoji}</span>
                <h3 className="mt-4 text-xl font-bold">{item.kop}</h3>
                <p className="mt-2 text-zinc-400">{item.tekst}</p>
              </div>
            ))}
          </div>
          <p className="reveal mt-16 text-center text-2xl font-bold">
            Het kan anders.{" "}
            <span className="gradient-text">Véél anders.</span> 👇
          </p>
        </div>
      </section>

      {/* De oplossing */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <h2 className="reveal text-center text-4xl sm:text-6xl font-bold tracking-tight">
          Zo werkt je website <span className="gradient-text">vanaf nu</span>
        </h2>
        <p className="reveal mt-5 text-center text-lg text-zinc-600 max-w-2xl mx-auto">
          We zetten je site één keer over naar een moderne, veilige omgeving.
          Daarna is aanpassen net zo makkelijk als een appje sturen.
        </p>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {voordelen.map((v) => (
            <div
              key={v.kop}
              className={`reveal lift rounded-3xl border bg-gradient-to-br p-8 ${v.kleur}`}
            >
              <span className="text-4xl">{v.emoji}</span>
              <h3 className="mt-4 text-lg font-bold">{v.kop}</h3>
              <p className="mt-2 text-zinc-600 leading-relaxed">{v.tekst}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prijs-teaser + CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="reveal relative overflow-hidden rounded-[2.5rem] bg-zinc-950 px-8 py-20 text-center text-white shadow-2xl">
          <div aria-hidden className="blob -top-32 left-1/4 h-96 w-96 bg-violet-600/40" />
          <div aria-hidden className="blob -bottom-24 right-1/4 h-80 w-80 bg-fuchsia-600/30" style={{ animationDelay: "-6s" }} />
          <div className="relative">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Eén keer overstappen.
              <br />
              <span className="gradient-text">Voor altijd rust.</span>
            </h2>
            <p className="mt-5 text-lg text-zinc-300 max-w-xl mx-auto">
              Eenmalig vanaf €500 voor de complete overstap (inclusief e-mail en
              SEO-behoud), daarna €20 per maand. Dat is minder dan de meeste
              mensen nu al kwijt zijn aan hosting en plugins.
            </p>
            <div className="mt-9 flex justify-center flex-wrap gap-4">
              <Link
                href="/contact"
                className="lift rounded-full bg-white px-7 py-3.5 font-semibold text-zinc-950"
              >
                Vrijblijvend kennismaken
              </Link>
              <Link
                href="/prijzen"
                className="lift rounded-full border-2 border-zinc-700 px-7 py-3.5 font-semibold text-white hover:border-zinc-400"
              >
                Alle prijzen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
