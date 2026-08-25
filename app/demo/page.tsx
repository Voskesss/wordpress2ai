import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Show } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Probeer de demo",
  description:
    "Probeer gratis hoe je een website aanpast door het gewoon te typen. Geen WordPress, geen gedoe — chat met de AI-beheerder van onze demo-bakkerij.",
};

const stappen = [
  {
    nr: "1",
    kop: "Maak een gratis account",
    tekst:
      "Alleen je e-mailadres, geen betaalgegevens. Je zit er nergens aan vast.",
  },
  {
    nr: "2",
    kop: "Typ een wijziging",
    tekst:
      "Bijvoorbeeld: “zet het brood van de week op de homepage” of “maak de openingstijden op zaterdag tot 17:00”.",
  },
  {
    nr: "3",
    kop: "Bekijk het en zeg “ja”",
    tekst:
      "De AI zet de wijziging voor je klaar. Jij bekijkt het resultaat en publiceert hem zelf. Precies zoals onze klanten dat doen.",
  },
];

export default function DemoPagina() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            Gratis proberen — geen betaalgegevens nodig
          </p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">
            Pas zelf een echte website aan.{" "}
            <span className="text-violet-700">Door het te typen.</span>
          </h1>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed max-w-xl">
            Wij hebben een demo-website klaargezet: Bakkerij Jansen. Jij krijgt
            er de AI-beheerder bij — dezelfde die onze klanten gebruiken. Vraag
            een wijziging, bekijk het resultaat en zet hem live. Zo voel je in
            twee minuten hoe het is om nooit meer in WordPress te hoeven
            klikken.
          </p>

          <div className="mt-8 space-y-4">
            {stappen.map((s) => (
              <div key={s.nr} className="flex gap-4">
                <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white font-semibold">
                  {s.nr}
                </span>
                <div>
                  <h2 className="font-semibold">{s.kop}</h2>
                  <p className="text-stone-600 text-sm mt-0.5">{s.tekst}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 rounded-2xl border border-stone-200 bg-[#f6f1e7] px-5 py-4 text-sm text-stone-600 leading-relaxed">
            De demo-site wordt elk uur teruggezet, dus je kunt niets kapotmaken.
            Je kunt maximaal 10 wijzigingen per dag doorgeven. Wil je dit voor
            je eigen website?{" "}
            <Link href="/contact" className="font-semibold text-violet-700 underline">
              Neem contact op
            </Link>{" "}
            — wij zetten hem over vanaf €250.
          </p>
        </div>

        <div className="lg:sticky lg:top-24">
          <Show when="signed-in">
            <div className="rounded-3xl border-2 border-violet-600 bg-white p-8 shadow-sm text-center">
              <h2 className="font-display text-2xl font-semibold">
                Je bent al ingelogd
              </h2>
              <p className="mt-2 text-stone-600">
                De demo-bakkerij staat voor je klaar in je portaal.
              </p>
              <Link
                href="/portal"
                className="lift mt-6 inline-block rounded-full bg-violet-700 px-8 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-600"
              >
                Open de demo →
              </Link>
            </div>
          </Show>
          <Show when="signed-out">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-center">
                Start de demo
              </h2>
              <p className="mt-1 mb-4 text-center text-sm text-stone-500">
                Account aanmaken duurt 30 seconden — daarna zit je meteen in de
                chat.
              </p>
              <div className="flex justify-center">
                <SignUp
                  forceRedirectUrl="/portal"
                  signInForceRedirectUrl="/portal"
                  appearance={{
                    elements: {
                      cardBox: { boxShadow: "none", width: "100%" },
                      card: { boxShadow: "none", padding: "0" },
                      footer: { background: "none" },
                    },
                  }}
                />
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
