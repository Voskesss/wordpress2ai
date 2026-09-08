import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {"title": "Een trage WordPress-site? Bekijk eerst waar het aan ligt.", "description": "Grote afbeeldingen, externe scripts, plugins en hosting kunnen een website vertragen. Soms is optimaliseren voldoende. Wil je ook af van WordPress-beheer, dan kan een overstap naar een statische site passen.", "alternates": {"canonical": "/wordpress-website-traag"}};
export default function Pagina(){ return <SeoLanding data={{
  "label": "Trage WordPress-site",
  "titel": "Een trage WordPress-site? Bekijk eerst waar het aan ligt.",
  "intro": "Grote afbeeldingen, externe scripts, plugins en hosting kunnen een website vertragen. Soms is optimaliseren voldoende. Wil je ook af van WordPress-beheer, dan kan een overstap naar een statische site passen.",
  "blokken": [
    {
      "kop": "Snelheid is meer dan je CMS",
      "tekst": "Een statische pagina hoeft niet voor elk bezoek vanuit een WordPress-database te worden opgebouwd. Maar ook afbeeldingen, video’s, externe diensten en de verbinding van je bezoeker bepalen de laadtijd. Daarom beloven we geen vaste score zonder je site te bekijken."
    },
    {
      "kop": "Wat doet WordSwap?",
      "tekst": aanbod.omschrijving
    },
    {
      "kop": "Moet ik overstappen om sneller te worden?",
      "tekst": "Nee. Afbeeldingen verkleinen, caching of andere hosting kan voldoende zijn. De meerwaarde van WordSwap is de combinatie van een statische website en aanpassen via chat. Kies de oplossing die bij je website en beheer past."
    },
    {
      "kop": "Wat betekent dit voor zoekmachines?",
      "tekst": aanbod.seo
    }
  ],
  "slug": "wordpress-website-traag",
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
