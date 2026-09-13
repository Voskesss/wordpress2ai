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

## Stap 1B — Voorwerk vanaf de LIVE site (standaardroute, geen export)

Doel: dezelfde bron-map opbouwen als de XML-route (`~/wordswap-klanten/<repo>-bron/` met `oud-ontwerp/`, `seo-manifest.json`, `afbeeldingen-op-paginas.json`, `embeds-op-paginas.json`, `media-map.json`), maar dan geoogst van de publieke site.

1. **Paginalijst**: probeer achtereenvolgens `robots.txt` (Sitemap-regel), de daar genoemde sitemap, en `/wp-sitemap.xml` (de core-sitemap; robots kan naar een Yoast-`sitemap.xml` wijzen die 404 geeft). Geen van alle bruikbaar → menu + interne links van de homepage crawlen. Lukt óók dat niet → melden aan Jos (zie kop: scrapen niet mogelijk).
2. **Respecteer `Crawl-delay`** uit robots.txt (en gebruik een normale browser-user-agent); zonder pauze kunnen pagina's leeg terugkomen.
3. **Oogsten met Playwright** per pagina: gerenderde HTML, fullpage-screenshots desktop (1440) + mobiel (375), volledig doorscrollen voor lazy content, en daarna verzamelen: title/meta description/h1's (→ `seo-manifest.json`), alle `<img>`-src's én computed `background-image`s (→ `afbeeldingen-op-paginas.json`), iframes/video's (→ `embeds-op-paginas.json`), JSON-LD.
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
- Elke bronpagina op EXACT haar URL-pad: "/over-ons/" → `over-ons/index.html`, "/" → `index.html`. Titel als `<title>`, samenvatting (of eerste zinnen) als meta description; zie ook `seo-manifest.json`. Canonical/og-tags met placeholder-domein `https://VERVANG.nl`.
- Ontdo de content van shortcodes ([...]), inline styles, CSS-escape-artefacten (zoals \25BE) en wrapper-divs; behoud teksten, koppen (h1/h2-structuur) en opbouw.
- Berichten (type post): ook een blogoverzicht op `blog/index.html` met links, als er berichten zijn.
- Afbeeldingen: oorspronkelijke bestandsnamen én alt-teksten behouden (Google Afbeeldingen); ontbreekt een alt, schrijf een korte feitelijke.
- Structured data (JSON-LD) uit de bron-HTML van de LIVE site overnemen (Yoast zet bedrijfsgegevens/openingstijden/reviews als `application/ld+json` — zit niet in de WXR-export); adressen bijwerken naar het nieuwe domein.
- `og:image` per pagina overnemen + één site-brede fallback (deelplaatje WhatsApp/LinkedIn).
- Interne links ín teksten direct naar het juiste nieuwe pad — niet op redirects leunen.
- Genereer `sitemap.xml`, `robots.txt`, `_headers` (X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Strict-Transport-Security: max-age=31536000; includeSubDomains) en `llms.txt` (markdown: "# Bedrijfsnaam", blockquote met feitelijke beschrijving, "## Pagina's"-lijst met per pagina één zin; niets verzinnen).
- **CUSTOM POST TYPES**: diensten, teamleden, vacatures, projecten zitten vaak NIET in de export (het voorbereid-script meldt ze als overgeslagen). Haal die pagina's van de live site (curl + tekst extraheren) en bouw ze wél — anders missen er pagina's.

**Ontwerp**
- ONTWERP OVERNEMEN: bestudeer screenshots + CSS in `oud-ontwerp/`. Kleurenpalet, lettertypen (Google Fonts als het origineel die gebruikt), header-opbouw (logo/topbalk/menu), hero met achtergrondbeeld, knopstijlen, fotogrids. De eigenaar moet z'n eigen site direct herkennen — geen generiek sjabloon.
- MAATVAST: border-radius, schaduwen, exact kolomaantal per sectie, blokvolgorde, hero-hoogtes, sectie-achtergronden letterlijk uit `bestek-*.json` en de screenshots. "Ongeveer" is niet goed genoeg — meet na.
- SCHONE CODE, GEEN WORDPRESS-SPOREN: de kopie is visueel identiek maar de code is 100% eigen en zo clean mogelijk. Dus: semantische HTML (header/nav/main/section/footer), minimale nesting (nooit de div-torens van paginabuilders nabouwen), eigen korte Nederlandse classnamen, één eigen stylesheet. VERBODEN in de output: wp-*, elementor-*, et_pb_*, vc_*, fusion-* en andere thema-/builder-classes, WordPress-comments, inline builder-styles, en gekopieerde thema-CSS. De gerenderde bron (oud-ontwerp/) is uitsluitend REFERENTIE om te meten en te vergelijken — nooit om markup uit over te nemen.
- DECORATIE HOORT ERBIJ: sfeerbeelden uit het thema (wolken, golven, patronen als CSS-achtergrond) terugplaatsen op de juiste secties.
- SLIDERS per soort (nooit leeg of nagemaakt): hero-slider → statisch of CSS-crossfade met echte slides; logo-carrousel → statische rij/grid met ÁLLE logo's; testimonialslider → alle quotes statisch; fotogalerij → grid met alle beelden.
- Mobiel-eerst: viewport-meta, geen vaste breedtes, geen horizontale scroll op 375px, leesbare tekst, aantikbare knoppen (≥44px), hamburger-menu bij veel items.

**Beelden**
- AFBEELDINGEN VERPLICHT: `afbeeldingen-op-paginas.json` toont per pagina wat er stond; `media-map.json` koppelt URL's aan lokale bestanden. Een pagina die in het origineel beeld had maar bij jou kaal is, is FOUT. Hero's als CSS-background, grids als grid, losse foto's inline — mét alt-tekst.
- KLEINE BEELDEN HOREN ERBIJ: USP-iconen, partnerlogo's, keurmerken, portretfoto's zijn net zo verplicht als grote foto's. Let op lazy-loading (`data-src`) bij het oogsten.
- NAMAKEN VERBODEN: nooit zelf logo's/illustraties tekenen of initialen-rondjes als vervanging. Alleen echte bestanden uit `afbeeldingen/`. Ontbreekt iets: van de live site downloaden (sharp → webp, max 2000px, q82); lukt dat niet, noteer de URL in `ontbrekende-media.txt` en meld het.

**Inhoud & links**
- EMBEDS VERPLICHT: elke YouTube/Vimeo/Maps-iframe en `<video>` uit `embeds-op-paginas.json` letterlijk terug op de juiste pagina, responsief (max-width 100%, aspect-ratio).
- GEEN PLACEHOLDER-TEKST: lorem ipsum en Engelse thema-restanten ("Principles of our work") nooit overnemen — sectie weglaten of vullen met echte content. Eindcontrole hierop.
- OVERZICHTEN KLIKKEN DOOR: elk overzichtsblok (diensten, team, blog) linkt per item (titel én beeld) naar de detailpagina, en andersom (terug-link/kruimelpad).
- TAGS & CATEGORIEËN: gebruikt de site tags/categorieën zichtbaar (tagwolk, taglinks bij berichten, categorienavigatie)? Bouw dan statische VERZAMELPAGINA'S op de originele paden (`tag/<slug>/index.html`, `category/<slug>/index.html`): kop met tagnaam + lijst van bijbehorende berichten (titel, datum, samenvatting, link), in de stijl van het blogoverzicht, met terug-link. De koppeling bericht↔tags staat in de bronmateriaal-koppen en in `<repo>-bron/tags-overzicht.json`. Tagwolk blijft dus gewoon klikbaar. Alleen bij verwaarloosbaar gebruik (1-2 losse links) ontlinken. Auteur-/datumarchieven (/author/, /2023/05/) niet bouwen → die links naar het blogoverzicht.
- GEEN DODE LINKS: eindcontrole — elke interne link wijst naar een gebouwde pagina.

**Techniek**
- CENTRALE ONDERDELEN: alles wat op ≥2 pagina's identiek is één keer in `delen/` (menu.html, topbalk.html, footer.html, en ook referenties-/CTA-/actueel-blokken), op pagina's alleen `<!--invoeg:naam-->`. LET OP: `delen/` in de wortel van de klant-map (naast index.html) — wordt bij deploy uitgevouwen. Actieve menustand via klein pad-scriptje, nooit menu kopiëren per pagina.
- Zet vlak voor `</body>` van elke pagina: `<script>try{parent.postMessage({type:"wp2ai-pagina",pad:location.pathname},"*")}catch(e){}</script>` (mag ook weggelaten worden: de deploy injecteert hem zelf).
- STANDAARD-PAGINA'S: bouw ALTIJD een `404.html` — met ABSOLUTE paden (/stijl.css, /afbeeldingen/…, /contact/) want die pagina kan op elk willekeurig adres verschijnen in de wortel van de site — zelfde kop/menu/footer als de rest (delen/-markers), vriendelijke tekst in de toon van het bedrijf, knoppen naar home en contact, `<meta name="robots" content="noindex">`. Cloudflare serveert die automatisch bij een onbekend adres. Idem voor `bedankt/index.html` (zie formulieren). Controleer aan het eind dat beide bestaan.
- FORMULIEREN: elk formulier van de oude site nabouwen met dezelfde velden, `method="POST" action="https://wordswap.nl/api/formulier"`, verborgen `_site=<repo>`, `_formulier=<kebab-naam>`, `_bedankt="/bedankt/"` en honeypot `_extra` (leeg, visueel verborgen, tabindex -1). Bouw óók een eigen bedankt-pagina op `bedankt/index.html` in de stijl van de site (persoonlijke tekst passend bij het bedrijf, terug-knop naar home, meta robots noindex) — de bezoeker landt daar na het versturen; heeft de invuller een e-mailadres opgegeven, dan krijgt hij automatisch een bevestigingsmail. NOOIT velden voor BSN, betaal-/bankgegevens, wachtwoorden of medische informatie — meld dat WordSwap daar een veilige oplossing voor opzet. BESTANDSUPLOAD (cv, offerte-bijlage e.d.) wordt ondersteund: geef het form `enctype="multipart/form-data"` en een `<input type="file" name="cv" accept=".pdf,.doc,.docx,.odt,.rtf,.txt">`; toegestaan pdf/doc/docx/odt/rtf/txt/jpg/png, max 2 bestanden à 5 MB, ze gaan als bijlage mee in de notificatiemail naar de klant. Heeft de bron-site een uploadveld: exact nabouwen, nooit vervangen door een mailto-link.
- Analytics/meetscripts van de eigenaar (GA4, Tag Manager, cookiebanner) intact overnemen; verder géén nieuwe externe scripts of trackers. Let op de combinatie: had de oude site trackers ZONDER cookiebanner, meld dat aan Jos — dat was al niet in orde en nemen we niet stilzwijgend over. Had de site géén trackers, dan is de kopie cookie-vrij en is er geen banner nodig (noem dat in de oplevering, het is een verkoopargument).
- Repareren hoort bij de oplevering: dode links, kapotte afbeeldingen, niet-werkende formulieren en mixed content los je bij de overstap gewoon op, en je meldt aan Jos wát er kapot was (dat is ook verkoopmateriaal — "we hebben meteen X gerepareerd"). Maar het blijft een 95%-kopie: geen herontwerp, geen nieuwe indeling, geen herschreven teksten.
- Achtergrondvideo's (hero-loops) van de oude site neem je mee, maar nooit als origineel bestand: comprimeer met ffmpeg naar H.264 zonder geluid, 720p, doel ±3-8 MB (bv. `ffmpeg -i bron.mp4 -an -vf scale=-2:720 -c:v libx264 -crf 28 -movflags +faststart hero.mp4`), maak een poster van het eerste frame (`ffmpeg -i hero.mp4 -frames:v 1 hero-poster.jpg`), en zet hem in de pagina met autoplay muted loop playsinline preload="metadata" en de poster. Bij prefers-reduced-motion alleen de poster tonen. Was het origineel groter dan 25 MB of technisch te zwaar, meld het aan Jos.
- Video's en kaarten altijd in de cookie-vrije variant: YouTube via youtube-nocookie.com, Vimeo met ?dnt=1, Google Maps als statische link in plaats van iframe.
- Overige kwaliteitseisen: zie `lib/huisregels.ts` (toegankelijkheid, consistentie, taal).

**Controle vóór oplevering (vergelijk-en-verbeter, zoals de pijplijn)**
1. Lokale server starten (let op: markers uitvouwen — of tijdelijk `python3 -m http.server` en markers accepteren) en elke pagina naast de oud-ontwerp-screenshots leggen; verschillen wegwerken.
2. Checklist: alle bronpagina's aanwezig? Alle afbeeldingen terug per pagina? Menu/footer overal? Geen lege markers? Geen dode links? Geen placeholder-tekst? Mobiel oké op 375px?
   **FORMULIEREN-GARANTIE (verplichte grep):** élk `<form>` in de hele site heeft `action="https://wordswap.nl/api/formulier"` + `_site`/`_formulier`/`_bedankt`/honeypot — controleer met `grep -rn "<form" <repo>/ | grep -v "wordswap.nl/api/formulier"` (moet leeg zijn). Nooit een mailto:, plugin-endpoint (admin-ajax, wpforms, cf7) of extern formulier-adres laten staan: alle inzendingen lopen ALTIJD via ons systeem (opslag in de database; mail naar de klant pas als in de admin een notificatie-e-mail is gekoppeld).
3. SEO-VALIDATIE tegen `<repo>-bron/seo-manifest.json` (dit is het contract met Google): elke URL uit het manifest bestaat als pagina op exact dat pad (of staat bewust in de aanwijzingen als weggelaten — noteer die dan als 301-kandidaat in `_redirects`); `<title>` en meta description letterlijk gelijk aan het manifest; h1-koppen behouden; noindex-pagina's ook in de nieuwe site noindex. Rapporteer aan Jos per pagina groen/afwijkend.

   **Elk oud adres MOET landen.** Verhuist een pagina naar een submap (bijv. `/vaco` wordt `/evc-mobiliteit/vaco`), dan is het oude adres zonder 301 een 404 — en verdampt de Google-positie. Loop het manifest daarom na de bouw nog een keer af en controleer per adres: bestaat de pagina op exact dat pad, óf staat er een regel in `_redirects`? Zo niet, voeg de 301 toe. Doel is nul openstaande adressen.
3. Screenshots van het resultaat aan Jos laten zien vóór livegang.

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

- **TERUGWEG-GARANTIE (verplicht vóór de klant zijn oude hosting opzegt):** de klant kan alleen naar WordPress terug met een volledige backup (bestanden + database) — onze statische kopie is daarvoor niet genoeg. Regel dus vóór opzegging een complete export (klant installeert All-in-One WP Migration of UpdraftPlus en draait één export; desnoods samen aan de telefoon). De klant krijgt het zipbestand zelf ("jouw data, altijd van jou") en wij bewaren met toestemming twaalf maanden een kopie. Adviseer daarnaast om de oude hosting pas op te zeggen als de nieuwe site een paar weken naar tevredenheid draait — zolang die doorloopt is teruggaan alleen het domein terugwijzen. Zeg dit ook expliciet tegen de klant: "je kunt altijd terug" is onderdeel van het aanbod.
- Live site (`https://<repo>.wordswap.workers.dev`) doorlopen naast de bron; restpunten direct fixen.
- Admin (wordpress2ai-beta.vercel.app/admin): klant verschijnt automatisch; Jos koppelt het klantaccount en vult richtlijnen in. Domein/e-mail: /admin/handleiding bovenaan (MX-check eerst!).
- Eerlijk melden wat niet 1-op-1 kon (bv. externe-plugin-content) — maatwerk of backlog.
- Nieuwe lessen → LEERPUNTEN.md (stap 0).
