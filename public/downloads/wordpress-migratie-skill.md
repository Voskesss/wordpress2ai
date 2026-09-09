---
name: wordpress-migreren
description: Migreer een WordPress-site naar een snelle statische website. Gebruik bij een WXR/XML-export of "zet de site van X om". Gratis gedeeld door WordSwap (wordswap.nl) — de makers gebruiken dit proces zelf voor klantmigraties.
---

# WordPress-site migreren naar een statische website

Dit is de (gegeneraliseerde) werkwijze die WordSwap gebruikt om WordPress-sites om te
zetten naar snelle sites zonder onderhoud. Gratis te gebruiken; ga je liever niet
zelf klussen, dan doen wij het no cure no pay: https://wordswap.nl

Zet dit bestand neer als `.claude/skills/wordpress-migreren/SKILL.md` in je project,
of geef het als instructie mee aan je AI-codetool.

## Stap 0 — Wat je nodig hebt

- De WordPress-export: in WordPress via Extra → Exporteren → "Alle content" (XML).
- De map `wp-content/uploads` (via FTP of het hostingpaneel) — daar staan de beelden.
- De lijst van alle pagina-adressen: sla `/sitemap.xml` van de oude site op. Dit is
  je SEO-contract: elk adres daarin moet straks bestaan of doorverwijzen.
- Gerenderde referentie: sla van elke belangrijke pagina de HTML op (browser →
  pagina opslaan) plus screenshots (desktop én mobiel). De export bevat teksten,
  niet het ontwerp.

## Stap 1 — Inventariseren vóór je bouwt

Maak uit de export een overzicht: per pagina het pad, de titel en de meta
description (het "SEO-manifest"). Meld hoeveel pagina's, berichten en media er
zijn en welke post-types NIET in de export zitten — diensten, teamleden,
vacatures en projecten zijn vaak "custom post types" die je apart van de live
site moet halen (curl + tekst extraheren), anders missen er straks pagina's.

## Stap 2 — Bouwen

Bouw platte HTML met één eigen stylesheet. De regels:

**Structuur & SEO**
- Elke bronpagina op EXACT haar oude URL-pad: "/over-ons/" → `over-ons/index.html`.
- `<title>` en meta description letterlijk uit het manifest; canonical/og-tags.
- Ontdo content van shortcodes, inline styles en wrapper-divs; behoud teksten en kopstructuur.
- Blogberichten: ook een overzichtspagina met links.
- Genereer `sitemap.xml`, `robots.txt` en (aanrader) `llms.txt` met per pagina één feitelijke zin.
- Afbeeldingen: behoud de oorspronkelijke bestandsnamen én alt-teksten — beide
  tellen mee voor Google Afbeeldingen. Mist een alt-tekst op de oude site,
  schrijf er dan een korte feitelijke bij (wat er op de foto staat).
- Structured data (JSON-LD): plugins als Yoast zetten bedrijfsgegevens,
  openingstijden en reviews als `application/ld+json` in de oude HTML — dat zit
  NIET in de WordPress-export. Bekijk de bron-HTML van de live site, neem de
  relevante blokken over en werk adressen/URL's bij naar het nieuwe domein.
- `og:image` per pagina overnemen (het deelplaatje voor WhatsApp/LinkedIn);
  minimaal één site-brede fallback instellen.
- Interne links ín teksten (bijv. een blog die naar /diensten linkt) meteen naar
  het juiste nieuwe pad laten wijzen — niet op de redirects leunen.

**Ontwerp**
- Neem het ontwerp óver, bouw het niet na uit de oude code: bestudeer screenshots
  en de oude CSS voor kleuren, lettertypen (Google Fonts als het origineel die
  gebruikt), headeropbouw, hero's, knopstijlen en fotogrids. De eigenaar moet zijn
  site direct herkennen — geen generiek sjabloon. Meet na: kolomaantallen,
  afrondingen, schaduwen, blokvolgorde.
- SCHONE CODE, GEEN WORDPRESS-SPOREN: semantische HTML (header/nav/main/section/
  footer), minimale nesting, eigen korte classnamen. Verboden in de output:
  wp-*, elementor-*, et_pb_*, vc_*, fusion-* en andere builder-classes, en
  gekopieerde thema-CSS. De oude gerenderde HTML is referentie om te méten,
  nooit om markup uit over te nemen.
- Sliders: hero-slider → statisch of CSS-crossfade; logocarrousel → grid met
  álle logo's; testimonials → alle quotes statisch. Nooit leeg laten.
- Mobiel-eerst: geen horizontale scroll op 375px, aantikbare knoppen (≥44px),
  hamburger bij veel menu-items.

**Beelden & embeds**
- Elke pagina die in het origineel beeld had en bij jou kaal is, is FOUT — ook
  kleine beelden (iconen, logo's, keurmerken, portretten). Let op lazy-loading
  (`data-src`) bij het oogsten. Converteer naar webp, max 2000px breed.
- Nooit logo's of illustraties zelf namaken; alleen echte bestanden. Ontbreekt
  iets: downloaden van de live site, anders noteren en melden.
- Embeds (YouTube/Vimeo/Maps) letterlijk terug, responsief én cookie-vrij:
  YouTube via youtube-nocookie.com, Vimeo met ?dnt=1, Maps liever als statische
  link. Geen trackers toevoegen; had de site er geen, dan is er ook geen
  cookiebanner nodig.
- Achtergrondvideo's comprimeren: `ffmpeg -i bron.mp4 -an -vf scale=-2:720 -c:v
  libx264 -crf 28 -movflags +faststart hero.mp4` (doel 3–8 MB) plus een
  poster-frame; plaatsen met autoplay muted loop playsinline en de poster, en
  bij prefers-reduced-motion alleen de poster tonen.

**Formulieren**
- Een statische site heeft een formulierdienst nodig (bijv. Formspree of
  Web3Forms): zelfde velden als het origineel, een honeypot-veld tegen spam, en
  een eigen bedanktpagina in de stijl van de site (met meta robots noindex).
- Nooit velden voor BSN, betaal-/bankgegevens, wachtwoorden of medische
  informatie — daar is een statisch formulier niet het juiste gereedschap voor.

**Inhoud & links**
- Geen lorem ipsum of Engelse thema-restanten overnemen; sectie weglaten of
  vullen met echte content.
- Elk overzichtsblok linkt per item naar de detailpagina, en andersom.
- Tags/categorieën zichtbaar in gebruik? Bouw statische verzamelpagina's op de
  originele paden (`tag/<slug>/`, `category/<slug>/`). Auteur-/datumarchieven
  niet bouwen; die links naar het blogoverzicht.
- 404-pagina in de stijl van de site, met ABSOLUTE paden (`/stijl.css`, niet
  `stijl.css`) — een 404 verschijnt op elk willekeurig adres.

## Stap 3 — Controleren (dit slaat iedereen over, en het kost posities)

1. Leg elke pagina naast de screenshots van het origineel; werk verschillen weg.
2. Checklist: alle pagina's aanwezig? alle beelden terug? menu/footer overal?
   geen dode links? geen placeholder-tekst? mobiel oké op 375px?
3. **SEO-validatie tegen het manifest**: elk oud adres bestaat op exact dat pad
   óf heeft een 301-redirect naar de nieuwe plek. Verhuist `/vaco` naar
   `/diensten/vaco/`, dan is het oude adres zonder 301 een 404 — en verdampt de
   Google-positie binnen weken. Doel: nul openstaande adressen. Titels en
   descriptions letterlijk gelijk aan het manifest.
4. Test elk formulier met een échte inzending.

## Stap 4 — Live zetten

- Host de map gratis op Cloudflare Pages of Netlify (die lezen `_redirects` voor
  je 301's; host je op Cloudflare Workers, bak de redirects dan in de worker —
  Workers leest `_redirects` niet).
- Beveiligingsheaders meegeven: X-Content-Type-Options nosniff, Referrer-Policy
  strict-origin-when-cross-origin, Strict-Transport-Security.
- Domein pas omzetten als alles klopt; oude hosting pas opzeggen als het weken
  goed draait. Draait de e-mail bij de oude hoster? Eerst de mail verhuizen.

## Daarna

Elke wijziging is vanaf nu een bestandswijziging. Vind je dat prima: klaar.
Wil je het bewerken via chat, met voorbeeld-eerst, versiegeschiedenis en een
vangnet — dat is wat WordSwap eraan toevoegt: https://wordswap.nl
