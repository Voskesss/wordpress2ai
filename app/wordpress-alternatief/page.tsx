import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {"title": "Een WordPress-alternatief voor ondernemers die zelf willen aanpassen.", "description": "WordPress is flexibel. Maar als je vooral teksten, foto’s en diensten actueel wilt houden, kan het beheer meer werk zijn dan je wilt. WordSwap vervangt WordPress door een statische website die je via een ingebouwde AI-chat beheert.", "alternates": {"canonical": "/wordpress-alternatief"}};
export default function Pagina(){ return <SeoLanding data={{
  "label": "WordPress-alternatief",
  "titel": "Een WordPress-alternatief voor ondernemers die zelf willen aanpassen.",
  "intro": "WordPress is flexibel. Maar als je vooral teksten, foto’s en diensten actueel wilt houden, kan het beheer meer werk zijn dan je wilt. WordSwap vervangt WordPress door een statische website die je via een ingebouwde AI-chat beheert.",
  "blokken": [
    {
      "kop": "Wat wordt anders?",
      "tekst": aanbod.omschrijving
    },
    {
      "kop": "Wanneer is overstappen zinvol?",
      "tekst": "Als je regelmatig kleine wijzigingen uitstelt, afhankelijk bent van een webbouwer of af wilt van WordPress-updates. Werkt je huidige site goed en past het beheer bij je? Dan is overstappen niet vanzelfsprekend nodig."
    },
    {
      "kop": "Wanneer blijf je liever bij WordPress?",
      "tekst": "Voor een webshop, ledenomgeving of complexe redactionele workflow kan WordPress beter passen. Externe widgets bekijken we vooraf; niet iedere plugin is één op één te vervangen."
    },
    {
      "kop": "Vergelijk je totale kosten",
      "tekst": aanbod.prijs
    }
  ],
  "slug": "wordpress-alternatief",
  "faq": [
    {
      "vraag": "Wat kost de overstap?",
      "antwoord": aanbod.prijs
    },
    {
      "vraag": "Kan mijn website mee?",
      "antwoord": aanbod.geschikt
    },
    {
      "vraag": "Kan ik mijn eigen AI gebruiken?",
      "antwoord": aanbod.eigenAi
    }
  ]
}} />; }
