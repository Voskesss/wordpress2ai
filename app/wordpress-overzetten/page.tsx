import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";
import { aanbod } from "@/lib/aanbod";
export const metadata: Metadata = {"title": "Je WordPress-website overzetten, met overzicht en controle.", "description": "Je domein, mail en inhoud moeten zorgvuldig behandeld worden. WordSwap bekijkt eerst wat er mee kan, daarna krijg je een prijs en een kopie.", "alternates": {"canonical": "/wordpress-overzetten"}};
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
      "vraag": "Hoe lang duurt de overstap?",
      "antwoord": "Een gemiddelde bedrijfssite staat meestal binnen enkele dagen als kopie klaar, inclusief onze controles op links, formulieren en vindbaarheid. Jij bekijkt de kopie rustig naast je huidige site; pas na jouw akkoord koppelen we je domein. Grote sites spreken we vooraf door, dan weet je precies waar je aan toe bent."
    },
    {
      "vraag": "Wat moet ik zelf aanleveren?",
      "antwoord": "Alleen je websiteadres. We bouwen de kopie rechtstreeks vanaf je live site, dus je hoeft geen inloggegevens te delen en niets te exporteren. Heb je wel een WordPress-export, dan mag die mee, maar nodig is hij niet."
    },
    {
      "vraag": "Ik wil eigenlijk ook een nieuw ontwerp. Kan dat?",
      "antwoord": "Zeker. Veel klanten stappen eerst één-op-één over (zelfde site, geen risico voor Google) en laten daarna een nieuw AI-ontwerp maken, vanaf €250. Je bekijkt dat ontwerp dan naast je site en beslist zelf of en wanneer je overstapt."
    },
    {
      "vraag": "Wat kost de overstap?",
      "antwoord": aanbod.prijs
    }
  ]
}} />; }
