# WordPressToAI — Portal & Beeldbeheer Plan

Eén Next.js-app op Vercel = marketingsite (bestaat al) + klantportal + admin.
Stack: Vercel, Neon (Postgres), Clerk (auth), GitHub App, Netlify (klantsites), Claude API.

## 1. Hoe we omgaan met images

**Principe: afbeeldingen leven in de klant-repo, net als de content.** Zo blijft
alles in één versiegeschiedenis, werkt de preview-flow automatisch, en is er
geen aparte opslag om te migreren als een klant vertrekt.

Flow:
1. Klant sleept een afbeelding in de chat (of klikt op upload).
2. Backend ontvangt de file, optimaliseert met `sharp`:
   - max 2000px breed, geconverteerd naar WebP (+ origineel als fallback bij twijfel)
   - bestandsnaam genormaliseerd: `afbeeldingen/2026-08-team-foto.webp`
3. Backend commit de afbeelding naar de preview-branch van de klant-repo
   (GitHub API, base64 content).
4. De AI krijgt in de chat-context te horen: "geüploade afbeelding staat op
   pad X" — en verwerkt het verzoek ("zet die op de teampagina") door de
   HTML/markdown van die pagina aan te passen.
5. Netlify bouwt de preview; klant ziet het resultaat, klikt Publiceer.

Limieten: max ~5MB per upload, max N uploads per maand (fair use).
Grote mediabibliotheken (video's) zijn maatwerk — niet in de basis.

## 2. Architectuur portal

### Auth — Clerk
- Elke klant een Clerk-user; rol via `publicMetadata.role`: `customer` | `admin`.
- Middleware: `/portal/*` vereist login; `/admin/*` vereist admin-rol.
- Klant wordt via Clerk-invite uitgenodigd zodra de site gemigreerd is.

### Database — Neon (Postgres + Drizzle ORM)
Tabellen (eerste versie):
- `sites` — klant-site: clerk_user_id, github_repo, netlify_site_id, domein,
  plan (via_ons | eigen_key), status
- `messages` — chatgeschiedenis per site: rol, tekst, timestamp
- `changes` — elke wijziging: site_id, branch, pr_number, preview_url,
  status (concept | gepubliceerd | afgewezen), prompt_tekst
- `usage` — teller per site per maand (voor fair use: max 30 wijzigingen)
- `api_keys` — eigen sleutels van klanten, AES-256-GCM versleuteld met een
  server-secret (env var); nooit naar de browser

### GitHub — GitHub App (niet fine-grained PAT's)
- Eén GitHub App, geïnstalleerd op de organisatie, per repo autorisatie.
- Backend haalt per request een kortlevend installation token op voor
  precies die ene klant-repo. Geen tokens in de database, geen accountwissels.
- Klant kan optioneel als outside collaborator op eigen repo (inzage, geen lock-in).

### AI-chat — Claude API (claude-sonnet-5)
Serverless route `/api/chat` met tool use:
- `lees_bestand(pad)` / `schrijf_bestand(pad, inhoud)` — via GitHub API op de preview-branch
- `lijst_paginas()` — sitemap van de repo
- afbeeldings-uploads komen als context binnen (zie §1)
- Systeem-prompt per site: beschrijving van de sitestructuur + huisregels
  ("verander nooit layout tenzij gevraagd", verwachting: "over 2 min in preview")

Flow per wijziging:
1. Chatbericht → route checkt usage-limiet en plan (onze key of klant-key ontsleuteld)
2. AI leest/bewerkt bestanden op branch `wijziging-<id>`
3. Backend opent PR → Netlify Deploy Preview → preview-URL in de chat
4. Klant klikt **Publiceer** → backend merget PR → live binnen 1-2 min
5. `changes` + `usage` bijgewerkt

### Admin-dashboard (`/admin`)
- Overzicht klanten: site, plan, usage deze maand, openstaande concepten
- Per klant: chatgeschiedenis inzien, PR's/previews openen, plan wisselen
  (via ons ↔ eigen key), site pauzeren/opzeggen
- Fair-use signalering: badge bij >25 wijzigingen deze maand

### Admin migratie-module (de "Migrator") — `/admin/migraties`
Het hele omzetproces van een klant als begeleide workflow in het portal,
zodat elke migratie hetzelfde loopt en niets vergeten wordt.

**Stap 1 — Intake (formulier)**
- Klantgegevens: naam, e-mail, telefoonnummer, bedrijf
- Huidige site-URL, domeinregistrar, huidige hoster
- Automatische checks bij invoer: MX-records (zit e-mail bij de oude
  hosting? → e-mailmigratie nodig ja/nee), DNS-overzicht, aantal pagina's
  (quick crawl), CMS-detectie
- Plan-keuze: via ons / eigen key; afgesproken prijs

**Stap 2 — Import**
Twee routes, beide in het portal:
- **WordPress XML-export uploaden** (WXR-bestand): parser haalt pagina's,
  posts, menu's en media-verwijzingen eruit; media wordt gedownload van de
  oude site
- **Scraper-route** (als er geen export te krijgen is): crawler haalt alle
  pagina's + afbeeldingen op vanaf de live site
Beide routes produceren hetzelfde tussenformaat: content per pagina
(markdown/HTML) + het `seo-manifest.json` (zie SEO-sectie) + media-map.

**Stap 3 — Review & opbouw**
- Admin ziet alle geïmporteerde pagina's naast elkaar: welke gaan mee,
  welke vervallen (met automatische redirect-suggestie)
- Template/stijl kiezen: design overnemen (standaard) of nieuw design
- Knop "Bouw site": maakt de klant-repo aan vanuit een sjabloon, commit
  content + media + seo-manifest, koppelt Netlify → preview-URL

**Stap 4 — Validatie & livegang (checklist met statussen)**
- Automatische SEO-validatie tegen het manifest (titles, descriptions,
  URL's, redirects — zie SEO-sectie); rood/groen per pagina
- **Mobiel-validatie per pagina** (verplicht, Google indexeert mobiel-eerst):
  - viewport-meta aanwezig, geen horizontale scroll op 375px breedte,
    leesbare tekstgrootte (≥16px basis), aantikbare knoppen/links (≥44px),
    menu werkt op touch (hamburger indien nodig), afbeeldingen schalen mee
  - automatische screenshots van elke pagina op telefoonformaat in de
    checklist (naast desktop), zodat je het in één oogopslag ziet
  - Lighthouse mobile-score als eindcheck; minimaal gelijk aan (meestal
    ruim beter dan) de oude WordPress-site
- E-mailmigratie afvinken (indien nodig), pre-migratie snapshot gearchiveerd
- DNS-instructies + status; sitemap indienen bij Google Search Console
- Klant uitnodigen (Clerk-invite) → site verschijnt in diens /portal
- Pas als alles groen is: "Live" markeren; 4-weken GSC-monitoring start

Elke migratie heeft een statuspagina (intake → import → opbouw → validatie
→ live) zodat je in één oogopslag ziet waar elk traject staat.
Datamodel erbij: `migrations`-tabel (site_id, stap, checklist-json,
manifest-verwijzing, notities).

## SEO-behoud bij migratie (verplichte checklist per klant)

Alles wat Google nu van de site weet moet 1-op-1 mee. Per pagina vastleggen
vóór de migratie (scriptbaar: crawl van de oude site + WordPress XML-export):

- **URL's**: exacte paden overnemen (`/over-ons/` blijft `/over-ons/`,
  inclusief trailing slash-gedrag). Wijzigt een URL onvermijdelijk, dan een
  301-redirect van oud naar nieuw (Netlify `_redirects`).
- **Page titles** (`<title>`) — letterlijk overnemen
- **Meta descriptions** — letterlijk overnemen
- **Overige meta tags**: canonical, robots (noindex-pagina's!), Open Graph
  (og:title/description/image), twitter cards
- **Headingstructuur** (h1/h2) per pagina behouden
- **Afbeeldingen**: bestandsnamen en alt-teksten overnemen
- **Structured data** (JSON-LD van bv. Yoast/RankMath: LocalBusiness, FAQ) meenemen
- **Sitemap.xml** genereren met dezelfde URL's; **robots.txt** overnemen
- **Meet- en marketingscripts overnemen**: Google Analytics (GA4), Google Tag
  Manager, Search Console-verificatie, Facebook/Meta pixel, en de
  cookiebanner/consent-oplossing — 1-op-1 mee naar de nieuwe site, zodat
  statistieken en campagnes gewoon doorlopen
- Interne links controleren (geen verwijzingen naar oude WP-paden zoals
  `/wp-content/...` — afbeeldings-URL's redirecten of herschrijven)

Na livegang:
- Sitemap indienen in Google Search Console; oude property behouden
- Eerste 4 weken: GSC monitoren op 404's en dekking-fouten; elke 404 direct
  een redirect geven
- Crawl-vergelijk (oud vs. nieuw) als slotcontrole: zelfde titles,
  descriptions en status 200 op alle oude URL's

Tooling die we bouwen: een migratie-script dat de oude site crawlt en een
`seo-manifest.json` maakt (url, title, description, meta, headings, images
+ alt). De nieuwe site wordt daartegen automatisch gevalideerd — pas als
alles matcht gaat de DNS om. De AI-chat mag titles/descriptions later alleen
wijzigen als de klant er expliciet om vraagt.

## Blogs

**Bij migratie:**
- Elk WordPress-bericht wordt een eigen statische pagina met exact dezelfde
  URL (SEO-behoud); blogoverzichtspagina in het design van de site; RSS-feed
  opnieuw genereren op hetzelfde pad
- Categorie-/tag-/archiefpagina's niet 1-op-1 overzetten: 301-redirect naar
  het blogoverzicht (weinig SEO-waarde, veel onderhoudslast)

**Nieuwe blogs (via de chat — verkoopargument):**
- Klant typt (of dicteert vanaf telefoon) het bericht in de chat, evt. met
  foto's via de image-upload; AI schrijft/plaatst het in de sitestijl
- AI regelt automatisch: nieuwe pagina met nette title + meta description
  (huisregel), toevoeging aan het blogoverzicht, sitemap en RSS bijwerken
- Zelfde preview → publiceer-flow; AI kan ook helpen schrijven/redigeren
- Fair use: een blogpost telt als één wijziging
- Marketing: "bloggen vanaf je telefoon, zonder CMS" — makkelijker dan
  WordPress zelf

## Standaard veiligheidspakket (elke klantsite, onderdeel van de Migrator)

Statisch = het grootste risico is al weg (geen plugins, database of admin-login
om te hacken). Wat standaard geregeld wordt per site:

**Formulieren (het belangrijkste restrisico):**
- Alleen via Netlify Forms — nooit eigen scripts of externe formulierdiensten
  zonder afspraak
- **Honeypot-veld** standaard aan (onzichtbaar veld dat bots wél invullen →
  automatisch geweigerd) + Netlify's ingebouwde spamfilter (Akismet)
- Bij aanhoudende spam: reCAPTCHA aanzetten (ingebouwde optie, geen maatwerk)
- Inzendingen alleen doorsturen naar het e-mailadres van de klant; geen
  onnodige opslag, inzendingen in Netlify periodiek opschonen (AVG:
  dataminimalisatie)
- Geen gevoelige gegevens via formulieren vragen (BSN, betaalgegevens) —
  intake-check

**Elke site standaard (via `_headers`-bestand in het sjabloon):**
- HTTPS afgedwongen + HSTS (Netlify regelt het certificaat)
- Security headers: X-Content-Type-Options, X-Frame-Options (clickjacking),
  Referrer-Policy, en een Content-Security-Policy die alleen de eigen site +
  de afgesproken meetscripts (GA4/GTM) toestaat — dus zelfs als er ooit iets
  vreemds in de content sluipt, blokkeert de browser het

**E-maildomein (bij de e-mailmigratie):**
- SPF, DKIM en DMARC goed zetten — voorkomt dat anderen mail versturen
  namens het klantdomein (phishing uit naam van de klant)

**AI-waarborgen (zit al in de huisregels):**
- AI voegt nooit nieuwe externe scripts of trackers toe
- Formulieren wijzigt de AI alleen binnen de Netlify Forms-aanpak
- Alles via concept + goedkeuring; volledige versiegeschiedenis als vangnet

Marketingwaarde: dit pakket is een verkoopargument — "uw site kan niet
gehackt worden zoals een WordPress-site, en uw formulier is beschermd tegen
spam" — en mag genoemd worden op de site/prijzenpagina.

## Back-ups & herstel (verplicht onderdeel van de techniek)

Git geeft al volledige versiegeschiedenis (elke wijziging = commit, alles
terug te draaien), maar dat is niet genoeg als enige vangnet:

- **"Zet het terug"-tool in de chat**: de AI kan op verzoek een eerdere versie
  herstellen ("zet de homepage terug zoals gisteren") — via git revert op de
  betreffende bestanden, met dezelfde preview → publiceer-flow.
- **Externe backup los van GitHub**: nachtelijke job (Vercel Cron) die van
  elke klant-repo een archief (git bundle of tarball) wegschrijft naar aparte
  opslag (bv. Cloudflare R2/S3), retentie ~90 dagen. Beschermt tegen
  account-/org-problemen bij GitHub zelf, per ongeluk verwijderde repos, of
  een force-push.
- **Pre-migratie snapshot**: vóór elke migratie een volledige kopie van de
  oude WordPress-site (XML-export + bestanden) archiveren, zodat er altijd
  een weg terug is tijdens het traject.
- Herstelpunt tonen in het portal: lijst van gepubliceerde versies met datum,
  klant kan per versie een preview zien en terugzetten aanvragen.

## 3. Bouwvolgorde

1. **Fundament**: Clerk + Neon + Drizzle in de bestaande app; `/portal` en
   `/admin` met middleware; `sites`-tabel handmatig gevuld met klant #1 (= onze eigen testsite)
2. **GitHub App** aanmaken + token-flow; bestand lezen/schrijven op branch werkend
3. **Chat MVP**: chat-UI + Claude tool-use + PR + preview-link in chat
4. **Publiceer-knop** (merge) + usage-teller + fair-use limiet
5. **Image-upload** in de chat (sharp → commit → AI plaatst)
6. **Eigen-API-key flow**: invoer + encryptie + tutorial-video-plek
7. **Admin-dashboard** (klantoverzicht, usage, plannen)
8. **Migrator stap voor stap**: eerst de XML-import + seo-manifest-generator
   als losse tool (levert direct tijdwinst bij de eerste echte klant), daarna
   intake-formulier, "Bouw site"-knop en de validatie-checklist
9. Later: scraper-route, Netlify site-provisioning via API, R2-backups

## Positionering & naam

- **Verkoopverhaal aangescherpt**: niet "wij hebben AI" (WordPress heeft ook
  AI-functies) maar "wij halen het gedoe weg" — geen onderhoud, geen updates,
  niets te hacken, goedkeuring vooraf. De AI is het middel; de rust is het
  product. Staat als eigen blok op de homepage.
- **Drie AI-smaken**: (1) via ons account, (2) eigen API-key in ons portal,
  (3) volledig zelfstandig — klant krijgt repo-toegang, Netlify bouwt
  automatisch, klant koppelt zelf Claude Code/ChatGPT (expert-optie zonder
  vangnet: geen preview-flow, huisregels of fair use; evt. lagere maandprijs).
  Optie 3 is tevens het ultieme geen-lock-in-bewijs.
- **Naam**: "WordPress" is merkrechtelijk beschermd; de Foundation verbiedt
  het in domein-/productnamen → hernoemen vóór lancering. wordswap.nl is
  vrij; kandidaten: WordSwap (voorkeur), KlaarSite, SiteRust, WisselWeb.
  Bij keuze: site, metadata, Clerk-appnaam en e-mail omzetten.

## Roadmap-ideeën (nog niet gepland)

- **Chatbot voor op de klantwebsite** (extra product): elke klant kan een
  eigen AI-chatbot op zijn site krijgen die bezoekersvragen beantwoordt
  (openingstijden, diensten, offerte aanvragen) op basis van de eigen
  site-content. Apart maandelijks abonnement bovenop de €20 — prijs nog te
  bepalen; heroverweeg dan het hele prijsmodel (bv. basis €20 /
  plus-met-chatbot €45), inclusief de token-kosten van bezoekersgesprekken
  (fair use of eigen API-key, zelfde smaken als de beheer-chat).

## Benodigde accounts/secrets (env vars op Vercel)
- `DATABASE_URL` (Neon)
- `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`
- `ANTHROPIC_API_KEY` (voor "via ons"-klanten)
- `ENCRYPTION_SECRET` (voor klant-API-keys)
- `NETLIFY_TOKEN` (later, voor provisioning)
