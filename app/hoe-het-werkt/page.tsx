import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hoe het werkt",
  description:
    "Van WordPress naar een onderhoudsvrije website in negen stappen — inclusief e-mailmigratie, SEO-behoud en de AI-chat waarmee je daarna alles aanpast.",
};

const stappen = [
  {
    titel: "E-mail checken en veiligstellen",
    tekst:
      "We checken eerst waar je e-mail draait. Zit die bij je oude WordPress-hosting in het pakket, dan verhuizen we die eerst naar een aparte e-mailprovider, zodat je mail blijft werken als de oude hosting stopt. Draait je mail al ergens anders (zoals Microsoft 365 of Google Workspace)? Dan hoeft hier niets te gebeuren.",
  },
  {
    titel: "Content overnemen",
    tekst:
      "We halen alle teksten, pagina's en afbeeldingen uit je WordPress-site.",
  },
  {
    titel: "SEO vastleggen",
    tekst:
      "We leggen je huidige URL-structuur vast zodat je vindbaarheid in Google behouden blijft, en zetten redirects waar dat nodig is.",
  },
  {
    titel: "Nieuwe site bouwen",
    tekst:
      "We bouwen je site opnieuw als snelle, statische website — met je bestaande design als uitgangspunt. Contactformulieren zitten er standaard in.",
  },
  {
    titel: "Live zetten",
    tekst:
      "We zetten je domeinnaam om, dienen de nieuwe sitemap in bij Google en houden alles in de gaten.",
  },
  {
    titel: "AI-chat activeren",
    tekst:
      "Vanaf nu pas je alles aan via de chat. Je ziet elke wijziging eerst als concept op een preview-link, en pas na jouw akkoord gaat het live.",
  },
];

export default function HoeHetWerkt() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">Hoe het werkt</h1>
      <p className="mt-4 text-zinc-600">
        Eén zorgvuldige overstap, daarna nooit meer onderhoud. Zo pakken we het
        aan:
      </p>
      <ol className="mt-10 space-y-8">
        {stappen.map((stap, i) => (
          <li key={stap.titel} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white font-semibold">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold">{stap.titel}</h2>
              <p className="mt-1 text-zinc-600">{stap.tekst}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="mt-14 rounded-3xl bg-violet-50 border border-violet-100 p-8">
        <h2 className="font-bold text-violet-700">Eerst zien, dan live</h2>
        <p className="mt-2 text-zinc-600">
          Vraag je een wijziging aan via de chat, dan krijg je eerst een
          preview-link van het resultaat. Goed zo? Eén klik op
          &ldquo;Publiceer&rdquo; en binnen twee minuten staat het op je echte
          site. Niet goed? Typ gewoon verder wat er anders moet. Er verandert
          dus nooit iets op je site zonder jouw akkoord.
        </p>
      </section>
    </div>
  );
}
