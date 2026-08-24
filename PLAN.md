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
7. **Admin-dashboard**
8. Later: Netlify site-provisioning via API (nu nog handmatig koppelen)

## Benodigde accounts/secrets (env vars op Vercel)
- `DATABASE_URL` (Neon)
- `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`
- `ANTHROPIC_API_KEY` (voor "via ons"-klanten)
- `ENCRYPTION_SECRET` (voor klant-API-keys)
- `NETLIFY_TOKEN` (later, voor provisioning)
