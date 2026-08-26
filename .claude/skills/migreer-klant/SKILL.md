---
name: migreer-klant
description: Migreer een WordPress-site naar een statische WordSwap-klantsite, volledig vanuit Claude Code (geen API-pijplijn). Gebruik bij een nieuwe klant-migratie, een WXR/XML-export, of "bouw de site van klant X".
---

# WordPress-klant migreren via Claude Code

Jos geeft een WordPress-export (XML, evt. .gz) en een korte repo-naam (kebab-case, max 40 tekens). Eventuele aanwijzingen ("laat Actueel weg") gaan vóór alles.

## Stap 1 — Mechanisch voorwerk (script, geen AI-kosten)

```bash
npx tsx --env-file=.env.local scripts/voorbereiden.mts <xml-pad> <repo-naam>
```

Resultaat:
- `~/wordswap-klanten/<repo>-bron/` — `bronmateriaal/` (content per pagina), `seo-manifest.json`, `oud-ontwerp/` (gerenderde HTML, CSS, screenshots desktop+mobiel, bestek-json met computed styles, afbeeldingen/embeds per pagina), `media-map.json`
- `~/wordswap-klanten/<repo>/` — de bouwmap, met `afbeeldingen/` al gevuld (gededupliceerd, webp)

Eerste Playwright-run lokaal: zo nodig eenmalig `npx playwright install chromium`.

## Stap 2 — Zelf de site bouwen in `~/wordswap-klanten/<repo>/`

Bekijk EERST de screenshots en het bestek in `oud-ontwerp/`, bouw dan platte HTML + één `stijl.css`. Regels (samenvatting van lib/bouw.ts, daar staat de volledige set):

- **Herkenbaar en maatvast**: kleuren, lettertypen (Google Fonts), kolomaantallen, border-radius, schaduwen en blokvolgorde letterlijk uit bestek/screenshots. "Ongeveer" is niet goed genoeg.
- **URL-paden exact behouden** (SEO): elke bronpagina op z'n eigen pad als `pad/index.html`; titles/descriptions uit het seo-manifest letterlijk overnemen; sitemap.xml, robots.txt, llms.txt, `_headers` genereren.
- **Centrale onderdelen**: menu/topbalk/footer en andere herhaalde blokken één keer in `delen/<naam>.html`, op pagina's alleen `<!--invoeg:naam-->` (wordt bij deploy uitgevouwen). Actieve menustand via klein pad-scriptje.
- **Echte beelden, nooit namaken**: alles uit `afbeeldingen/`; kleine beelden (iconen, teamfoto's, partnerlogo's) zijn net zo verplicht als grote. Mist er iets: van de live site halen (sharp → webp, max 2000px, q82). Hero's als CSS-background.
- **Embeds letterlijk terug** (YouTube/Vimeo/Maps, responsief), sliders statisch of CSS-crossfade met echte beelden, decoratiebeelden als achtergronden.
- **Geen dode links** (tag/categorie/archief → blogoverzicht of platte tekst), **geen lorem ipsum of Engelse thema-restanten**, **overzichten klikken door** naar detailpagina's.
- **Formulieren** → `<form method="POST" action="https://wordpress2ai-beta.vercel.app/api/formulier">` met verborgen `_site=<repo>`, `_formulier=<naam>` en honeypot `_extra`; nooit gevoelige velden (BSN/medisch/betaal).
- **Custom post types** (diensten, team, vacatures) staan vaak NIET in de export — haal ze van de live site.
- Mobiel-eerst controleren: viewport, geen horizontale scroll op 375px, hamburger.

Controleer met een lokale server + screenshots naast de originelen vóór je oplevert; loop élke bronpagina na op aanwezigheid.

## Stap 3 — Registreren en live zetten

```bash
cd ~/wordswap-klanten/<repo> && git init -q 2>/dev/null; git add -A && git commit -q -m "Migratie via Claude Code"
npx tsx --env-file=.env.local scripts/registreer-klant.mts <repo> "<Klantnaam>"   # repo + DB-rij + workers + domein (idempotent)
```

Draai scripts altijd vanuit `~/wordpress2ai` (vanwege .env.local). Bestond de repo al: gewoon pushen (remote `git@github.com:wordpress2ai/<repo>.git`); herdeploy met `scripts/deploy-klant.mts <repo>`.

## Stap 4 — Afronden

- Bekijk de live site (`https://<repo>.wordswap.workers.dev`) in de browser, vergelijk met de bron, fix restpunten direct.
- Admin (wordpress2ai-beta.vercel.app/admin): klant verschijnt automatisch; Jos koppelt daar het klantaccount (e-mail) en vult richtlijnen in. Domein/e-mail: zie /admin/handleiding bovenaan.
- Meld eerlijk wat niet 1-op-1 kon (bv. externe-plugin-content) — dat is maatwerk of backlog.
