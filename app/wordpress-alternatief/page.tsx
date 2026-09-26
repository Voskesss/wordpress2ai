import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {"title": "Een WordPress-alternatief voor wie zelf wil aanpassen", "description": "Wil je vooral teksten, foto’s en diensten actueel houden? WordSwap vervangt WordPress door een statische site die je via een AI-chat beheert.", "alternates": {"canonical": "/wordpress-alternatief"}};
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
      "vraag": "Waarom heeft een site zonder WordPress geen updates nodig?",
      "antwoord": "WordPress is een draaiend systeem: het bouwt elke pagina op het moment dat een bezoeker hem opvraagt, en al die draaiende onderdelen (kern, thema, plugins) moeten bijgehouden worden. Wij zetten je site om naar kant-en-klare pagina's die er gewoon stáán. Er draait niets meer dat kan verouderen, dus er valt ook niets bij te werken."
    },
    {
      "vraag": "Wat gebeurt er met mijn plugins?",
      "antwoord": "Wat een plugin op je site liet zíen (formulieren, galerijen, sliders, SEO-teksten) nemen we mee in de omzetting; het resultaat blijft, de plugin zelf is niet meer nodig. Plugins die iets doén, zoals een webshop of ledenomgeving, zijn een eerlijk gesprek vooraf: dat soort sites past soms beter bij WordPress, en dan zeggen we dat gewoon."
    },
    {
      "vraag": "Is een site zonder WordPress veiliger?",
      "antwoord": "Ja, wezenlijk. De meeste gehackte websites zijn WordPress-sites met een verouderde plugin; er valt daar altijd íets aan te vallen. Bij kant-en-klare pagina's is er geen inlogscherm, geen database en geen plugin om binnen te komen. Er is simpelweg bijna niets om te hacken."
    },
    {
      "vraag": "Wat kost de overstap?",
      "antwoord": aanbod.prijs
    }
  ]
}} />; }
