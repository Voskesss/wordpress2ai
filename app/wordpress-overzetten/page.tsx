import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {"title": "Je WordPress-website overzetten, met overzicht en controle.", "description": "Je wilt eenvoudiger websitebeheer, maar je domein, mail en bestaande inhoud moeten zorgvuldig worden behandeld. WordSwap bekijkt eerst wat er mee kan. Daarna krijg je een prijs en een kopie om te beoordelen.", "alternates": {"canonical": "/wordpress-overzetten"}};
export default function Pagina(){ return <SeoLanding data={{
  "label": "WordPress overzetten",
  "titel": "Je WordPress-website overzetten, met overzicht en controle.",
  "intro": "Je wilt eenvoudiger websitebeheer, maar je domein, mail en bestaande inhoud moeten zorgvuldig worden behandeld. WordSwap bekijkt eerst wat er mee kan. Daarna krijg je een prijs en een kopie om te beoordelen.",
  "blokken": [
    {
      "kop": "Wat nemen we over?",
      "tekst": aanbod.ontwerp
    },
    {
      "kop": "Domein en e-mail uit elkaar houden",
      "tekst": "Je domeinnaam blijft van jou. We bekijken waar je e-mail staat voordat de hosting verandert. Zit die in je huidige hostingpakket, dan bespreken we een eventuele mailmigratie en de aanvullende kosten. Zeg je oude hosting niet op voordat de benodigde onderdelen zijn gecontroleerd."
    },
    {
      "kop": "Wat gebeurt er met Google?",
      "tekst": aanbod.seo
    },
    {
      "kop": "Welke functies kunnen mee?",
      "tekst": aanbod.geschikt
    }
  ],
  "slug": "wordpress-overzetten",
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
