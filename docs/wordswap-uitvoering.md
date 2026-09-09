# WordSwap: behouden, overzetten, bijhouden

Besluit voor dev, 8 september 2026. Uitgangspunt Jos: nog geen betalende klanten; een overstap naar schatting 2 uur, uitlopers 4 uur; verkoopcapaciteit 8 uur per week; voorkeur voor warme contacten boven koude acquisitie.

## Het aanbod

WordSwap zet je bestaande WordPress-bedrijfssite zorgvuldig over. Bestaande URL’s, structuur, titels en meta-informatie vormen het uitgangspunt. Daarna houd je de website zelf bij met de ingebouwde AI-chat, via een voorstel en goedkeuring.

Het primaire product is migratie plus doorlopend beheer. Nieuwe websites zijn een aanvullende dienst. AI-vindbaarheid is geen garantie of zelfstandige reden om te migreren. Behoud van SEO-inrichting moet per site gecontroleerd worden; identieke metadata garandeert geen identieke zoekpositie.

## Eerste tien klanten: meet de werkelijkheid

Begin met eenvoudige zakelijke sites, blogs en contactformulieren. Sluit shops, ledenportalen en zelfstandige boekingssystemen uit. Kies eerst één groep die via het eigen netwerk of een partner bereikbaar is. Dit is een te toetsen keuze, geen bewezen marktsegment.

Per klant vastleggen:

| Onderdeel           | Vastleggen                                                                            |
| ------------------- | ------------------------------------------------------------------------------------- |
| Herkomst            | Warme introductie, partner, organisch of anders                                       |
| Bestaand probleem   | Wat moet de overstap voor deze ondernemer oplossen?                                   |
| Scope               | Aantal URL’s, functies, mail, uitzonderingen, inbegrepen revisies                     |
| Tijd                | Intake, omzetting, controle, domein/mail, uitleg, correcties, ondersteuning apart     |
| Geld                | Eenmalige opbrengst, maandbedrag, werkelijke AI/hosting/mailkosten, partnervergoeding |
| Zelfstandig gebruik | Kan de eigenaar tekst, foto en openingstijden zonder begeleiding aanpassen?           |
| Kwaliteit           | SEO-vergelijking, formulieren, mobiel, hersteltest, klantakkoord                      |
| Na 30 dagen         | Gebruikt de klant het, hoeveel hulp nodig, zou die iemand doorverwijzen?              |

Gebruik geen fictieve klantervaringen. Maak na toestemming een echte case met oud/nieuw, behoud van URL’s, één zelfstandige wijziging en gemeten ondersteuningstijd. Publiceer alleen aantoonbare resultaten, geen beloofde omzetgroei.

## Prijsproef, nog geen nieuw openbaar tarief

De huidige openbare prijzen zijn niet vervangen door onbewezen nieuwe tarieven. Test bij nieuwe offertes een eenvoudige migratie vanaf €295 en beheer vanaf €19 per maand; een pakket met duidelijk begrensde persoonlijke hulp kan vanaf €39 worden onderzocht. Dit zijn hypothesen, geen besluit dat deze bedragen rendabel zijn.

Reken per klant: maandopbrengst minus hosting/AI/betaalkosten minus ondersteuningsminuten × interne uurprijs / 60. Eenmalige opbrengst moet intake, omzetting, controle, uitleg en verwachte correcties dekken. Meet ook niet-geaccepteerde offertes en kopieën: die tijd hoort bij acquisitiekosten. Bepaal de uiteindelijke ondergrens na de eerste vijf migraties en 30 dagen gebruik.

Leg vóór werk vast wat de kosteloze beoordeling/afwijzing omvat, hoeveel correctiewerk in scope zit en welke onderdelen apart worden geoffreerd. Een uitvoerige gratis kopie voor ieder ongeschikt verzoek is geen schaalbaar verkoopmodel. Verander voorwaarden pas samen met de definitieve prijslijst en offerte; pas nieuwe afspraken niet met terugwerkende kracht op klanten toe.

## Verkoop zonder dagelijkse koude acquisitie

Wekelijks 8 uur: 3 uur warme introducties/partnergesprekken, 2 uur demonstraties, 2 uur opvolging, 1 uur cijfers en case-materiaal.

Voor een warm gesprek (zelf te versturen, hier is niets verzonden):

> Ik help ondernemers hun bestaande WordPress-site te behouden en die daarna eenvoudig bij te houden met AI. Ik zoek een paar geschikte bedrijfssites om de aanpak in de praktijk te toetsen. Ken je iemand die tevreden is met zijn site maar vastloopt op het beheer?

Voor een partnergesprek:

> Heb je een eenvoudige WordPress-klantsite die meer onderhoud vraagt dan jij eraan wilt besteden? Laten we één site samen beoordelen. Vooraf spreken we af wie de klant begeleidt, welke ondersteuning bij wie ligt en hoe een vergoeding werkt.

De nieuwe partnerpagina leidt naar contact. Beloof geen bestaand partnernetwerk of vaste vergoeding zolang die er niet is. Partnerwerving gebeurt via echte gesprekken; de pagina alleen brengt nog geen klanten.

## Werkvolgorde en beslismomenten

1. Technische dev-migratie en volledige klantreis controleren vóór eerste klantgebruik.
2. Binnen twee weken: vijf passende gesprekken en minimaal twee betaalde proefopdrachten als richtdoel, niet als voorspelling.
3. Na vijf opleveringen: uren, fouten, ondersteuning en prijsacceptatie beoordelen. Geen schaalstap bij negatieve bijdrage of onbetrouwbare publicatie.
4. Na tien klanten en 30 dagen gebruik: definitief pakket, twee toestemming-gebaseerde cases en één herhaalbaar acquisitiekanaal.
5. Pas daarna: meer partners, overdraagbare ondersteuning en uitbreiding naar een volgende doelgroep.

Definieer ‘de grootste’ eerst als bijvoorbeeld het aantal actieve betalende Nederlandse bedrijfssites dat via WordSwap is gemigreerd en wordt beheerd. Een bezoekersteller of AI-vermelding is geen bewijs van marktleiderschap.

## SEO-oplevering per klant

Maak vóór het overzetten een volledige URL-lijst uit sitemap, crawl en zo mogelijk Search Console. Neem ook oude belangrijke URL’s mee die niet meer in het menu staan. Leg de bron vast voordat DNS wijzigt.

```
npx tsx scripts/seo-vergelijk.mts vastleggen https://bron.example paden.txt baseline.json
npx tsx scripts/seo-vergelijk.mts vergelijken https://dev.example baseline.json vergelijking.json
```

De tool vergelijkt de aangeleverde URL’s, eindpaden, HTTP-status, title, description, overige benoemde meta-/Open Graph-tags, canonical, robots, X-Robots-Tag, H1/H2, links en JSON-LD. Verschillen krijgen handmatige beoordeling; een preview hoort bijvoorbeeld noindex te hebben en live juist niet. De tool bewijst geen volledige crawl, linkbereikbaarheid, visuele gelijkheid of behoud van rankings.

Oplevercheck: alle kritieke URL’s behouden of afgesproken 301; titels/meta/canonicals beoordeeld; sitemap en robots gecontroleerd; inhoud en afbeeldingen compleet; mobiel bruikbaar; formulieren werkelijk ontvangen; mailroute gecontroleerd; klantakkoord vastgelegd. Bewaar oude hosting/back-up tot de afgesproken controleperiode voorbij is. Herstel een proefwijziging daadwerkelijk en controleer de gepubliceerde inhoud. Git-geschiedenis alleen is geen uitgevoerde hersteltest.

## Technische dev-release

Toegevoegd: gedeelde databaseleases voor chat/directe bewerkingen/publiceren/verwijderen/herstel; reservering en verrekening van AI-budget per site/gebruiker; append-only werkelijke kosten; demo-eigenaarschap; publicatiecheckpoint en herhaalpoging; expliciete toolset en bestandspadencontrole; beperkte agent-omgeving; ondertekende tijdelijke toegang tot de interne site-weergave.

De AI heeft een SDK-budget van $0,50 per verzoek ($0,10 demo), met maandruimte van $5 per site ($1 per demogebruiker). Reserveren gebeurt vóór uitvoering, verrekenen zodra werkelijke kosten bekend zijn. Bij een onduidelijke/afgebroken uitvoering blijft de reservering staan. Een SDK-budget kan bij de laatste modelaanroep iets overschreden worden; het is geen providerfactuurgarantie. 30 nieuwe concepten is een bovengrens, geen toezegging van onbeperkte vervolgverzoeken.

Vereist vóór gebruik:

- Bevestigen dat dev een eigen database heeft. Nieuwe tabellen zijn additief; er is geen productie-database gewijzigd.
- Migratie draaien met expliciet DEV_DATABASE_URL en CONFIRM_SEPARATE_DEV_DATABASE=yes: `npx tsx scripts/migreer-dev-guards.mts`.
- PREVIEW_SIGNING_SECRET (of bestaande CRON_SECRET) in dev aanwezig; interne previewtoegang vervalt na een uur, vernieuwen door portaal te herladen.
- Clerk-testconfiguratie voor het dev-domein, zodat echte login en de klantreis getest kunnen worden.
- Twee gelijktijdige aanvragen, budgetuitputting, providerfout, mislukte deploy en herhaalpoging tegen de aparte dev-database testen.
- Previewhosting op Cloudflare apart beoordelen: de nieuwe ondertekende toegang beschermt de interne site-weergave, niet automatisch bestaande rechtstreeks bereikbare worker-URL’s.
- Herstelroutes en volledige AI-runtime nog end-to-end beoordelen; geïsoleerde tests vervangen geen integratie- of beveiligingsaudit.

De code faalt gesloten wanneer de guard-tabellen ontbreken. Niet naar live promoveren vóór de migratie en deze controles. Prijsacceptatie en de eerste klanten kunnen niet met code worden afgevinkt.

## Uitgevoerde controles in deze wijziging

- Build met webpack: geslaagd, inclusief TypeScript en 66 routes/pagina’s.
- `npm test`: geïsoleerde tests voor eigenaarschap, publicatie en herstel met herhaalpoging, agent-bestandsgrenzen, previewtoegang, aanvraagformulier en trackingtoestemming geslaagd. Geen echte klantgegevens, mails of publicaties gebruikt.
- SEO-hulpmiddel getest op tijdelijke lokale bron: gelijke pagina’s blijven gelijk; gewijzigde title vraagt beoordeling.
- Homepage op 390px: geen horizontale overflow. Nieuwe SEO-pagina in browser gecontroleerd.
- Websitewijzigingen naar dev gepusht in commit f2aaaaf. Backend, migratie, aanvullende tests en dit plan zijn nog lokale wijzigingen, niet geactiveerd op remote dev of live.
- Lokale `.env.local` bevat VERCEL_ENV=production; dit is geen bewijs van een aparte dev-database. Guard-migratie en echte integratietests wachten op geverifieerde dev-isolatie.

## Dev-activering na toestemming

De gebruiker bevestigde de Neon-devbranch en gaf toestemming om dev-database- en Clerk-instellingen op te halen en een previewsleutel aan te maken. De Vercel preview/development-instellingen zijn in de genegeerde `.env.development.local` gezet. Productie-instellingen zijn hierbij niet opgehaald of gewijzigd. PREVIEW_SIGNING_SECRET is uitsluitend voor preview/development aangemaakt.

De additieve migratie is op Neon-dev uitgevoerd. De echte databasetest `node --env-file=.env.development.local --import tsx tests/operation-guards.mts` controleert gelijktijdige aanvragen, verlopen leases, eigenaarschap bij vrijgeven, budgetreservering en verrekening. Alle controles slagen; tijdelijke testregels zijn opgeruimd. Dit vervangt de eerdere blokkade rond dev-isolatie.

Publicatie en herstel zijn met nagebootste GitHub/Cloudflare-acties getest; er is geen echte klantsite gepubliceerd. Volledige provider- en klantacceptatietests blijven onderdeel van de eerste gecontroleerde proefmigratie, vóór promotie naar live.
