# Prompt voor Codex: kan deze website naar WordSwap?

Geef dit als opdracht aan de scan. Hij kijkt naar de pagina's van een bedrijf
en beantwoordt één vraag: kunnen wij deze site overzetten zoals hij is, en zo
niet, wat is er dan aan de hand?

De herkenningspunten hieronder komen uit onze eigen opleveringspoort
(`lib/verlies.ts`). Die controleert bij elke migratie of er iets verdwenen is,
dus het zijn dezelfde signalen waar wij zelf op afgaan.

---

## De opdracht

> Je bekijkt de website van een bedrijf en beoordeelt of hij door WordSwap kan
> worden overgezet naar een statische site.
>
> Wat WordSwap maakt: losse HTML-pagina's zonder server en zonder database. De
> site staat op een snel netwerk, heeft geen updates of plugins nodig, en de
> eigenaar past hem daarna aan door te typen in een chat of een WhatsApp-bericht
> te sturen. De site gaat **exact** over: zelfde indeling, teksten, beelden,
> kleuren en gedrag.
>
> Alles wat in de browser van de bezoeker draait, gaat gewoon mee. Alles wat
> een server nodig heeft om te dénken (inloggen, bestellen, zoeken in een
> database, een reservering vastleggen) gaat niet mee, tenzij het bij een
> externe partij draait waar we naartoe kunnen linken.
>
> Loop de lijst hieronder af, en meld per onderdeel: aangetroffen of niet, waar,
> en in welke categorie het valt. Verzin niets: noem alleen wat je op de pagina
> daadwerkelijk hebt gezien, en zeg erbij op welke pagina.

---

## 1. Gaat gewoon mee

Niet melden als probleem; wel noemen als het er is, want het zegt iets over
het soort site.

| Onderdeel | Waaraan je het ziet |
|---|---|
| Pagina's, teksten, foto's, kleuren, indeling | vanzelfsprekend |
| Contactformulier | `<form>` met tekstvelden, vaak Contact Form 7 (`wpcf7`), Gravity Forms, Elementor-formulier |
| Fotogalerij, slider, lightbox | `swiper`, `slick`, `lightbox`, `gallery` |
| Video en geluid | `<video>`, `<audio>`, YouTube- of Vimeo-insluiting |
| Zoekfunctie | `searchform`, `type="search"`, `role="search"`, `name="s"` |
| Vertaalknop | `gtranslate`, `goog-te-`, `translate_element`, `wpml-ls` |
| Google Maps, cookiemelding, chatwidget | insluitcode van derden |
| Animaties bij het scrollen | `aos`, `wow`, `animate__`, Revolution Slider |

De zoekfunctie en de vertaalknop staan hier met opzet bij: die draaien in de
browser en zetten wij als bouwsteen terug.

## 2. Kan niet, of niet zonder gesprek

Dit zijn de dingen die een migratie ingewikkeld maken. Meld ze altijd, ook als
ze klein lijken.

| Onderdeel | Waaraan je het ziet | Wat het betekent |
|---|---|---|
| **Webshop** | `woocommerce`, `add-to-cart`, `wc-block`, winkelwagen, "bestel", prijzen met afrekenknop | Wij doen geen betalingen. Kan alleen als de verkoop bij een externe partij draait waar we naartoe linken. **Geen goede kandidaat voor een koude mail.** |
| **Ledeninlog of besloten gedeelte** | `wp-login.php`, `login-form`, "mijn account", `my-account`, ledenpagina | Apart gesprek. Niet koud benaderen. |
| **Reserveren of afspraken met bevestiging** | boekingswidget, "reserveer", "boek nu", tijdsloten, Salonized, Treatwell, Formitable | Heeft een server nodig. Alleen als het bij een externe partij draait. |
| **Reacties onder berichten** | `comment-form`, `commentlist`, `id="respond"` | Nog geen bouwsteen. Melden bij de klant. |
| **Aanmelden voor een nieuwsbrief** | `mailpoet`, `mc4wp`, `mailchimp`, `es_subscription`, `newsletter-form` | Nog geen bouwsteen. Melden. |
| **Agenda met evenementen** | `ai1ec`, `tribe-events`, `events-calendar`, `em-calendar`, `.ics` | Kan, maar wordt een gedeelde agenda met een abonneerbare link. Dus: wel mogelijk, wel een gesprek. |
| **Live gekoppelde voorraad** | occasions van een autobedrijf, woningaanbod van een makelaar, vacaturebank, koersen | Technisch mogelijk maar nog niet gebouwd. **Nooit beloven.** Melden als context. |

## 3. Hoe je het meldt

Per website, kort:

- **Omzetbaar zoals hij is.** Niets uit lijst 2 gevonden.
- **Omzetbaar, met één punt van aandacht.** Eén ding uit lijst 2 dat een
  gesprek vraagt (agenda, nieuwsbrief, reacties). Noem welk, en op welke pagina.
- **Eerst bellen.** Webshop, ledeninlog of een boekingssysteem. Noem wat je
  zag en waar.

Zeg er altijd bij hoeveel pagina's je gezien hebt en welke je bekeken hebt.
Geef geen inschatting van de prijs of de doorlooptijd.

## 4. Twee regels waar je niet vanaf mag wijken

**Alleen wat je gezien hebt.** Zag je iets maar op één plek en twijfel je of het
er echt staat, meld het dan als "eenmalig gezien" en niet als feit. Een mail
die ergens op gebaseerd is wat niet klopt, maakt een bedrijf nooit meer goed.

**Techniek is geen bevinding.** Schrijf op wat een bezoeker of de eigenaar
merkt, niet welke plugin je vond. Dus niet "WooCommerce 8.2 aangetroffen" maar
"er wordt online besteld en afgerekend op de site".

---

## Wat je hier níét bij nodig hebt

Prijzen, de toon van de mail en wat we wel of niet beloven staan in
`docs/cowork-briefing.md`. Dit document gaat alleen over de vraag of een site
technisch overzetbaar is.
