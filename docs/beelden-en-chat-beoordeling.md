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
4. Laat een meegegeven foto vervangen en het resultaat controleren op telefoonformaat.
5. Laat een volgend concept weggooien; vraag wat behouden blijft. Correct: de gepubliceerde website.

Noteer per taak: voltooid zonder hulp, tijd, onduidelijke woorden, onbedoelde actie. Doel: alle drie kunnen concept/live correct uitleggen en er is geen onbedoelde publicatie. Kijk waar iemand vastloopt voordat je meer knoppen toevoegt.

## Verder onderzoeken
- Fout bij “Nieuw gesprek”: de bestaande client negeert HTTP/netwerkfouten en wist lokaal toch het gesprek. Dit verdient een aparte functionele correctie met foutscenario.
- Een mislukte verzending/publicatie moet een zichtbare herstelactie hebben; beoordeel dit met echte proefgebruikers naast de bestaande technische retry-tests.
- Instroom naar echte demo vraagt account. Meet hoeveel bezoekers daar stoppen voordat je een andere accountflow bouwt.
