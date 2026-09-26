---
name: migreer-klant
description: Migreer een WordPress-site naar een statische WordSwap-klantsite, volledig vanuit Claude Code (geen API-pijplijn). Standaard rechtstreeks vanaf de live site (alleen een URL nodig); een WXR/XML-export is optioneel. Gebruik bij een nieuwe klant-migratie, "kopieer/bouw de site van klant X", of een aangeleverde export.
---

# WordPress-klant migreren via Claude Code

Jos geeft een site-URL (standaard) of een WordPress-export (XML, evt. .gz) en een korte repo-naam (kebab-case, max 40 tekens). Aanwijzingen van Jos ("laat Actueel weg") gaan vóór alle onderstaande regels.

**Standaardroute = de live site.** Een volledige migratie werkt normaal gesproken rechtstreeks vanaf de publieke site (zie Stap 1B) — de klant hoeft nergens voor in te loggen. De XML-export is een optionele bonus, niet het startpunt. Vraag er alleen om bij (1) een site met veel blogposts (reacties en exacte publicatiedata zitten niet in de live HTML), of (2) als beeldkwaliteit zwaar telt en de live site alleen verkleinde versies geeft — en zelfs dan kan "mail me je originele foto's" makkelijker zijn.

**Lukt scrapen niet, dan STOP je en meld je dat DUIDELIJK aan Jos** — niet stilletjes half werk leveren. Signalen: pagina's komen leeg/geblokkeerd terug (bot-detectie, WAF/Cloudflare-challenge, 403's ook mét crawl-delay en normale user-agent), content wordt pas client-side opgebouwd en ontbreekt óók in de Playwright-render, de site zit achter een login, of de sitemap/paginalijst is niet te achterhalen. Meld concreet wát er misgaat en adviseer dan de XML-route (of gerichte aanlevering door de klant) als alternatief.

## Snelmodus: VOORPROEFJE (alleen homepage, zonder export)

Zegt Jos "maak een voorproefje van <url>" (voor een lead uit de advertentie of outreach), dan geldt NIET het stappenplan hieronder, maar deze lichte route — doel: binnen ~30 minuten een echte link die de lead kan bekijken. Er is géén WordPress-export; je werkt vanaf de live site.

1. Haal de live homepage op (Playwright: gerenderde HTML + screenshot desktop/mobiel + computed styles van de kernonderdelen). Download alleen de afbeeldingen die op de homepage staan, naar webp.
2. Bouw één schone statische homepage in `~/wordswap-klanten/proef-<naam>/` — zelfde ontwerp en teksten als het origineel (de herkenbaarheids-eis geldt onverkort), platte HTML + één stijl.css, geen WordPress-sporen.
3. Voorproefje-regels:
   - Bovenaan een smalle, nette balk: "Voorproefje door WordSwap — je echte website is niet aangepast. Zo zou hij eruitzien zonder WordPress."
   - Interne links naar andere pagina's werken niet in het voorproefje: laat ze staan maar laat ze scrollen naar een klein blok onderaan: "In de echte overstap gaan al je pagina's mee."
   - Formulieren tonen maar niet werkend; knop met dezelfde melding.
   - `<meta name="robots" content="noindex">` — dit mag nooit gaan concurreren met de echte site van de lead.
4. Deploy als worker `proef-<naam>` (zelfde deploy-route als klantsites, subdomein aanzetten) en geef Jos de link `https://proef-<naam>.wordswap.workers.dev`. GEEN site-registratie in de database, geen GitHub-repo nodig.
5. Meld aan Jos: de link, wat er meegenomen is, en eventuele aandachtspunten voor de echte migratie (embeds, webshop-signalen, rare opbouw). Jos beoordeelt vóór de lead de link krijgt.
6. Opruimen: voorproefjes die ouder zijn dan een maand mogen weg (worker verwijderen + map weggooien) zodra Jos dat vraagt.

## Stap 0 — Leerpunten lezen (verplicht)

Lees EERST `.claude/skills/migreer-klant/LEERPUNTEN.md` — de lessen uit eerdere migraties. En andersom: **leer je tijdens deze migratie iets nieuws** (een valkuil, een plugin-patroon, een betere aanpak), dan voeg je dat DIRECT toe aan LEERPUNTEN.md, meld je het aan Jos, en commit je het mee. Zo wordt elke migratie beter dan de vorige.

## Stap 0B — Bouwintake (verplicht, vóór je gaat oogsten)

Waarom dit er is: welke bouwstenen een site krijgt werd tot nu toe per klant in
het moment besloten. Dat gaat goed zolang het vers in je hoofd zit en daarna
niet meer. Een kunstenaar krijgt de werken-module, een zorgpraktijk de strengere
formulierstand, een vereniging bedragen inclusief btw. Vergeet je dat, dan merk
je het pas na de oplevering.

**Het principe: vraag NOOIT wat je kunt zien.** Eerst kijken, dan pas vragen.
Vraag je een kunstenaar of hij een galerij heeft, dan weet hij dat je niet
gekeken hebt.

### B1. Eerst zelf kijken (5 minuten, geen AI-kosten)

Verzamel dit van de live site en meld het in één overzicht aan Jos:

- **Omvang**: aantal pagina's en berichten uit de sitemap, aantal producten of
  items als die er zijn.
- **Bouw**: WordPress-versie, thema, pluginlijst uit de HTML.
- **Wat er extern draait** en dus gewoon meekan: boekingssysteem, webshop op een
  ander domein, nieuwsbriefdienst (MailerLite, Laposta, Mailchimp), video
  (Vimeo/YouTube), vertaalwidget, kaarten. Zoek op scripts van derden in de
  `<head>`.
- **Wat er IN WordPress draait** en dus niet meekan zoals het is: WooCommerce
  met een werkende afrekenpagina, ledeninlog, een feed die server-side wordt
  ingebakken (Smash Balloon).
- **Certificaat**: `openssl s_client` → uitgever en vervaldatum. Let op de
  looptijd: een certificaat van 40 dagen vernieuwt zichzelf, een jaarcertificaat
  vaak niet. Een verlopen certificaat is een spoedgeval; een certificaat dat
  zichzelf vernieuwt is géén verkoopargument (dat is een keer fout gegaan).
- **Snelheid op mobiel**: Lighthouse. Meet ALTIJD mobiel, niet alleen desktop:
  bij rolandbroekhuis.nl was desktop 98 en mobiel 53.
- **Dode pagina's**: pagina's in de sitemap die nergens meer heen gaan of bij
  een afgeschafte functie horen (oude `/cart/`, `/checkout/`, themavoorbeelden
  als `/left-sidebar/`). Die kwamen bij drie van de vier laatste sites voor.

### B2. Dan pas vragen (aan Jos, niet aan de klant)

Deze zeven kan een scan niet beantwoorden. Stel ze in één keer, kort. Weet Jos
het antwoord niet, dan is dat het signaal dat hij het nog moet vragen VOORDAT er
gebouwd wordt. Noteer dan letterlijk "niet gevraagd" in plaats van iets aan te
nemen: een stille aanname is duurder dan een open vraag.

1. **Wat voor bedrijf is dit?** Bepaalt de modules. Kunstenaar of fotograaf →
   werken plus catalogusformulier. Zorg of juridisch → de strengere
   formulierstand (zie `lib/formulier-privacy.ts`). Vereniging of stichting →
   bedragen inclusief btw noemen.
2. **Wat gaat de klant zelf doen, en hoe vaak?** Wie nooit iets wijzigt heeft
   iets anders nodig dan wie wekelijks werk toevoegt.
3. **Wat moet er juist NIET mee?** Verouderde pagina's, oude prijzen, een
   afgeschafte webshop. Vraag je dit niet, dan zet je hun rommel netjes over.
4. **Wat komt er binnenkort bij?** Een tweede taal, een webshop, een nieuwe
   dienst. Wil iemand over drie maanden verkopen, dan weet je nu al dat die
   winkel extern moet.
5. **Komen er gevoelige gegevens in de formulieren?** Bepaalt de bewaarstand.
6. **Bij veel beeld: hoe scherp moet het?** Bij een kunstenaar of fotograaf is
   dat dé vraag. Beloof nooit afdrukresolutie.
7. **Wat vindt de klant nu het vervelendst aan zijn site?** Geen technische
   vraag, wel de beste. Daar hoor je wat hij écht wil.

### B3. Vastleggen

Schrijf het resultaat naar `~/wordswap-klanten/<repo>-bron/bouwintake.md`: wat
je gevonden hebt, de antwoorden (of "niet gevraagd"), en daaruit afgeleid **de
modulelijst**: welke bouwstenen krijgt deze site. Neem die lijst over in de
oplevering, zodat later te zien is wat er bewust wel en niet in zit.

Ga pas naar Stap 1B als dit bestand er staat.

## Stap 1B — Voorwerk vanaf de LIVE site (standaardroute, geen export)

Doel: dezelfde bron-map opbouwen als de XML-route (`~/wordswap-klanten/<repo>-bron/` met `oud-ontwerp/`, `seo-manifest.json`, `afbeeldingen-op-paginas.json`, `embeds-op-paginas.json`, `media-map.json`), maar dan geoogst van de publieke site.

1. **Paginalijst**: probeer achtereenvolgens `robots.txt` (Sitemap-regel), de daar genoemde sitemap, en `/wp-sitemap.xml` (de core-sitemap; robots kan naar een Yoast-`sitemap.xml` wijzen die 404 geeft). Geen van alle bruikbaar → menu + interne links van de homepage crawlen. Lukt óók dat niet → melden aan Jos (zie kop: scrapen niet mogelijk).
2. **Respecteer `Crawl-delay`** uit robots.txt (en gebruik een normale browser-user-agent); zonder pauze kunnen pagina's leeg terugkomen.
3. **Oogsten met Playwright** per pagina: gerenderde HTML, fullpage-screenshots desktop (1440) + mobiel (375), volledig doorscrollen voor lazy content, en daarna verzamelen: title/meta description/h1's (→ `seo-manifest.json`), alle `<img>`-src's én computed `background-image`s (→ `afbeeldingen-op-paginas.json`), iframes/video's (→ `embeds-op-paginas.json`), JSON-LD.
3b. **ONDERDELEN-INVENTARIS (verplicht, vangnet tegen vergeten bouwstenen)**: draai `npx tsx scripts/onderdelen-inventaris.mts <repo> <homepage-url> <detailpagina-url> <contact-url>` (vanuit ~/wordpress2ai). Dat levert `<repo>-bron/onderdelen-inventaris.md`: een afvinklijst per pagina van topbalk, deelknoppen, naar-boven-knop, sliders, uitgelichte-berichten-blokken, hover-effecten, kruimelpad, vorige/volgende, formulieren, embeds, enz. — gemeten op desktop ÉN mobiel (dus ook "alleen mobiel"-gedrag zoals swipe-rijen). Elk item komt terug in de kopie of wordt bewust weggelaten met reden in de oplevering. Vink de lijst af vóór stap 3 van de controle. (Les ovbuRo: topbalk, deelknoppen en naar-boven-knop waren allemaal gemist omdat ze niet opvielen op fullPage-screenshots.)
3c. **SEO-VASTLEGGING (verplicht, vóór je iets bouwt)**: zet de paginalijst uit stap 1 in `<repo>-bron/paden.txt` (één pad per regel, ook oude belangrijke adressen buiten het menu) en draai `npx tsx scripts/seo-vergelijk.mts vastleggen <oude-site-url> <repo>-bron/paden.txt <repo>-bron/seo-baseline.json`. Dat legt per pagina titel, omschrijving, canonical, robots, X-Robots-Tag, doorverwijzing, og-tags en JSON-LD vast. De bouw-controle vergelijkt de nieuwe site daarmee (regel `seo-overname`, lib/seo-overname.ts): wat de oude pagina had en de nieuwe niet is een FOUT (deelplaatje, deeltekst, artikeldatum), wat anders is een waarschuwing. Zonder vastlegging valt hij terug op `oud-ontwerp/`, maar die mist headers en doorverwijzingen. Ook bij de XML-route doen: de live site is de bron.
4. **CONTROLE dat het oogsten écht gelukt is**: elke pagina heeft niet-lege HTML met de verwachte teksten, en de screenshots tonen de echte site (geen challenge-pagina, geen leeg wit vlak). Twijfel of blokkade → STOP en meld het aan Jos met wat je wel/niet binnenkreeg; ga niet bouwen op een halve oogst.
5. **Beelden**: per beeld-URL eerst het origineel proberen door `-scaled` en `-WxH`-maatsuffixen uit de bestandsnaam te strippen; daarna pas de getoonde versie. Converteren naar webp (max 2000px, q82), dedupliceren op basisnaam, mapping in `media-map.json`, mislukte downloads in `ontbrekende-media.txt`.
6. **Beperkingen benoemen** in de oplevering: concepten/niet-gepubliceerde pagina's, reacties onder blogposts en plugin-data zitten niet in de live site — meld of dat hier speelt (bv. veel blogposts) en of de XML alsnog gewenst is.

Daarna gewoon door naar Stap 2; overal waar naar `bronmateriaal/` of het manifest wordt verwezen geldt je geoogste materiaal.

## Stap 1 — Mechanisch voorwerk vanaf een XML-export (optionele route)

Alleen als Jos een export aanlevert of er bewust om is gevraagd (zie boven):

```bash
npx tsx --env-file=.env.local scripts/voorbereiden.mts <xml-pad> <repo-naam>
```

Resultaat:
- `~/wordswap-klanten/<repo>-bron/` — `bronmateriaal/` (één bestand per pagina, met pad/titel/samenvatting in commentaar bovenaan), `seo-manifest.json`, `oud-ontwerp/` (gerenderde HTML, CSS, screenshots desktop+mobiel, `bestek-*.json` met computed styles, `afbeeldingen-op-paginas.json`, `embeds-op-paginas.json`), `media-map.json`
- `~/wordswap-klanten/<repo>/` — de bouwmap, met `afbeeldingen/` al gevuld (gededupliceerd, webp)

Eerste Playwright-run lokaal: zo nodig eenmalig `npx playwright install chromium`.
Meld aan Jos wat het overzicht toont (aantal pagina's/berichten/media + welke post-types zijn overgeslagen) en vraag zo nodig om aanwijzingen vóór je bouwt.

## Stap 2 — De site bouwen in `~/wordswap-klanten/<repo>/`

Bekijk EERST de screenshots en het bestek in `oud-ontwerp/`. Bouw platte HTML + één `stijl.css`. De volledige regels (zelfde eisen als de API-pijplijn in lib/bouw.ts):

**Structuur & SEO**
- **DE NORM: EXACT OVERZETTEN.** De nieuwe site is dezelfde site: zelfde indeling, beelden, teksten, kleuren, beweging en gedrag. Geen eigen ontwerpkeuzes, niets vereenvoudigen. Werkt iets alleen dankzij een plugin, bouw het dan na zodat het er hetzelfde uitziet en zich hetzelfde gedraagt. Kan iets écht niet zonder server: noteren in ontbrekende-media.txt, niet stilletjes vervangen door iets kleiners. Alles wat de bezoeker zag en wat er niet meer is, is verlies, ook zonder foutmelding.
- Elke bronpagina op EXACT haar URL-pad: "/over-ons/" → `over-ons/index.html`, "/" → `index.html`. Titel als `<title>`, samenvatting (of eerste zinnen) als meta description; zie ook `seo-manifest.json`. Canonical/og-tags met placeholder-domein `https://VERVANG.nl`.
- Ontdo de content van shortcodes ([...]), inline styles, CSS-escape-artefacten (zoals \25BE) en wrapper-divs; behoud teksten, koppen (h1/h2-structuur) en opbouw.
- Berichten (type post): ook een blogoverzicht op `blog/index.html` met links, als er berichten zijn.
- Afbeeldingen: oorspronkelijke bestandsnamen én alt-teksten behouden (Google Afbeeldingen); ontbreekt een alt, schrijf een korte feitelijke.
- Structured data (JSON-LD) uit de bron-HTML van de LIVE site overnemen (Yoast zet bedrijfsgegevens/openingstijden/reviews als `application/ld+json` — zit niet in de WXR-export); adressen bijwerken naar het nieuwe domein.
- `og:image` per pagina overnemen + één site-brede fallback (deelplaatje WhatsApp/LinkedIn).
- FAVICON VERPLICHT: neem het favicon van de live site over (`<link rel="icon">` in de bron-HTML, anders `/favicon.ico`). Heeft de oude site er géén (WordPress-standaard of 404), maak er dan een van het beeldmerk uit het eigen logo — nooit zelf tekenen. Lever `favicon.ico` (VERPLICHT, 16+32+48 in één bestand) + `favicon-32.png` + `apple-touch-icon.png` (180px, zonder doorzichtige achtergrond) in de wortel; `favicon.svg` mag erbij maar nooit in plaats van de .ico. Safari negeert svg-iconen vaak en valt terug op `/favicon.ico`: staat die er niet, dan blijft het tabblad leeg. En zet in een svg-favicon NOOIT een `<text>`-element: een favicon wordt zonder het lettertype van de site getekend, dus die letter valt weg. Maak er een vorm van of zet de letter als beeld in de svg. Zet de drie `<link>`-regels CENTRAAL in `delen/favicon.html` en plaats op ÉLKE pagina in de `<head>` alleen `<!--invoeg:favicon-->` (ook 404, bedankt en sjablonen voor nieuwe pagina's) — nooit de regels per pagina kopiëren, dan moet een nieuw favicon later op alle pagina's apart. Eindcontrole: alle drie de bestanden geven 200 op workers.dev, en elke pagina (behalve fragmenten in delen/) bevat de favicon-marker.
- FOOTER-CREDIT: laat een bestaande makersvermelding ("Ontwikkeld door X") staan en voeg eraan toe: `| Omgezet door <a href="https://wordswap.nl/">WordSwap</a>`. Geen vermelding in het origineel: alleen de WordSwap-regel in de voetbalk.
- TOPBALK NIET MISSEN: kijk naar een viewport-screenshot van de BOVENKANT (niet alleen fullPage). In een fullPage-shot schuift de sticky kopbalk vaak over de topbalk (telefoon/e-mail/sociale iconen) heen, waardoor die onzichtbaar lijkt. Zoek in de bron-HTML ook op `top-bar`/`topbar`/`mini-contacts`.
- Interne links ín teksten direct naar het juiste nieuwe pad — niet op redirects leunen.
- Genereer `sitemap.xml`, `robots.txt`, `_headers` (X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Strict-Transport-Security: max-age=31536000; includeSubDomains, Content-Security-Policy: frame-ancestors 'self' https://wordswap.nl https://www.wordswap.nl — NOOIT X-Frame-Options: die blokkeert het portaalvoorbeeld op wordswap.nl) en `llms.txt` (markdown: "# Bedrijfsnaam", blockquote met feitelijke beschrijving, "## Pagina's"-lijst met per pagina één zin; niets verzinnen).
- **CUSTOM POST TYPES**: diensten, teamleden, vacatures, projecten zitten vaak NIET in de export (het voorbereid-script meldt ze als overgeslagen). Haal die pagina's van de live site (curl + tekst extraheren) en bouw ze wél — anders missen er pagina's.

**Ontwerp**
- ONTWERP OVERNEMEN: bestudeer screenshots + CSS in `oud-ontwerp/`. Kleurenpalet, lettertypen (Google Fonts als het origineel die gebruikt), header-opbouw (logo/topbalk/menu), hero met achtergrondbeeld, knopstijlen, fotogrids. De eigenaar moet z'n eigen site direct herkennen — geen generiek sjabloon.
- MAATVAST: border-radius, schaduwen, exact kolomaantal per sectie, blokvolgorde, hero-hoogtes, sectie-achtergronden letterlijk uit `bestek-*.json` en de screenshots. "Ongeveer" is niet goed genoeg — meet na.
- SCHONE CODE, GEEN WORDPRESS-SPOREN: de kopie is visueel identiek maar de code is 100% eigen en zo clean mogelijk. Dus: semantische HTML (header/nav/main/section/footer), minimale nesting (nooit de div-torens van paginabuilders nabouwen), eigen korte Nederlandse classnamen, één eigen stylesheet. VERBODEN in de output: wp-*, elementor-*, et_pb_*, vc_*, fusion-* en andere thema-/builder-classes, WordPress-comments, inline builder-styles, en gekopieerde thema-CSS. De gerenderde bron (oud-ontwerp/) is uitsluitend REFERENTIE om te meten en te vergelijken — nooit om markup uit over te nemen.
- DECORATIE HOORT ERBIJ: sfeerbeelden uit het thema (wolken, golven, patronen als CSS-achtergrond) terugplaatsen op de juiste secties.
- SLIDERS per soort (nooit leeg of nagemaakt): beweging is het uitgangspunt. Hero-slider → binnenkomst nabouwen met CSS-keyframes en getrapte vertragingen (kop, ondertitel, knoppen ná elkaar), meerdere slides → CSS-crossfade met de echte beelden; alleen bij één slide statisch. De tekst van élke slide blijft, desnoods als sectie eronder. Voorbeeld: evc-autotechniek. Altijd met @media (prefers-reduced-motion: reduce) alles uit.
- Mobiel-eerst: viewport-meta, geen vaste breedtes, geen horizontale scroll op 375px, leesbare tekst, aantikbare knoppen (≥44px), hamburger-menu bij veel items.

**Beelden**
- AFBEELDINGEN VERPLICHT: `afbeeldingen-op-paginas.json` toont per pagina wat er stond; `media-map.json` koppelt URL's aan lokale bestanden. Een pagina die in het origineel beeld had maar bij jou kaal is, is FOUT. Hero's als CSS-background, grids als grid, losse foto's inline — mét alt-tekst.
- KLEINE BEELDEN HOREN ERBIJ: USP-iconen, partnerlogo's, keurmerken, portretfoto's zijn net zo verplicht als grote foto's. Let op lazy-loading (`data-src`) bij het oogsten.
- NAMAKEN VERBODEN: nooit zelf logo's/illustraties tekenen of initialen-rondjes als vervanging. Alleen echte bestanden uit `afbeeldingen/`. Ontbreekt iets: van de live site downloaden (sharp → webp, max 2000px, q82); lukt dat niet, noteer de URL in `ontbrekende-media.txt` en meld het.

**Inhoud & links**
- EMBEDS VERPLICHT: elke YouTube/Vimeo/Maps-iframe en `<video>` uit `embeds-op-paginas.json` letterlijk terug op de juiste pagina, responsief (max-width 100%, aspect-ratio).
- GEEN PLACEHOLDER-TEKST: lorem ipsum en Engelse thema-restanten ("Principles of our work") nooit overnemen — sectie weglaten of vullen met echte content. Eindcontrole hierop.
- REEKSPLEKKEN MARKEREN: elke plek waar een berichten-/projectreeks getoond wordt krijgt een `data-selectie`-attribuut op de omhullende container: `data-selectie="volledig"` als álle items er staan (overzichtspagina, volledig fotogrid, footer met alle items) en `data-selectie="uitgelicht"` als het een keuze is (drie tegels op de homepage, "laatste 4" in de footer). De portaal-AI gebruikt dit om bij een nieuw bericht de juiste vraag te stellen ("waar wil je dit tonen?"). Noem in de oplevering per reeks alle plekken.
- OVERZICHTEN KLIKKEN DOOR: elk overzichtsblok (diensten, team, blog) linkt per item (titel én beeld) naar de detailpagina, en andersom (terug-link/kruimelpad).
- TAGS & CATEGORIEËN: gebruikt de site tags/categorieën zichtbaar (tagwolk, taglinks bij berichten, categorienavigatie)? Bouw dan statische VERZAMELPAGINA'S op de originele paden (`tag/<slug>/index.html`, `category/<slug>/index.html`): kop met tagnaam + lijst van bijbehorende berichten (titel, datum, samenvatting, link), in de stijl van het blogoverzicht, met terug-link. De koppeling bericht↔tags staat in de bronmateriaal-koppen en in `<repo>-bron/tags-overzicht.json`. Tagwolk blijft dus gewoon klikbaar. Alleen bij verwaarloosbaar gebruik (1-2 losse links) ontlinken. Auteur-/datumarchieven (/author/, /2023/05/) niet bouwen → die links naar het blogoverzicht.
- GEEN DODE LINKS: eindcontrole — elke interne link wijst naar een gebouwde pagina.

**Techniek**
- CENTRALE ONDERDELEN: alles wat op ≥2 pagina's identiek is één keer in `delen/` (VERPLICHT: menu.html, footer.html, topbalk.html als die er is, en favicon.html in de `<head>`; verder ook formulieren die op meerdere pagina's staan en referenties-/CTA-/actueel-blokken), op pagina's alleen `<!--invoeg:naam-->`. LET OP: `delen/` in de wortel van de klant-map (naast index.html) — wordt bij deploy uitgevouwen. Actieve menustand via klein pad-scriptje, nooit menu kopiëren per pagina.
- Zet vlak voor `</body>` van elke pagina: `<script>try{parent.postMessage({type:"wp2ai-pagina",pad:location.pathname},"*")}catch(e){}</script>` (mag ook weggelaten worden: de deploy injecteert hem zelf).
- STANDAARD-PAGINA'S: bouw ALTIJD een `404.html` — met ABSOLUTE paden (/stijl.css, /afbeeldingen/…, /contact/) want die pagina kan op elk willekeurig adres verschijnen in de wortel van de site — zelfde kop/menu/footer als de rest (delen/-markers), vriendelijke tekst in de toon van het bedrijf, knoppen naar home en contact, `<meta name="robots" content="noindex">`. Cloudflare serveert die automatisch bij een onbekend adres. Idem voor `bedankt/index.html` (zie formulieren). Controleer aan het eind dat beide bestaan.
- FORMULIEREN: elk formulier van de oude site nabouwen met dezelfde velden, `method="POST" action="https://wordswap.nl/api/formulier"`, verborgen `_site=<repo>`, `_formulier=<kebab-naam>`, `_bedankt="/bedankt/"` en honeypot `_extra` (leeg, visueel verborgen, tabindex -1). Bouw óók een eigen bedankt-pagina op `bedankt/index.html` in de stijl van de site (persoonlijke tekst passend bij het bedrijf, terug-knop naar home, meta robots noindex) — de bezoeker landt daar na het versturen; heeft de invuller een e-mailadres opgegeven, dan krijgt hij automatisch een bevestigingsmail. Bij niet-contactformulieren (aanmelding, nieuwsbrief, bestelling) geef je met verborgen veld `_bevestiging` een passende maildtekst mee (bv. "Leuk dat je je hebt aangemeld…") — zonder dat veld krijgt de invuller de standaard "we nemen contact op"-tekst, en die past daar niet. NOOIT velden voor BSN, betaal-/bankgegevens, wachtwoorden of medische informatie — meld dat WordSwap daar een veilige oplossing voor opzet. BESTANDSUPLOAD (cv, offerte-bijlage e.d.) wordt ondersteund: geef het form `enctype="multipart/form-data"` en een `<input type="file" name="cv" accept=".pdf,.doc,.docx,.odt,.rtf,.txt">`; toegestaan pdf/doc/docx/odt/rtf/txt/jpg/png, max 2 bestanden à 5 MB, ze gaan als bijlage mee in de notificatiemail naar de klant. Heeft de bron-site een uploadveld: exact nabouwen, nooit vervangen door een mailto-link. LET OP, formulieren van EXTERNE DIENSTEN zijn de uitzondering: een insluitcode van ActiveCampaign, Mailchimp, MailerLite, Laposta, Calendly en vergelijkbare diensten (script, iframe of div met embed-code) neem je 1-op-1 over en bouw je NOOIT om naar ons endpoint — dan breken hun opvolgmails, lijsten en automatiseringen. Alleen formulieren die de oude site zelf verwerkte (CF7, WPForms, Gravity Forms, eigen PHP) bouw je na op ons endpoint.
- Analytics/meetscripts van de eigenaar (GA4, Tag Manager, Meta Pixel, ActiveCampaign-sitetracking, HubSpot, Hotjar, Clarity, cookiebanner) intact overnemen, met dezelfde meetcodes: dan lopen zijn statistieken zonder gat door. Verder géén nieuwe externe scripts of trackers. VERIFICATIE-TAGS horen hier ook bij: een google-site-verification- of facebook-domain-verification-meta-tag in de head neem je 1-op-1 mee, anders verliest de klant zijn Search Console- of Meta-domeinverificatie. Is er nieuwe verificatie nodig, dan regelen WIJ dat: de klant levert de code aan uit Meta/Google, wij zetten hem als meta-tag op de site of als TXT-record in Cloudflare, en de klant klikt alleen nog op Verifiëren. Had de oude site trackers ZONDER cookiebanner, neem het dan óók zo over (de site blijft gelijk) en meld het in één zin aan Jos; hij beslist of daar iets van gezegd wordt. Had de site géén trackers, dan is de kopie cookie-vrij en is er geen banner nodig (noem dat in de oplevering, het is een verkoopargument). STANDAARDVORM: zet alle meetscripts samen in `delen/meten.html` met `<!--invoeg:meten-->` in de head van elke pagina, en start ze pas 1,5 s na de eerste weergave (load + requestAnimationFrame + setTimeout, zelfde meetcodes) — zo hoeft de kopfoto niet op meetcode te wachten; bij Van den Berg ging mobiel Lighthouse zo van 68 naar 94.
- Repareren hoort bij de oplevering: dode links, kapotte afbeeldingen, niet-werkende formulieren en mixed content los je bij de overstap gewoon op, en je meldt aan Jos wát er kapot was (dat is ook verkoopmateriaal — "we hebben meteen X gerepareerd"). Maar het blijft een 95%-kopie: geen herontwerp, geen nieuwe indeling, geen herschreven teksten.
- Achtergrondvideo's (hero-loops) van de oude site neem je mee, maar nooit als origineel bestand: comprimeer met ffmpeg naar H.264 zonder geluid, 720p, doel ±3-8 MB (bv. `ffmpeg -i bron.mp4 -an -vf scale=-2:720 -c:v libx264 -crf 28 -movflags +faststart hero.mp4`), maak een poster van het eerste frame (`ffmpeg -i hero.mp4 -frames:v 1 hero-poster.jpg`), en zet hem in de pagina met autoplay muted loop playsinline preload="metadata" en de poster. Bij prefers-reduced-motion alleen de poster tonen. Was het origineel groter dan 25 MB of technisch te zwaar, meld het aan Jos.
- Video's cookie-vrij insluiten waar dat onzichtbaar is: YouTube via youtube-nocookie.com, Vimeo met ?dnt=1 (zelfde speler, zelfde uiterlijk, alleen geen cookies vóór het afspelen). Maar GELIJKENIS GAAT VÓÓR COOKIE-VRIJ: bestaat er geen onzichtbare cookie-vrije variant (ingesloten Google Maps-kaart, Instagram-blok, andere embeds), dan neem je de embed 1-op-1 over zoals hij op de oude site stond. Nooit een kaart of embed vervangen door een statische link of afbeelding: dat is zichtbaar een andere website.
- PLAKKENDE KOPPEN EN DE ONTWERPBALK: krijgt een kop of menu `position: sticky`/`fixed` met `top: 0`, gebruik dan `top: var(--ws-balk, 0)`. In het ontwerpvoorbeeld zet onze balk die variabele (38px) zodat de kop er netjes onder schuift; op de echte site bestaat de variabele niet en is de uitkomst gewoon 0.
- KNOPPEN BLIJVEN KNOPPEN: een `<a>` waarvan de klasse `button` of `btn` bevat (bluebutton, wp-block-button, elementor-button, ...) is op de oude site een opgemaakte knop; geef hem de knopstijl van de nieuwe site. Nooit stilzwijgend een kale tekstlink laten worden doordat oude klassen gestript zijn.
- ALTIJD `[hidden]{display:none!important}` in stijl.css: een klasse met `display:grid` of `flex` wint anders van het hidden-attribuut, en dan werken filters en uitklappers die `el.hidden` zetten niet.
- OVERZICHTSPAGINA'S TONEN ALLES: een blog-, kenniscentrum- of projectenoverzicht toont álle berichten die je gemigreerd hebt. Het oude raster of de sitemap kan achterlopen op de werkelijke berichten (Van den Berg: 3 artikelen misten al op het oude overzicht) — de berichten zelf zijn de waarheid, niet het oude lijstje.
- Overige kwaliteitseisen: zie `lib/huisregels.ts` (toegankelijkheid, consistentie, taal).

**Controle vóór oplevering (vergelijk-en-verbeter, zoals de pijplijn)**
1. Lokale server starten (let op: markers uitvouwen — of tijdelijk `python3 -m http.server` en markers accepteren) en elke pagina naast de oud-ontwerp-screenshots leggen; verschillen wegwerken.
2. **BOUW-CONTROLE (verplichte poort):** draai vanuit ~/wordpress2ai `npx tsx scripts/bouw-controle.mts <repo>`. Dit is DEZELFDE controle die ontwerp-promoties gebruiken (lib/bouw-controle.ts): formulieren via ons endpoint met alle verplichte velden, markers→delen, geen WordPress-/bouwerklassen, alt-teksten, dode links, titel/description/canonical/og:image, favicon, viewport, 404/bedankt/robots/_headers/llms/sitemap, oud-adres-dekking tegen het seo-manifest, zware beelden, en mobiel (375px-overloop + werkend hamburgermenu, in een echte browser). FOUTEN moeten nul zijn vóór oplevering; waarschuwingen benoem je in de oplevering. Vind je een eis die het script niet dekt: voeg hem toe aan lib/bouw-controle.ts in plaats van hem eenmalig met de hand te checken.
   Daarnaast blijft de beoordeling die geen script kan doen: alle bronpagina's aanwezig, alle afbeeldingen per pagina terug (sectie-voor-sectie naast de screenshots), geen placeholder-tekst, menu/footer overal.
   **DUBBEL-CHECK (verplicht bij elke latere eigen wijziging aan een klantsite):** pas je ná de migratie tekst of foto's aan (rechtstreeks in de repo, dus buiten de portaalchat om), draai dan vóór de deploy `npx tsx scripts/dubbel-check.mts <repo-of-map> [basisref]` vanuit ~/wordpress2ai. Dat is hetzelfde mechanische dubbeling-vangnet als in de portaalchat (lib/consistentie.ts), maar dan tegen de git-historie: elke tekst of foto die je op één plek wijzigde terwijl hij elders exact zo blijft staan, geeft een melding en afsluitcode 1. Beoordeel elke melding: overal doorvoeren, of bewust "alleen hier" (dan is de melding je bevestiging en ga je door).
3. SEO-restpunten die het script niet afdwingt: `<title>`-afwijkingen zijn waarschuwingen — beoordeel per geval (letterlijk gelijk aan het manifest tenzij Jos anders zegt); meta descriptions letterlijk gelijk; h1-koppen behouden; noindex-pagina's ook in de nieuwe site noindex. Bewust weggelaten pagina's als 301 in `_redirects` (het script eist dat elk manifest-adres landt). Rapporteer aan Jos per pagina groen/afwijkend.

   **Elk oud adres MOET landen.** Verhuist een pagina naar een submap (bijv. `/vaco` wordt `/evc-mobiliteit/vaco`), dan is het oude adres zonder 301 een 404 — en verdampt de Google-positie. Loop het manifest daarom na de bouw nog een keer af en controleer per adres: bestaat de pagina op exact dat pad, óf staat er een regel in `_redirects`? Zo niet, voeg de 301 toe. Doel is nul openstaande adressen.
4. **SNELHEIDS-GARANTIE (verplichte Lighthouse-vergelijking oud vs nieuw):** wij verkopen "sneller zonder WordPress", dus dat moet gemeten kloppen. Draai lokaal (geen API-sleutel of quotum nodig):
   ```bash
   npx -y lighthouse <url> --quiet --chrome-flags="--headless" --only-categories=performance --output=json --output-path=stdout
   ```
   Eén keer op de OUDE live site en één keer op de kopie (workers.dev). Eis: de kopie scoort minimaal gelijk en liefst hoger, met een lagere LCP. Scoort de kopie lager → beelden en laadgedrag fixen (zie het beelden-leerpunt: max 1200px/q78, lazy-loading) vóór oplevering. Rapporteer beide scores aan Jos — "Google meet: oud X, nieuw Y" is meteen verkoopmateriaal voor de klant. (De SEO-score op workers.dev is altijd laag door de bewuste noindex; dat is normaal en verdwijnt bij domeinkoppeling.)
5. Screenshots van het resultaat aan Jos laten zien vóór livegang.

## Stap 3 — Registreren en live zetten

```bash
cd ~/wordswap-klanten/<repo> && git init -q 2>/dev/null; git add -A && git commit -q -m "Migratie via Claude Code"
```
Repo remote: `git@github.com:wordpress2ai/<repo>.git` (registreer-klant maakt hem aan als hij niet bestaat).

```bash
npx tsx --env-file=.env.local scripts/registreer-klant.mts <repo> "<Klantnaam>"   # repo + DB-rij + workers + domein (idempotent)
```

Scripts ALTIJD draaien vanuit `~/wordpress2ai` (vanwege .env.local). Herdeploy later: `scripts/deploy-klant.mts <repo>`; een push naar main deployt ook automatisch via de webhook (mits ingesteld).

## Stap 4 — Afronden

- **TERUGWEG-GARANTIE (verplicht vóór de klant zijn oude hosting opzegt):** de klant kan alleen naar WordPress terug met een volledige backup (bestanden + database) — onze statische kopie is daarvoor niet genoeg. Regel dus vóór opzegging een complete export (klant volgt de instructie op wordswap.nl/wordpress-backup-maken — UpdraftPlus, tien minuten; desnoods samen aan de telefoon). De klant krijgt het zipbestand zelf ("jouw data, altijd van jou") en wij bewaren met toestemming twaalf maanden een kopie. Adviseer daarnaast om de oude hosting pas op te zeggen als de nieuwe site een paar weken naar tevredenheid draait — zolang die doorloopt is teruggaan alleen het domein terugwijzen. Zeg dit ook expliciet tegen de klant: "je kunt altijd terug" is onderdeel van het aanbod.
- Live site (`https://<repo>.wordswap.workers.dev`) doorlopen naast de bron; restpunten direct fixen.
- **FAQ-ADVIES (altijd geven, nooit ongevraagd bouwen):** adviseer de klant in de oplevering standaard een vraag-en-antwoordblok (FAQ) toe te voegen, met de vragen die klanten écht stellen (prijs, werkgebied, doorlooptijd, wat wel/niet). Reden: zo'n blok is de beste manier om gevonden en geciteerd te worden in AI-chatbots (ChatGPT, Perplexity, Google AI) en in Google zelf — ons "open voor AI"-argument uit de advertenties. Bouw hem NIET automatisch mee: de inhoud wijkt bijna altijd af van wat de klant zelf zou zeggen. Lever een concept van 5–8 vragen aan als voorstel, en zet hem pas op de site na akkoord; dan ook als FAQPage-JSON-LD én in `llms.txt` opnemen.
- Admin (wordpress2ai-beta.vercel.app/admin): klant verschijnt automatisch; Jos koppelt het klantaccount en vult richtlijnen in. Domein/e-mail: /admin/handleiding bovenaan (MX-check eerst!).
- Eerlijk melden wat niet 1-op-1 kon (bv. externe-plugin-content) — maatwerk of backlog.
- Nieuwe lessen → LEERPUNTEN.md (stap 0).
