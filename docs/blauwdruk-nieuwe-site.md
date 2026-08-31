# Blauwdruk: nieuwe websites (AI-ontwerp)

De standaard waarmee we compleet nieuwe klantsites bouwen (de €750-dienst).
Doel: elke site 100% eigen werk, herkenbaar hoge kwaliteit, en toch uniek per
klant. **Nooit** elementen, templates of code van WordPress-thema's of
paginabuilders overnemen of "nabouwen uit inspiratie" — alles vanuit deze
blauwdruk.

## Uitgangspunten

1. **Eigen werk, altijd.** Geen thema-markup, geen builder-classes, geen
   gekopieerde secties van andere sites. Stockfoto's alleen rechtenvrij
   (klantfoto's hebben altijd de voorkeur) en illustraties/iconen zelf als
   inline SVG.
2. **Statisch en simpel.** Pure HTML/CSS (één stylesheet), geen frameworks of
   libraries; JavaScript alleen voor kleine interacties (menu, lightbox,
   slider) — een paar regels, zelf geschreven.
3. **Zelfde techniek als migraties**: delen/ voor topbalk/menu/footer,
   formulieren via /api/formulier met honeypot en bedankt-pagina (ook
   bestandsupload mogelijk: multipart + input type=file, pdf/Word/afbeelding,
   max 2 × 5 MB, komt als mailbijlage bij de klant aan), seo-basics
   (titels, meta-omschrijvingen, structured data waar logisch), mobiel-check
   verplicht (hamburger, ±375px), afbeeldingen als webp met nette maten.

## De smaak per klant (het intake-gesprek levert dit op)

- **Kleurenpalet**: 1 hoofdkleur (uit logo/branche), 1 accentkleur, 1 lichte
  achtergrondtint, donkere tekstkleur. Als CSS-variabelen in :root.
- **Typografie**: 1 display-lettertype voor koppen + 1 leesbaar lettertype
  voor tekst (Google Fonts, elk met fallback). Vaste schaal: h1 clamp(34-56px),
  h2 26-32px, lopende tekst 17px, regelafstand 1.6.
- **Toon**: zakelijk-warm tenzij de klant anders wil; teksten in de
  jij/u-vorm die de klant kiest.

## Vaste opbouw (aanpasbaar, niet inwisselbaar)

1. **Topbalk** (optioneel): adres/telefoon/openingstijden.
2. **Header**: logo links, menu rechts, cta-knop; hamburger op mobiel.
3. **Hero**: heldere belofte in één zin + subregel + 1-2 knoppen; foto of
   rustige kleurvlak-compositie. Geen carrousels als eerste indruk.
4. **USP-strook**: 3-4 punten met eigen SVG-iconen.
5. **Diensten/aanbod**: kaarten met eigen detailpagina's.
6. **Vertrouwen**: over ons / team / reviews (echte, van de klant).
7. **CTA-sectie**: herhaal de belofte + knop naar contact.
8. **Footer**: gegevens, menu, KvK, privacy-link.
9. **Vaste pagina's**: contact (formulier + gegevens + evt. kaart),
   bedankt/ (noindex), 404.

## Kwaliteitslat (checklist vóór oplevering)

- [ ] Mobiel: hamburger werkt, niets loopt uit beeld op 375px
- [ ] Alle links en knoppen doen iets zinnigs (geen dode hrefs)
- [ ] Formulier getest incl. bedankt-pagina en mailmelding
- [ ] Elke pagina: unieke title + meta-omschrijving
- [ ] Beelden: webp, passende maten, alt-teksten
- [ ] Kleurcontrast leesbaar (donkere tekst op lichte vlakken)
- [ ] Geen enkel spoor van thema's/builders (classes, comments, assets)

## Waarom dit ook commercieel slim is

- De klant krijgt een uniek ontwerp (geen "template-look") — dat rechtvaardigt
  de prijs.
- Wij lopen nul auteursrechtelijk risico richting thema-/templatemakers.
- De vaste opbouw + checklist maakt de AI-bouw voorspelbaar snel en de
  kwaliteit constant.
