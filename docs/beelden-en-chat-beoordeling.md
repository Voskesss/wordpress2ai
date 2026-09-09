# Beelden en begrijpelijkheid — dev, 9 september 2026

## Geplaatst
- `public/images/illustraties/ondernemer.webp`: dagelijks websitebeheer, homepage. Bestaand gegenereerd beeld; schaaltje op verzoek verwijderd.
- `public/images/illustraties/website-controleren.webp`: samen controleren vóór de overstap, /seo-behoud.
- `public/images/illustraties/productfoto-maken.webp`: eigen foto maken en insturen, /hoe-het-werkt.

Alle drie zijn AI-illustraties; geen echte klanten of medewerkers. Dit staat bij de beelden. De lege werkplek en het fictieve portaalbeeld zijn niet geplaatst. WebP-bestanden zijn circa 130–170 kB; Next Image verzorgt responsieve varianten. Bestaande routes en metadata niet gewijzigd.

Methode: ingebouwde imagegen-tool; WebP-encoding met sharp zonder inhoudelijke beeldbewerking.

### Prompt website-controleren
Use case photorealistic-natural. Single finished landscape 3:2 editorial photograph for a Dutch website migration service, topic checking a website before switching. Two fictional small-business colleagues, woman around 45 and man around 35, seated together at an oak worktable in a modest bright studio, calmly comparing a laptop screen with a short paper checklist. Natural attentive expressions, one points to the laptop while the other holds a pen. Not a portrait of any actual WordSwap employee or customer. Medium side angle, faces and hands anatomically realistic, laptop display only partially visible with understated website blocks and no readable text. Warm daylight, navy clothing, muted forest green, warm white and terracotta details, tactile professional environment. Engaged people, not empty chairs. No handshakes, exaggerated smiles, ashtrays, tobacco, slogans, logos, fake awards or floating graphics. Attractive credible editorial composition, not collage.

### Prompt productfoto-maken
Use case photorealistic-natural. Single landscape 3:2 premium editorial photograph for Dutch small-business website service WordSwap, topic updating your own website with a new photo. Fictional florist age 38 in a real-feeling small Dutch flower shop photographing a bouquet with her smartphone at a workbench. Natural focused expression, candid three-quarter medium shot, phone held realistically in two hands with back facing camera. Fresh seasonal flowers muted coral and cream, leafy greens, paper wrapping, oak workbench. Warm afternoon daylight, subtle navy apron and terracotta details, tactile and inviting, person actively doing useful work. No visible laptop needed, no readable text, no logos, no slogans, no empty chairs, no ashtray or tobacco, no exaggerated joy, no floating interface, no collage. Realistic human anatomy and photographic texture. Fictional illustrative scene, not actual customer testimony.

## Chat: gevonden en aangepakt
1. Uitleg verdween na de eerste interactie. Toegevoegd: heropenbare hulp met wat/waar, bekijken, publiceren en contact.
2. “Verwijder” was ambigu. Gewijzigd naar “Concept weggooien”; hulp legt uit dat het om niet-gepubliceerde wijzigingen gaat.
3. Conceptstatus onvoldoende expliciet. Nu “Concept klaar — nog niet live”; bekijken heet “Bekijk concept”.
4. Starttip bleef staan bij een bestaand concept; verwijderd in die situatie. Dubbele bekijkknop op mobiel verwijderd.
5. Agent kon te veel vragen tegelijk stellen en te stellig over herstel/publicatietijd spreken. Prompt vraagt een concreet voorstel, maximaal één of twee noodzakelijke vragen en een korte afsluiting met pagina en volgende stap. Publiceren gebeurt via de knop; alleen “ja” typen publiceert niet.
6. Invoerveld heeft een expliciet toegankelijk label; gekozen suggestie krijgt invoerfocus.

## Bewijs en beperkingen
Typecheck, webpack-build en bestaande tests geslaagd. Marketing op 1440px en 390px: afbeeldingen laden, geen horizontale overflow. De echte Chat-component is met nagebootste API-antwoorden en conceptdata in de browser geopend: hulp en conceptacties zichtbaar op desktop en mobiel, geen JavaScript-fouten. Geen klantwebsite gepubliceerd en geen echte AI-beurt getest in deze ronde. Promptinstructies zijn geen bewijs dat elke modelreactie goed zal zijn.

## Proef met drie nieuwe gebruikers (nog uit te voeren)
Geef iedere gebruiker de demo, eerst zonder uitleg:
1. “Je bent zaterdag van 9 tot 16 uur open. Pas dit aan op de contactpagina.”
2. Vraag vóór publicatie: “Wat zien bezoekers nu?” Correct: nog de oude versie.
3. Laat het voorbeeld controleren en publiceren; vraag wanneer de wijziging live is. Correct: na de bevestiging.
4. Laat een meegegeven foto vervangen en het resultaat controleren op telefoonformaat. Voor meesturen in de chat: gebruik een aparte testwebsite met uploads, niet de openbare demo. De demo ondersteunt wel het rechtstreeks vervangen van een aangewezen foto; toets die flow apart.
5. Laat een volgend concept weggooien; vraag wat behouden blijft. Correct: de gepubliceerde website.

Noteer per taak: voltooid zonder hulp, tijd, onduidelijke woorden, onbedoelde actie. Doel: alle drie kunnen concept/live correct uitleggen en er is geen onbedoelde publicatie. Kijk waar iemand vastloopt voordat je meer knoppen toevoegt.

## Afgehandeld in de vervolgronde
- Nieuw gesprek: client controleert HTTP-status én bevestiging; bij fouten blijven berichten staan. De server valideert het site-ID en deelt de bewerkingsvergrendeling met chat/publicatie, zodat een reset niet dwars door een lopende opdracht gaat.
- Chat: HTTP-fouten en expliciet mislukte streaming-antwoorden leveren herstelacties op. Ook een afgebroken stream zonder eindbevestiging geldt als onzeker. Opdracht, bijlagen, aanwijzing en kleur kunnen worden teruggezet; dit verstuurt niets automatisch.
- Wachtende vervolgopdrachten pauzeren bij een fout. Na een succesvolle opdracht gaan ze verder; Nieuw gesprek wist de wachtende opdracht.
- Publicatie/verwerpen: zichtbare foutmelding, opnieuw proberen en opgeslagen status bekijken. Een onzekere publicatie wordt niet als geslaagd gepresenteerd. Opnieuw publiceren gebruikt hetzelfde concept-ID.
- Demo-/maandlimieten gebruiken HTTP 429. Foto’s meesturen via demo-chat geeft nu een uitleg in plaats van ze stilzwijgend te negeren. Direct foto vervangen via aanwijzen is een aparte, bestaande route.
- Demometing: registratieblok bekeken, interactie gestart en demoportaal bekeken. Alleen na toestemming. Geen formulierwaarden, namen, site-ID’s of chatteksten in de nieuwe gebeurtenissen.
- Browser-regressietests en server-/streamtests toegevoegd aan CI.

## Demometing lezen
Gebeurtenissen: `demo_signup_view`, `demo_signup_start`, `demo_portal_view`.
Maak in de bestaande analyticsomgeving een trechter in die volgorde, gegroepeerd per gebruiker of sessie. Tel geen ruwe gebeurtenissen op als aantallen nieuwe accounts: iemand kan al een account hebben of de pagina opnieuw openen. Het derde event betekent een zichtbaar demoportaal, niet bewezen een nieuwe registratie.

De meting is op dev voorbereid en lokaal met een nagebootste analyticsfunctie gecontroleerd. Nog geen echte conversiecijfers, geen ingestelde externe dashboardrapportage en geen meetdata voor bezoekers zonder toestemming. Vergelijk dezelfde meetperiode en route voordat je conclusies trekt over afhaken. Wijzig de accountflow pas op basis van data en gebruikerstests.

## Nog uit te voeren met echte mensen
De testtaken hierboven en `docs/gebruikerstest-score.csv` staan klaar. Deelnemers moeten nog worden geregeld; er zijn geen uitnodigingen verstuurd. Noteer uitspraken letterlijk en help pas nadat je hebt genoteerd waar iemand vastloopt.

Uitnodigingstekst om zelf te gebruiken:
“Wil je 15 minuten helpen om WordSwap duidelijker te maken? Je probeert een website aan te passen en vertelt hardop wat je verwacht. Je hebt geen technische kennis nodig. We testen de website, niet jou.”

Controleer vóór de fototaak de juiste testomgeving en zorg dat er geen echte klantwebsite wordt gewijzigd. Automatische tests vervangen deze proef niet.
