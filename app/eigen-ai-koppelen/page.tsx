import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Koppel je eigen AI aan je website",
  description:
    "Bij WordSwap is je website van jou — ook voor je AI. Beheer hem via onze chat, laat je eigen assistent meehelpen, of werk als expert met je eigen AI-tools rechtstreeks op de bestanden. Zo werkt het.",
  alternates: { canonical: "/eigen-ai-koppelen" },
};

const routes = [
  {
    kop: "1. De ingebouwde AI (voor iedereen)",
    tekst:
      "Standaard bij elke WordSwap-site: je opent je portaal, typt of spréékt in wat er anders moet, en de AI voert het uit. Je ziet elke wijziging eerst als voorbeeld, publiceert zelf, en kunt altijd terug naar een eerdere versie. Foto's vervangen, video's uploaden, kleuren kiezen en je Google-teksten regelen kan zelfs zonder AI, met één klik.",
    badge: "inbegrepen",
  },
  {
    kop: "2. Je eigen assistent laten meedenken",
    tekst:
      "Gebruik je ChatGPT, Claude of een andere assistent? Laat die gerust je wijziging bedenken of je teksten schrijven, en plak het resultaat in de portaal-chat — onze AI voert het uit met hetzelfde vangnet. Een rechtstreekse koppeling waarmee je assistent zélf wijzigingen kan klaarzetten (en jij alleen nog goedkeurt) staat op de planning; laat het ons weten als je die wilt, dan schuift hij naar voren.",
    badge: "vandaag al bruikbaar",
  },
  {
    kop: "3. Expert: je eigen AI-tools rechtstreeks op de bestanden",
    tekst:
      "Je website is bij ons geen black box maar een map met gewone web-bestanden, in een eigen omgeving die van jou is. Wil je zelf met AI-codetools werken — Claude Code, Cursor, of wat er volgende maand ook uitkomt — dan geven we je rechtstreekse toegang. Elke wijziging die je doorzet, zetten wij automatisch live op ons snelle netwerk, en de complete geschiedenis blijft bewaard zodat je elke stap kunt terugdraaien. Eerlijk erbij: op deze route werk je buiten ons voorbeeld-eerst-vangnet om — dat is precies de vrijheid die experts willen, met de versiegeschiedenis als achtervang.",
    badge: "expert-optie",
  },
];

export default function EigenAiKoppelen() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
        Koppel je eigen AI aan je website
      </h1>
      <p className="mt-5 text-lg text-stone-600 leading-relaxed">
        AI-assistenten worden elk jaar beter, en steeds meer mensen laten hun
        assistent gewoon dingen dóén. Daar is een WordSwap-site voor gebouwd:
        hij is van jou, hij bestaat uit gewone bestanden, en er zijn drie
        manieren om er met AI aan te werken — van makkelijk tot volledig
        zelfstandig. Geen lock-in: welke AI er ook komt, jouw site is er klaar
        voor.
      </p>

      <div className="mt-10 space-y-5">
        {routes.map((r) => (
          <div key={r.kop} className="rounded-3xl border border-stone-200 bg-white p-7">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-xl font-semibold">{r.kop}</h2>
              <span className="rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-medium text-violet-700">
                {r.badge}
              </span>
            </div>
            <p className="mt-3 text-stone-600 leading-relaxed">{r.tekst}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl bg-violet-700 p-8 text-white">
        <h2 className="font-display text-2xl font-semibold">Waarom dit bij ons kan</h2>
        <p className="mt-3 leading-relaxed text-violet-100">
          Omdat een WordSwap-site geen draaiend systeem is maar platte, snelle
          bestanden, kan élke AI ermee overweg — die van ons, die van jou, en
          die van volgend jaar. Wij leveren wat een AI zelf niet meebrengt: de
          hosting, de automatische doorzetting, het voorbeeld-vangnet, de
          versiegeschiedenis en een mens die meekijkt als het spannend wordt.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-full bg-white px-6 py-3 font-semibold text-violet-700">
            Expert-toegang aanvragen
          </Link>
          <Link href="/demo" className="rounded-full border-2 border-violet-400 px-6 py-3 font-semibold text-white hover:border-white">
            Eerst de chat proberen
          </Link>
        </div>
      </div>
    </div>
  );
}
