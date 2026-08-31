---
name: migreer-klant
description: Migreer een WordPress-site naar een statische WordSwap-klantsite, volledig vanuit Claude Code (geen API-pijplijn). Gebruik bij een nieuwe klant-migratie, een WXR/XML-export, of "bouw de site van klant X".
---

# WordPress-klant migreren via Claude Code

Jos geeft een WordPress-export (XML, evt. .gz) en een korte repo-naam (kebab-case, max 40 tekens). Aanwijzingen van Jos ("laat Actueel weg") gaan vóór alle onderstaande regels.

## Stap 0 — Leerpunten lezen (verplicht)

Lees EERST `.claude/skills/migreer-klant/LEERPUNTEN.md` — de lessen uit eerdere migraties. En andersom: **leer je tijdens deze migratie iets nieuws** (een valkuil, een plugin-patroon, een betere aanpak), dan voeg je dat DIRECT toe aan LEERPUNTEN.md, meld je het aan Jos, en commit je het mee. Zo wordt elke migratie beter dan de vorige.

## Stap 1 — Mechanisch voorwerk (script, geen AI-kosten)

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
- FORMULIEREN: elk formulier van de oude site nabouwen met dezelfde velden, `method="POST" action="https://wordswap.nl/api/formulier"`, verborgen `_site=<repo>`, `_formulier=<kebab-naam>`, `_bedankt="/bedankt/"` en honeypot `_extra` (leeg, visueel verborgen, tabindex -1). Bouw óók een eigen bedankt-pagina op `bedankt/index.html` in de stijl van de site (persoonlijke tekst passend bij het bedrijf, terug-knop naar home, meta robots noindex) — de bezoeker landt daar na het versturen; heeft de invuller een e-mailadres opgegeven, dan krijgt hij automatisch een bevestigingsmail. NOOIT velden voor BSN, betaal-/bankgegevens, wachtwoorden of medische informatie — meld dat WordSwap daar een veilige oplossing voor opzet.
- Analytics/meetscripts van de eigenaar (GA4, Tag Manager, cookiebanner) intact overnemen; verder géén nieuwe externe scripts of trackers. Let op de combinatie: had de oude site trackers ZONDER cookiebanner, meld dat aan Jos — dat was al niet in orde en nemen we niet stilzwijgend over. Had de site géén trackers, dan is de kopie cookie-vrij en is er geen banner nodig (noem dat in de oplevering, het is een verkoopargument).
- Video's en kaarten altijd in de cookie-vrije variant: YouTube via youtube-nocookie.com, Vimeo met ?dnt=1, Google Maps als statische link in plaats van iframe.
- Overige kwaliteitseisen: zie `lib/huisregels.ts` (toegankelijkheid, consistentie, taal).

**Controle vóór oplevering (vergelijk-en-verbeter, zoals de pijplijn)**
1. Lokale server starten (let op: markers uitvouwen — of tijdelijk `python3 -m http.server` en markers accepteren) en elke pagina naast de oud-ontwerp-screenshots leggen; verschillen wegwerken.
2. Checklist: alle bronpagina's aanwezig? Alle afbeeldingen terug per pagina? Menu/footer overal? Geen lege markers? Geen dode links? Geen placeholder-tekst? Mobiel oké op 375px?
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

- Live site (`https://<repo>.wordswap.workers.dev`) doorlopen naast de bron; restpunten direct fixen.
- Admin (wordpress2ai-beta.vercel.app/admin): klant verschijnt automatisch; Jos koppelt het klantaccount en vult richtlijnen in. Domein/e-mail: /admin/handleiding bovenaan (MX-check eerst!).
- Eerlijk melden wat niet 1-op-1 kon (bv. externe-plugin-content) — maatwerk of backlog.
- Nieuwe lessen → LEERPUNTEN.md (stap 0).
