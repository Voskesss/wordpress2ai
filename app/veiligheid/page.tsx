import type { Metadata } from "next";
import Link from "next/link";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {
  title: "Veiligheid: je website, AI-chat en controle",
  description:
    "Geen WordPress-plugins op je publieke site. Wel beveiligde accounts, controle vóór publicatie en versiegeschiedenis. Lees hoe WordSwap de beveiliging voor je regelt.",
  alternates: { canonical: "/veiligheid" },
};
const vragen = [
  ["Is mijn website onhackbaar?", aanbod.veiligheid],
  [
    "Kan de AI fouten maken?",
    "Ja. De AI kan je verzoek verkeerd begrijpen of een onjuiste wijziging voorstellen. Daarom bekijk je het concept en publiceer je pas als het klopt. Een eerdere versie kan worden teruggezet. Controleer ook teksten, links en formulieren bij belangrijke wijzigingen.",
  ],
  [
    "Hoe is mijn beheeromgeving beschermd?",
    "Je beheert je website vanuit je eigen, beveiligde WordSwap-omgeving. Inloggen loopt via een gespecialiseerde inlogdienst die wachtwoorden versleuteld bewaart; wij zien je wachtwoord nooit. Wil je extra zekerheid, dan zet je met één klik tweestapsverificatie aan. Je publieke website staat daar los van, dus ook een bezoeker kan nooit bij het beheer.",
  ],
  [
    "Hoe werken formulieren en SSL?",
    "Hosting en SSL zijn onderdeel van de koppeling. Formulieren gebruiken onze server om inzendingen te verwerken en door te sturen. Daarbij passen we onder meer een verborgen spamveld en begrenzing van inzendingen toe. Zo houden we het overgrote deel van de spam tegen. Glipt er toch iets doorheen, laat het ons weten: dan scherpen wij het aan.",
  ],
  [
    "Hebben jullie een ISO 27001- of SOC 2-certificering?",
    "Nee. WordSwap heeft deze certificeringen niet. We beschrijven onze werkwijze en verwerkers in de privacyverklaring. Als jouw organisatie specifieke beveiligings- of certificeringseisen heeft, bespreek die dan vóór de overstap.",
  ],
  ["Hoe zit het met mijn positie in Google?", aanbod.seo],
  ["Geldt de goedkeuring ook voor eigen AI-codetools?", aanbod.eigenAi],
];
export default function Veiligheid() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">VEILIGHEID & CONTROLE</p>
      <h1 className="font-display mt-4 text-4xl sm:text-5xl font-semibold">
        Minder WordPress-onderdelen.
        <br />
        Jij houdt de regie.
      </h1>
      <p className="mt-6 text-lg text-stone-600 leading-relaxed">
        Je website heeft na de overstap geen WordPress-database of plugins
        meer. Daarmee verdwijnen de zwakke plekken waar de meeste gehackte
        websites op sneuvelen. De rest regelen wij: hosting, beveiliging, je
        formulieren en het portaal houden we in de gaten en up-to-date.
      </p>
      <div className="faq-list mt-10">
        {vragen.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span>+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <div className="button-row">
        <Link href="/contact" className="button-primary">
          Bespreek mijn website ↗
        </Link>
        <Link href="/privacy" className="button-text">
          Privacy en gegevens →
        </Link>
      </div>
    </div>
  );
}
