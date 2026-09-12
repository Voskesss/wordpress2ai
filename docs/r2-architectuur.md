# Klantsites uit R2 serveren (inhoud los van code)

Opgesteld 11 september 2026, uitgevoerd 12 september 2026 (branch `r2-serveren`): alle zes
sites (live + werkversie) draaien op R2; `DEPLOY_MODUS=assets` is de terugvaloptie.
Afwijkingen van het plan: voorvoegsel in de bucket is gewoon de worker-naam (`vakbeursonline/`,
`wv-vakbeursonline/`), en het leesscript doet ook www → kaal domein (301). Doel: wijzigingen en publicaties zijn **direct** zichtbaar,
wereldwijd tegelijk, zonder verversen, wisselen of wachten. Zoals WordPress
(inhoud in een database, code staat stil), maar dan statisch en zonder onderhoud.

## 1. Waarom het nu hapert

Elke deploy maakt nu een **nieuwe versie van het Worker-programma** van die site,
met de bestanden als "assets" erin gebakken. Cloudflare rolt die versie uit over
honderden datacenters, en dat gaat niet overal tegelijk (seconden tot ruim een minuut,
per datacenter verschillend). Gevolgen:

- Het portaal vraagt aan de Vercel-server of Cloudflare al vers is; de server praat met
  een ánder datacenter dan de browser van de klant. Server zegt "vers", klant ziet oud.
- Na publiceren op een eigen domein wordt niet eens gecontroleerd: vaste wachttijd, dan
  blind wisselen. Springt terug naar oud als het datacenter van de klant achterloopt.
- De noodgreep "directe weergave" haalt per bestand uit de GitHub-API: traag en met
  een aanvraaglimiet.
- 56 regels stempel-, pols- en wissellogica in `Chat.tsx`, plus `/api/stempel` en
  `/site-weergave`, alleen om dit te maskeren.

## 2. Ontwerp

**Eén vast Worker-programma per hostnaam, dat de bestanden leest uit één R2-bucket.**

```
R2-bucket "wordswap-sites"
  live/<repo>/index.html            ← live site
  live/<repo>/afbeeldingen/x.webp
  wv/<repo>/…                       ← werkversie (concept)
  wvd/<repo>-<code>/…               ← demo-sandbox per gebruiker
  wvl/<repo>-<code>/…               ← demo-"live" per gebruiker
```

- Het Worker-script is voor élke site identiek en verandert nooit meer. Het bepaalt
  uit zijn eigen naam (`vakbeursonline`, `wv-vakbeursonline`, `wvd-demo-bakkerij-ab12`)
  het R2-voorvoegsel en serveert daaruit.
- Een deploy = alleen gewijzigde bestanden naar R2 schrijven. R2 is **direct consistent**:
  zodra de schrijfactie klaar is, ziet elk datacenter de nieuwe versie.
- Worker-naam, workers.dev-adres, werkversie-adres, custom domains: **ongewijzigd**.
  De domeinkoppeling van vakbeursonline.nl blijft gewoon staan.

### Wat het Worker-script doet (nu door Cloudflare-assets gedaan, straks zelf)

| Functie | Nu | Straks |
|---|---|---|
| `/pad` → `/pad/` en `index.html` | `html_handling: auto-trailing-slash` | zelf: 307 naar `/pad/` als `pad/index.html` bestaat |
| 404-pagina | `not_found_handling: 404-page` | `404.html` uit R2 met status 404 |
| `_redirects` (301's, SEO) | ingebakken in script bij deploy | `_redirects` uit R2 lezen (in geheugen gecachet, 60 s) |
| `_headers` | niet toegepast | toepassen op alle antwoorden |
| noindex op workers.dev | in script | idem |
| Mime-types | door assets | eigen tabel (incl. mp4/webm/pdf/avif) |
| Video seeken | door assets | `Range`-verzoeken doorgeven aan R2 |
| Delen-markers, meldscript, stempel, VERVANG.nl | bij deploy uitvouwen | idem, ongewijzigd (gebeurt vóór upload) |

### Cache-strategie

- HTML: `Cache-Control: no-cache` + ETag (R2-etag). Browser controleert altijd, krijgt 304
  als niets veranderde. Nooit een oude pagina.
- Overige bestanden: `public, max-age=60` + ETag. Vervangen foto's krijgen toch een nieuwe
  bestandsnaam (huisregel); `stijl.css` is na maximaal 60 s vers, in het portaal direct
  omdat het portaal met een verse cache-buster laadt.
- Randcache van Cloudflare: eerste versie zonder (elke aanvraag = één R2-leesactie).
  Pas als het verbruik richting de gratis 10 miljoen leesacties per maand gaat, de Cache API
  voor niet-HTML aanzetten met 60 s. Egress is bij R2 gratis.

### Kosten

Gratis tot 10 GB opslag, 1 miljoen schrijf- en 10 miljoen leesacties per maand. De vijf
huidige sites zijn samen ± 150 MB. Daarboven: $0,015 per GB, $0,36 per miljoen
leesacties. Geen nieuwe leverancier, zit in het bestaande account.

## 3. Wat verandert er in de code

**Nieuw**
- `lib/r2.ts`: bucket aanmaken (eenmalig), objecten schrijven/verwijderen/lijsten via de
  Cloudflare REST-API (`/accounts/{id}/r2/buckets/{bucket}/objects/{key}`), parallel met
  een limiet van ± 20 tegelijk.
- `lib/worker-script.ts`: het vaste Worker-script (één string), met R2-binding `SITES`.

**Gewijzigd**
- `lib/cloudflare.ts` → `deployMapNaarCloudflare(werkmap, naam)`: zelfde naam en
  handtekening, andere binnenkant:
  1. bestanden uitvouwen zoals nu (delen, meldscript, VERVANG.nl-vervanging);
  2. per bestand hash vergelijken met een klein manifest in R2 (`<prefix>/.manifest.json`)
     en alleen gewijzigde/nieuwe bestanden schrijven, verdwenen bestanden verwijderen;
  3. alleen als de Worker nog niet bestaat of een ouder script heeft: script (opnieuw)
     uploaden met de R2-binding. Verder nooit.
  Alle aanroepers (chat, tekst-wijzig, foto-wijzig, fotobank, vindbaarheid, publiceer,
  verwerp, ongedaan, admin, webhook, scripts) blijven onaangeraakt.
- `verwijderDemoWorkers`: ook het R2-voorvoegsel van die sandbox leegmaken.
- `verwijderCloudflareSite`: idem voor `live/<repo>` en `wv/<repo>`.

**Weg (na de overgang, als alles een week goed draait)**
- `Chat.tsx`: stempel-polling, `wachtOpVerseVersie`, `toonVersEnWisselStil`, de stille
  wissel; `herlaad()` laadt gewoon het werkversie-adres, met `?v=<tijd>` als cache-buster.
  De Ververs-knop kan blijven maar is niet meer nodig.
- `/api/stempel`.
- `/site-weergave` als voorbeeldbron (blijft mogelijk nuttig voor "achtergrond weghalen",
  dat leest de bron-afbeelding daarvandaan; anders het werkversie-adres gebruiken).
- De stempel-injectie bij deploy (kan blijven, doet geen kwaad).

## 4. Stappen en volgorde

1. **Jos, in het Cloudflare-dashboard (5 min):** R2 aanzetten (menu "Storage & databases →
   R2", vraagt om een betaalmethode maar blijft binnen de gratis laag) en aan het
   API-token de rechten "Workers R2 Storage: Edit" geven. Zonder dit kan de API niets
   (`10042: Please enable R2`).
2. **Bouwen (dag 1):** `lib/r2.ts`, het vaste Worker-script, nieuwe binnenkant van
   `deployMapNaarCloudflare`, achter een schakelaar `DEPLOY_MODUS=r2` (standaard nog
   `assets`, dus niets verandert voor bestaande sites).
3. **Proefsite:** een losse Worker `proef-r2` met een kopie van Meubelmakerij Van Dijk
   (grote site met video). Controleren: trailing slash, 404, `_redirects`, `_headers`,
   video seeken, formulieren, mobiel, meldscript/aanwijzen in het portaal, een wijziging
   via de chat is binnen 2 seconden zichtbaar in élke browser.
4. **Over (dag 2, ± 15 min):** `DEPLOY_MODUS=r2` op Vercel en lokaal; per site
   `scripts/deploy-klant.mts <repo>` draaien voor live + werkversie (vijf sites en de demo).
   Geen downtime: de Worker-versiewissel is per datacenter atomair en oud en nieuw serveren
   dezelfde inhoud. Custom domain van vakbeursonline.nl blijft hangen aan dezelfde Worker.
5. **Portaal vereenvoudigen:** stempel/wissel-code eruit, herladen met cache-buster,
   `/api/stempel` weg. Publiceren: iframe direct naar het live-adres.
6. **Een week meten:** R2-verbruik in het dashboard; daarna besluiten over de randcache.
7. **Opruimen:** oude assets-deploycode en de schakelaar verwijderen; LEERPUNTEN en
   handleiding bijwerken.

## 5. Risico's en terugvalopties

- **Terug naar oud:** schakelaar op `assets` en opnieuw deployen; de oude code blijft er tot
  stap 7 staan. Dus geen eenrichtingsverkeer.
- **Worker-script zelf wijzigen** (bugfix) raakt weer alle sites via propagatie. Dat is
  zeldzaam en hoort bij onderhoud; de inhoud is er niet van afhankelijk.
- **R2-leesactie per aanvraag:** bij een piek (een site die viraal gaat) tellen de
  leesacties op. Gratis tot 10 miljoen per maand; daarna centen. Randcache aanzetten lost
  het op, is een uur werk.
- **Grote uploads bij eerste deploy** (VGK 55 MB, honderden bestanden): parallel met
  limiet, binnen de Vercel-tijdslimiet van 300 s; de scripts draaien lokaal zonder limiet.
- **Demo-sandboxes:** een nieuwe gebruiker krijgt nog steeds een eigen Worker (voor het
  eigen workers.dev-adres). Dat aanmaken propageert éénmalig; alle wijzigingen daarna zijn
  R2-schrijfacties en dus direct. Wil je ook dat eerste moment weg, dan later een
  wildcard-domein (`*.sites.wordswap.nl`) op één Worker; wordswap.nl staat al bij
  Cloudflare, maar in een ander account dan de Workers.

## 6. Wat het oplevert voor de klant

- Wijziging via chat: klaar is klaar. Het venster toont het nieuwe resultaat op het
  moment dat de AI zegt dat hij klaar is.
- Publiceren: direct live op het echte adres, wereldwijd tegelijk.
- Geen Ververs-knop, geen "even wachten", geen terugspringen naar oud.
- Het portaal wordt eenvoudiger en dus betrouwbaarder.
