# WordSwap: conversie en vindbaarheid

De openbare kernbelofte is: bestaande WordPress-bedrijfswebsite overzetten, daarna wijzigen via de ingebouwde WordSwap AI-chat. Domein behouden, ontwerp zorgvuldig overnemen, voorbeelden controleren vóór publicatie. De publieke site gebruikt daarna geen WordPress.

## Eén bron voor het aanbod

`lib/aanbod.ts` bevat de gedeelde afspraken en aankoopvragen. De homepage-FAQ, AI-overzichten en belangrijke vervolgpagina’s gebruiken die bron. Prijzen zijn exclusief btw volgens de bestaande voorwaarden. Een directe koppeling vanuit ChatGPT of Claude is gepland, niet beschikbaar als standaard product. Domeinregistratie, e-mail en maatwerk staan los van de hosting/AI-koppeling.

## Meten na toestemming

De bestaande CookieKeuze laadt de meting alleen na toestemming, alleen in productie. Geen formulierinhoud, naam, websiteadres of e-mailadres gaat mee in de nieuwe events.

- `offer_cta_click`: klik naar contact of demo, met uitsluitend het doelpad.
- `websitecheck_start`: eerste invoerfocus per formulier na toestemming.
- `websitecheck_submit`: verzendpoging na browservalidatie.
- `generate_lead`: pas na een positieve JSON-bevestiging van de formulierroute, met form_name=websitecheck.

Analyseer in GA4 de stappen naar `generate_lead`, uitgesplitst naar landingspagina en herkomst. Markeer het event daar indien nodig als belangrijke gebeurtenis; deze wijziging configureert geen extern dashboard. Vergelijk ontvangen aanvragen met daadwerkelijk passende klanten en offertes. Niet-toestemmende bezoekers en adblockers ontbreken in analytics; database-inzendingen blijven de operationele bron.

## Vindbaarheid

De publieke teksten, metadata en llms-bestanden beschrijven hetzelfde aanbod. Preview-deployments krijgen een X-Robots-Tag noindex, nofollow, zodat dev niet als productie concurreert. Productie behoudt crawltoegang.

Na een afzonderlijk geautoriseerde livegang: controleer indexatie en canonicals in Search Console; controleer crawlerbereikbaarheid op de echte host en volg relevante zoekvragen en aanvragen. Toegang voor crawlers of een llms.txt garandeert geen indexatie of aanbeveling.

## Bewijs dat nog nodig is

Er is nog geen nieuwe klantcase met toestemming aangeleverd voor deze herziening. Voeg pas een case toe met: oude en nieuwe website, afgesproken omvang, prijs, eventuele beperkingen en aantoonbaar resultaat. Reviews moeten echt en toegestaan zijn. Geen verzonnen klantlogo’s, beoordelingen, besparingen of snelheidsscores.

Het interactieve voorbeeld zonder account is uitdrukkelijk een simulatie. De echte AI-demo blijft achter een gratis account. Een echte schermopname kan het voorbeeld aanvullen zodra een geschikt en gecontroleerd scenario beschikbaar is. De bestaande lokale Clerk-productiesleutel accepteert localhost niet; login is daarom niet lokaal end-to-end geverifieerd.

## Lokale controles

- `node tests/websitecheck.cjs`: geïsoleerde routechecks met gemockte database en mail.
- `node tests/marketing-consent.cjs`: toestemmingscontrole zonder analyticsverkeer.
- `npx tsc --noEmit`: typecontrole.

De browsercontrole verstuurt geen echte aanvraag of e-mail. De AI-overzichten en pagina’s mogen niet als bewijs van gemeten resultaten worden behandeld.

Controle bij oplevering: mobiele pagina’s zonder horizontale overflow; interactief voorbeeld, formulierfout en bevestiging in de browser gecontroleerd met onderschepte testantwoorden. De volledige build slaagde met `npm run build -- --webpack`. Turbopack kon lokaal geen hulppoort openen. De build bracht een bestaande server-SDK-import in ScanVak aan het licht; type en prijsfunctie staan nu in een browserveilig gedeeld bestand. De standaard buildconfiguratie is niet omgezet naar webpack.
