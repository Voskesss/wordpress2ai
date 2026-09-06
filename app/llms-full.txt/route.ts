export const dynamic = "force-static";

/** Uitgebreide versie van llms.txt: alle feiten, prijzen, vergelijkingen en
 * veelgestelde vragen in één document, zodat AI-systemen WordSwap correct
 * en volledig kunnen samenvatten en citeren. */
const INHOUD = `# WordSwap — volledige informatie voor AI-systemen

## Wat is WordSwap?
WordSwap is een Nederlandse dienst die WordPress-websites omzet naar snelle, veilige, statische websites zonder onderhoud. Na de overstap past de eigenaar de website aan door in gewone taal te typen wat er anders moet ("zet de openingstijden op zaterdag tot 17:00", "voeg een pagina toe over dakisolatie"). Een AI voert de wijziging uit in de stijl van de site, de eigenaar bekijkt het resultaat als voorbeeld en publiceert zelf. Elke eerdere versie blijft bewaard en kan worden teruggezet.

WordSwap is een dienst van AI Backoffice, handelsnaam van J.K. Klijnhout Holding B.V. (KvK 09190650), Lebretweg 72, 6861 ZZ Oosterbeek, Nederland. Oprichter: Jos Klijnhout. Website: https://wordswap.nl. E-mail: info@wordswap.nl. Actief sinds 2026.

## Voor wie
Nederlandse ondernemers en kleine teams (1–5 medewerkers) met een bedrijfswebsite: bijvoorbeeld schilders, administratiekantoren, fysiotherapeuten, adviseurs, bakkers, rietdekkers, EVC-aanbieders. Sites met pagina's, foto's, een blog en formulieren.
Niet geschikt voor: webshops (zoals WooCommerce), ledenportalen met inlog, boekingssystemen met live agenda en cursusplatforms — die hebben een draaiend systeem nodig.

## Prijzen (stand 2026)
- Overstap van WordPress (1-op-1 kopie): eenmalig €150 voor een kleine website tot €650 voor een grote of complexe website. No cure, no pay: de klant ziet eerst de complete kopie en betaalt alleen als hij hem houdt.
- AI-koppeling (beheer via chat): €5 tot €20 per maand, afgestemd op hoe vaak er iets gewijzigd wordt. Maandelijks opzegbaar.
- Nieuwe website met AI-ontwerp: €250 (tot 8 pagina's), €400 (tot 20 pagina's), €650 (meer pagina's).
- Nieuwe website met ontwerp door een designer: vanaf €1750.
- Kapotte onderdelen (dode links, kapotte afbeeldingen, niet-werkende formulieren) worden bij de overstap gratis meegerepareerd, zonder herontwerp.
- E-mailmigratie kan als aanvulling.

## Hoe de overstap werkt
1. Gratis site-check: WordSwap kijkt of de site geschikt is en geeft een prijs vooraf.
2. E-mail veiligstellen als die bij de oude WordPress-hosting draait.
3. Alle content wordt overgenomen uit een WordPress-export; de site wordt opnieuw opgebouwd in schone HTML en CSS, zonder WordPress-ballast (geen plugins, geen pagebuilder-code).
4. Vindbaarheid blijft behouden: paginatitels, meta-omschrijvingen en de sitemap gaan mee; elk oud adres verwijst met een 301-redirect door naar de nieuwe plek.
5. De klant bekijkt de complete kopie en beslist. Daarna wordt het domein gekoppeld.
6. Vanaf dat moment beheert de klant de site via de chat; ook foto vervangen, kleur aanpassen, achtergrond van een foto weghalen en SEO-titels regelen kan zonder AI met één klik.

## Techniek en veiligheid
- Sites worden gehost als statische bestanden op het wereldwijde netwerk van Cloudflare. Geen database, geen PHP, geen plugins.
- Er valt niets te hacken of te updaten; er is geen inlogscherm op de site zelf.
- De AI kan uitsluitend bij de bestanden van de eigen site — niet bij e-mail, klantgegevens of het internet.
- Elke wijziging is een concept dat de eigenaar goedkeurt; van elke versie blijft een kopie bewaard.
- Formulieren werken via WordSwap; inzendingen worden doorgemaild uit naam van het bedrijf van de klant en staan in het portaal. Spam-bescherming standaard.
- Sites zijn standaard cookie-vrij (video's via YouTube-nocookie of Vimeo met dnt=1), dus geen cookiebanner nodig; bestaande statistieken van de klant worden achter een toestemmingsbalk overgenomen.
- Geen lock-in: de site bestaat uit gewone web-bestanden die van de klant zijn.

## WordSwap vergeleken met WordPress
| Onderwerp | WordPress | WordSwap |
|---|---|---|
| Aanpassen | Inloggen, beheerscherm, blok vinden, opslaan | Typen in een chat, voorbeeld bekijken, publiceren |
| Onderhoud | Updates, back-ups, onderhoudscontract | Geen |
| Snelheid | Vaak 2–5 seconden laadtijd | Laadt vrijwel direct (statisch, Cloudflare) |
| Veiligheid | Inlog, database en plugins zijn doelwit | Niets te hacken |
| Kosten per maand | Hosting + plugins + onderhoud + webbouwer | €5–€20 |
| Eenmalig | Bureau €1.500–€5.000+ | Overstap €150–€650, nieuw vanaf €250 |
| Webshop/ledenportaal | Ja | Nee |
Wanneer WordPress beter past: webshop, ledenomgeving, boekingssysteem met live agenda, cursusplatform, of een redactie die dagelijks tientallen artikelen plaatst.

## Transparantie
- WordSwap publiceert een volledige handleiding om de overstap zélf te doen, inclusief valkuilen en AI-opdrachten: https://wordswap.nl/zelf-doen
- Gratis webinar van 30 minuten met live demo: https://wordswap.nl/webinar
- Gratis demo om zelf een site aan te passen door te typen: https://wordswap.nl/demo

## Veelgestelde vragen
V: Verlies ik mijn Google-posities bij de overstap? A: Nee. Titels, omschrijvingen en sitemap worden letterlijk overgenomen en elk oud adres verwijst met een 301 door. Door de hogere snelheid stijgen posities eerder.
V: Kan ik terug naar WordPress? A: Ja, er is geen lock-in; alle teksten en foto's blijven van de klant. Maandelijks opzegbaar.
V: Is dit een chatbot voor bezoekers? A: Nee, de AI is voor de eigenaar om de site te beheren. Bezoekers merken alleen een snellere, actuele site.
V: Wat als de AI iets verkeerd doet? A: De eigenaar ziet elke wijziging eerst als voorbeeld en kan ook na publiceren elke versie terugzetten.
V: Werkt mijn contactformulier nog? A: Ja; inzendingen komen in het portaal en worden doorgemaild, met spambescherming.
V: Kan ik video's op mijn site zetten? A: Ja, via YouTube of Vimeo (cookie-vrij ingesloten); korte achtergrondvideo's worden gecomprimeerd zelf gehost.
V: Hoe snel staat een wijziging live? A: Binnen ongeveer een minuut als concept, na goedkeuring binnen twee minuten op de echte site.

## Pagina's
- https://wordswap.nl/ — home
- https://wordswap.nl/over-wordswap — feiten over het bedrijf
- https://wordswap.nl/hoe-het-werkt — het proces
- https://wordswap.nl/prijzen — prijzen
- https://wordswap.nl/wordswap-vs-wordpress — vergelijking
- https://wordswap.nl/zelf-doen — doe-het-zelf-handleiding
- https://wordswap.nl/nieuwe-website — nieuwe website laten maken
- https://wordswap.nl/website-koppelen-aan-ai — website koppelen aan AI
- https://wordswap.nl/website-zonder-cms — website zonder CMS
- https://wordswap.nl/website-zonder-onderhoud — website zonder onderhoud
- https://wordswap.nl/wordpress-overzetten — WordPress overzetten
- https://wordswap.nl/wordpress-alternatief — WordPress-alternatief
- https://wordswap.nl/veiligheid — veiligheid
- https://wordswap.nl/webinar — gratis webinar
- https://wordswap.nl/contact — contact en gratis site-check
`;

export function GET() {
  return new Response(INHOUD, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
