import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {"title": "Een trage WordPress-site? Bekijk eerst waar het aan ligt.", "description": "Afbeeldingen, scripts, plugins en hosting kunnen je site vertragen. Soms is optimaliseren genoeg. Wil je ook af van WordPress-beheer, kijk dan hier.", "alternates": {"canonical": "/wordpress-website-traag"}};
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
      "vraag": "Waarom is een WordPress-site vaak traag?",
      "antwoord": "Bij elk bezoek moet WordPress de pagina eerst nog bouwen: database raadplegen, thema en plugins laden, en dan pas versturen. Elke plugin doet daar een schepje bovenop. Cache-plugins verzachten dat, maar blijven een pleister op een systeem dat per bezoek werk doet."
    },
    {
      "vraag": "Hoeveel sneller wordt mijn site bij WordSwap?",
      "antwoord": "Je pagina's staan bij ons kant-en-klaar op een wereldwijd netwerk, dus de bouwtijd per bezoek vervalt helemaal, en je foto's krijgen automatisch snelle formaten voor telefoons. We meten het eerlijk: vóór de overstap en erna, met dezelfde meetlat (Google Lighthouse), en je ziet beide cijfers. Harde beloftes vooraf doen we niet, want elke site is anders."
    },
    {
      "vraag": "Helpt een snellere site ook voor Google?",
      "antwoord": "Ja. Snelheid telt mee in de ranglijst van Google, vooral op telefoons. En belangrijker: bezoekers haken af bij trage pagina's, dus elke seconde winst is ook gewoon meer mensen die je verhaal echt lezen."
    },
    {
      "vraag": "Wat kost de overstap?",
      "antwoord": aanbod.prijs
    }
  ]
}} />; }
