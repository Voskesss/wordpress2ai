# Wat er verandert aan WordSwap

Dit is de lijst in gewone taal: wat een klant zou snappen, niet wat een
programmeur leest. De technische historie staat in git, dit bestand is de
menselijke samenvatting. Het is ook de bron voor serviceberichten aan klanten.

**Een nieuwe versie uitbrengen:** het nummer bijwerken in `lib/versie.ts` en in
`package.json`, hieronder een blok erbij, en daarna een label op de commit die
live ging:

```bash
git tag -a v<nummer> -m "Korte omschrijving" && git push origin v<nummer>
```

Elke klantsite krijgt bij het overzetten een `wordswap.json` mee met de versie
waarmee hij gebouwd is. Doet een site later iets raars, dan zie je daar met
welke stand van de bouwmotor hij gemaakt is.

Nummers: het eerste cijfer gaat omhoog bij iets waar een klant zijn manier van
werken voor moet aanpassen, het tweede bij nieuwe mogelijkheden, het derde bij
reparaties.

## 1.41.3 (3 oktober 2026)

- Beveiligingsupdates: Next.js 16.3.8 (lek in next/og, dat wij niet gebruiken, toch bijgewerkt), nodemailer 10.0.14 en mailparser 3.9.34 (o.a. een lek waarbij bij meerdere SMTP-servers inloggegevens konden uitlekken; wij mailen via de eigen server van klanten, dus dit raakte ons echt), ip-address 10.7.3.
- Elke maandagochtend controleert GitHub de productiepakketten op bekende lekken (vanaf "high"). Bij rood komt er een mail.

## 1.41.2 (2 oktober 2026)

- De outreachpagina toont de prospects per 20, met onderaan "Toon meer". Elke kaart draagt een mailbewerker en drie complete mails mee; met de hele lijst duurde het zo'n 8 seconden voordat je in een tekstvak kon typen. De tellers bovenaan tellen nog steeds alles.

## 1.41.1 (2 oktober 2026)

- De videopagina toont op een telefoon de staande versie van een filmpje (als die er is), op een groot scherm de vierkante. Nu voor "website-typen"; de staande WhatsApp-versie volgt.

## 1.41.0 (2 oktober 2026)

- Filmpjes in mails. In de outreach-sjablonen en de Mailer zet je met een knop (of door [video:whatsapp] of [video:website-typen] te typen) een filmpje in de mail. De ontvanger ziet een beeld met een afspeelknop; een klik opent wordswap.nl/video/..., waar het filmpje meteen speelt, met daaronder "Kan dit ook voor mijn website?" en de demo. Een tekstlink eronder werkt ook als het mailprogramma beelden blokkeert. De AI-herschrijver laat de code staan.

## 1.40.3 (2 oktober 2026)

- Op de telefoon staan de berichten via je formulieren nu als kaartjes onder elkaar, in plaats van een tabel waarvan het bericht rechts buiten beeld viel. Tik op "Hele bericht lezen" om alles te zien; de knoppen (afgehandeld, spam, verwijderen) staan eronder, binnen beeld. Op een groot scherm blijft de tabel.

## 1.40.2 (2 oktober 2026)

- Bij elke aankondiging in de admin zie je hoeveel klanten hem al gezien hebben, en wie nog niet. Heeft iedereen hem gezien, dan staat er "kan weg".
- Met de knop Voorbeeld zie je een aankondiging precies zoals de klant hem ziet, ook als je hem zelf al wegklikte. Het voorbeeld onthoudt niets.

## 1.40.1 (2 oktober 2026)

- Een geplaatste aankondiging kun je nu bewerken (titel, tekst en link). Wie hem al wegklikte, krijgt hem niet opnieuw.

## 1.40.0 (2 oktober 2026)

Naam kiezen bij elke upload, omschrijvingen zichtbaar, AI-verbruik in de admin en een slimmere livegang-checklist.

- De klantpagina in de admin toont het AI-verbruik deze maand als percentage,
  bedrag en balkje, net als de klantenlijst. De instellingen voor een grens op
  het aantal wijzigingen zijn weg: het AI-budget is de rem.
- Livegang-checklist bij route B (domein en mail blijven bij de hoster): "Waar
  de mail draait" en de 'a' in de SPF staan niet meer onterecht open. De
  waarschuwing dat de hosting moet blijven staan, blijft wel. De hoster wordt
  nu ook uit de SPF herkend als de mailserver op het eigen domein staat.
- Livegang-punten die wij niet kunnen meten (zoals Search Console die de
  klant zelf via een bestand regelde) vink je nu zelf af, en zet je ook weer
  terug. Rode punten, die nu misgaan voor bezoekers, kunnen dat niet.
  Nieuwe kolom sites.livegang_afgevinkt (op dev en productie gedraaid).

- De groep Live staat nu bovenaan de klantenlijst, In migratie daaronder.
- De klantenlijst in de admin toont per klant het AI-verbruik van deze maand zoals de klant het in zijn portaal ziet: een balkje met het percentage, en wat ze gebruikt hebben van wat ze mogen ($0,87 van $4,00). Groen, oranje vanaf 70 procent, rood als het op is. De oude telling "0/30 wijzigingen" is weg; die begrenst niets meer.

- Wijs je een foto aan, dan kun je met "Omschrijving aanpassen" zelf de omschrijving van die foto veranderen (de alt-tekst die Google en schermlezers lezen). Zonder AI, in een paar seconden, en alleen precies die foto.
- Tijdens het laden van een bank zie je lichte vlakken in de vorm van wat er komt (tegels voor foto's, kaarten voor video, regels voor documenten en audio) in plaats van de zin "Even ophalen...". Zonder beweging voor wie dat in zijn instellingen heeft uitgezet.
- De chat weet wat je zelf in het portaal kunt en waar het staat (tabbladen, banken, berichten, mail, account), via een korte portaalkaart die alleen de klantchat meekrijgt. Een test koppelt die kaart aan het portaal: wordt een knop of tabblad hernoemd zonder de kaart bij te werken, dan gaat de testrit op rood. Verouderde verwijzingen ("onder de chat", "Formulier-inzendingen") zijn weg, en de banken beloven niet meer dat je een opgeruimd bestand via een knop "Vorige versies" terughaalt: die knop bestaat niet, Jos haalt het terug via Hulp & support.
- Naam kiezen geldt bij elke upload: foto, video, audio en pdf, in de banken én bij de gewone upload in de chat (paperclip en slepen). Een geplakte schermafbeelding krijgt geen vraag, maar wel een nette naam.
- De automatische naam is altijd netjes: kleine letters, een streepje voor elke spatie of elk vreemd teken, accenten weg, en geen tijdstempel of willekeurige code meer uit de opslag.
- Een foto uit de chat overschreef een bestaande foto met dezelfde naam, overal op de site. Nu krijgt de nieuwe -2, net als in de banken. Video krijgt geen code meer achter de naam en wordt bij een tweede verzoek niet dubbel opgeslagen.
- Bij het uploaden in de fotobank of documentenbank kies je eerst de naam. De naam van je bestand staat voorgevuld, je ziet hoe hij op je site komt te heten, en een naam die al bestaat wordt vooraf geweigerd. Een bestandsnaam achteraf wijzigen kan bewust niet: een bestand staat op meerdere plekken en dan ontstaan er kapotte plaatjes en links.
- De fotobank toont bij elke foto de omschrijving die Google leest (alt-tekst), en meldt waar die ontbreekt. Met "Omschrijving aanpassen" zet je de opdracht klaar in de chat.
- De documentenbank toont met welke linktekst een document op je site staat.
- Vraag van Van den Berg Mediation.

## 1.39.2 (2 oktober 2026)

- De bewaking kijkt nu elk kwartier naar de binnenkant: database, AI, mail, Cloudflare en GitHub, plus werk dat blijft hangen (een bouwopdracht die niet vordert, een WhatsApp-bericht dat op verwerking wacht, een publicatie die al een dag op mislukt staat). Gaat er iets kapot, dan volgt binnen een kwartier een mail en een appje; daarna blijft het stil tot het is opgelost, en dan komt er één herstelbericht. De dagelijkse controle van 5:20 blijft het volledige overzicht, en de kwartiercontrole bewaakt ook dat die dagelijkse ronde zelf nog draait. Nieuw is ook een tikje naar een externe wachter: blijft dat uit omdat ons eigen systeem plat ligt, dan waarschuwt die van buitenaf.

## 1.39.1 (2 oktober 2026)

Reparatie aan "Klopt niet, kijk zelf even". De schermafbeelding die de chat
dan maakt, liet foto's verderop op de pagina als leeg vak zien, terwijl ze
er voor bezoekers gewoon stonden. De chat dacht dan dat die foto's kapot
waren en ging ze ongevraagd "repareren". Nu staan alle foto's op de
schermafbeelding zoals jij ze ziet.

De chat begint bij "kijk zelf" nu ook bij waar jij over klaagde (bijvoorbeeld
"de knop is nog oranje") en repareert dat eerst. Ziet hij daarnaast nog iets,
dan noemt hij het en vraagt hij of het moet, in plaats van het meteen aan te
passen. En als hij een knop een andere kleur geeft, controleert hij nu ook of
die kleur het echt wint van de bestaande opmaak, in plaats van te zeggen dat
het al goed is.

## 1.39.0 (1 oktober 2026)

**Het portaal heeft een vaste bovenbalk met tabbladen.** Na inloggen opende de werkweergave schermvullend over de pagina heen, en je berichten en instellingen zaten daarachter, bereikbaar via een rode knop "Volledig scherm uit". Klanten snapten niet dat ze terug konden. Nu staat bovenin altijd een balk met "Website bewerken", "Berichten & mail" en "Account", plus "Alle websites" en je account. De werkweergave begint onder die balk. Wisselen tussen tabbladen herlaadt niets: de chat werkt gewoon door als je even naar je berichten kijkt. Een link naar een tabblad werkt ook (?tab=berichten), en de link naar je afspraken uit de mail opent vanzelf het goede tabblad.

**Alle banken werken nu zoals de documentenbank.** In de fotobank, videobank en audiobank kun je zelf uploaden, een link kopiëren voor een mail of nieuwsbrief, en zoeken op naam. Elke bank waarschuwt vóór het uploaden dat alles openbaar is, en het paperclipmenu zegt het ook.
- Foto's: meerdere tegelijk, verkleind op dezelfde maat als via de chat, en meteen online.
- Audio: meteen online. Een aflevering met dezelfde naam wordt niet meer overschreven maar krijgt -2, zodat links in verstuurde mails blijven kloppen.
- Video: uploaden in de bank gaat via dezelfde verwerking als in de chat (verkleinen duurt even, de voortgang staat in de chat). Daarna staat hij in de bank met zijn link.
- De link verschijnt alleen als het bestand echt online staat.

- Reparaties uit het testen: het typveld valt niet meer weg onder de balk (ook niet na wisselen van tabblad), de chatkolom krijgt geen horizontale schuifbalk meer door de uitlegballonnetjes rechts, en op een smalle telefoon overlappen de tabbladen het logo en je account niet meer. Een nieuwe browsertest (tests/portaal-ui.cjs) controleert dit op vier schermformaten.

## 1.38.8 (1 oktober 2026)

- Spam-tabje: de uitleg bij een bericht heeft geen lang streepje meer (huisregel). De streepjestest controleert nu ook de berichtenlijst en de teksten van de spamcontrole.

## 1.38.7 (1 oktober 2026)

- Facturen en opdrachtbevestigingen tonen het vaste WordSwap-nummer 026 234 01 22, uit dezelfde bron als de site, in plaats van een mobiel nummer. Staat de KvK van de klant al in het adresveld, dan staat hij er niet meer twee keer op. Al uitgegeven facturen blijven zoals ze zijn.

## 1.38.6 (1 oktober 2026)

- Binnenkomende formulierberichten worden voortaan op spam gecontroleerd. Overduidelijke massaspam (aangeboden "diensten", linkrommel, sjabloonberichten) komt stil in een eigen Spam-tabje bij je berichten: jij krijgt er geen losse melding van en de afzender krijgt niet jouw automatische bevestiging. Aan het eind van de dag krijg je één kort overzicht, alleen op dagen dat er iets is tegengehouden. Twijfelgevallen komen gewoon bij je open berichten binnen, met een geel label "Mogelijk spam" en de reden erbij; de melding krijg je dan wel, alleen de afzender krijgt geen bevestiging. Jij houdt altijd het laatste woord: één klik op "Spam" of "Geen spam". Bij twijfel of een storing laat de controle alles gewoon door, en op de privacystanden "WordSwap kan niet meelezen" en "niets bewaren" staat hij uit.

## 1.38.5 (1 oktober 2026)

- Documentenbank: de volledige naam van een document is weer te lezen. Naast de drie knoppen werd hij afgekapt en viel de rest woord voor woord onder elkaar; nu staan naam en gegevens op een eigen regel, met de knoppen eronder.

## 1.38.4 (1 oktober 2026)

- Documentenbank en paperclipmenu waarschuwen nu vóór het uploaden: documenten op je site zijn openbaar. Iedereen met de link kan ze openen en Google kan ze vinden, dus nooit iets met persoonsgegevens of iets vertrouwelijks.

## 1.38.3 (1 oktober 2026)

- Documentenbank: je kunt nu ook in de bank zelf een pdf uploaden, naast meesturen in de chat. Het document staat daarna meteen online, bovenaan de lijst met "Link kopiëren", klaar voor een mail of nieuwsbrief. Ook via de chat staat een document voortaan direct online, en de chat noemt de link. Een upload overschrijft nooit een bestaand document met dezelfde naam: dan wordt het bijvoorbeeld vacature-2.pdf, zodat links in al verstuurde mails blijven kloppen.

## 1.38.2 (30 september 2026)

- Documentenbank: per document een knop "Link kopiëren" met het vaste webadres, om een pdf in een mail of nieuwsbrief te zetten (bijvoorbeeld via Mailblue). De knop verschijnt alleen als het adres echt werkt; staat een document nog alleen in een concept, dan staat er dat de link na publiceren beschikbaar komt. Opruimen waarschuwt nu dat links in verstuurde mails daarna niet meer werken. Gevraagd voor Van den Berg Mediation.

## 1.38.1 (30 september 2026)

- Berichten: een knop "Verversen" haalt nieuwe berichten op zonder de pagina te herladen. Filters, zoektekst en scrollpositie blijven staan.

## 1.38.0 (30 september 2026)

**Berichten via je formulieren, nu als echt overzicht.** Het blok staat over de volle breedte, in het portaal en in de admin. Elke rij toont datum, formulier, van wie en waar het over gaat; klik om het hele bericht met bijlagen te zien. Je filtert per formulier, zoekt in alle berichten, schakelt tussen open en afgehandeld, en handelt meerdere berichten in één keer af, zet ze terug of verwijdert ze. Alle bewaarde berichten staan erin, niet meer alleen de laatste dertig.

## 1.37.1 (30 september 2026)

- De verzendknop zegt "Bezig met versturen" in de taal van de pagina (Nederlands, Engels, Duits, Frans, Spaans, Italiaans, Portugees, Pools, Turks; anders Engels). Een site kan een eigen tekst meegeven met data-bezig op het formulier. Site-script versie 14.
- Ons telefoonnummer staat nu onder de mails van Jos, naast het mailadres.

## 1.37.0 (30 september 2026)

**Formulieren laten zien dat ze bezig zijn.** Na een klik op verzenden verstuurt WordSwap eerst de mail (via een eigen mailserver soms enkele seconden) en stuurt dan pas door naar de bedanktpagina. Bezoekers zagen al die tijd niets en klikten nog eens. Nu zet de knop zichzelf op "Bezig met versturen", een tweede klik doet niets, en bij de terug-knop staat de knop weer gewoon klaar. Dit zit in het site-script (versie 13), dus elke site krijgt het bij de volgende publicatie; sites via route B meteen. Opgemerkt bij Van den Berg Mediation.

## 1.36.7 (30 september 2026)

- Reparatie op 1.36.5: we melden ons bij de eigen mailserver van een klant als wordswap.nl, niet als het domein van de klant. De server van Van den Berg Mediation weigerde dat als vervalsing, waardoor de mails sinds vanmiddag via no-reply@wordswap.nl gingen in plaats van vanaf zijn eigen adres.

## 1.36.6 (30 september 2026)

- Ook onze eigen mail via Resend gaat nu als tekst plus html: klantmails (formulierbevestigingen en meldingen), mails van Jos aan klanten en leads, outreach, webinarmails en losse mails. Een mail met alleen html is bij Microsoft en Google een klein spamsignaal.

## 1.36.5 (30 september 2026)

- E-mail vanaf je eigen adres: we melden ons bij de mailserver nu met het domein van de site in plaats van het interne adres van onze server, en de testmail en bevestigingsmails gaan als tekst plus html. Beide waren bij Hotmail een reden om mail via de eigen server van Van den Berg Mediation als spam te zien, terwijl SPF, DKIM en DMARC in orde waren. Versturen en testen gebruiken nu dezelfde verbinding.

## 1.36.4 (30 september 2026)

- E-mail vanaf je eigen adres: een servernaam met een punt erachter, met smtp:// ervoor of met :poort erachter werkt nu gewoon. De naam wordt schoongemaakt bij het opslaan en bij het versturen, dus ook al ingevulde waarden. Een punt achter mail.vandenbergmediation.nl gaf "certificaat wordt niet vertrouwd" terwijl de server in orde was.

## 1.36.3 (30 september 2026)

- Opleveringspoort: oude documentadressen (pdf's en andere downloads onder /wp-content/uploads/) moeten na een migratie blijven werken, op hetzelfde pad of via een 301. Mails en Google linken ernaar. Aanleiding: het boekje van Van den Berg Mediation gaf een 404 vanuit de welkomstmail.

## 1.36.2 (30 september 2026)

- Bevestigingsmails: een formulier in een deel dat zelf in een ander deel zit (contactblok op artikelpagina's) krijgt nu de juiste pagina's in plaats van "niet meer op de website gevonden". Gemeld bij Van den Berg Mediation.

## 1.36.1 (30 september 2026)

**Optimaal ontzorgd opnieuw omschreven.** De "30 minuten ondersteuning per maand" is overal weg. Het pakket is nu: alles uit het basispakket, voorrang bij je vragen, en je website bijhouden via WhatsApp. Storingen aan onze kant lossen we voor iedereen kosteloos op, in elk pakket. Aangepast op de prijzenpagina, de homepage-gegevens voor Google, de voorwaarden, de landingspagina's (via de gedeelde pakkettekst) en in de klantmails van de proefmaand.

## 1.36.0 (30 september 2026)

**Proefmaand Optimaal ontzorgd met WhatsApp.** Alleen op uitnodiging: Jos klikt op de klantpagina op "Bied de proefmaand aan" en de klant krijgt één mail met een knop. Klikt hij, dan staat WhatsApp een maand aan (hij geeft zijn nummer door in het portaal, Jos koppelt). Een week voor het einde volgt één herinnering met een ja-knop. Zegt hij ja, dan wordt het maandbedrag vanaf de einddatum gepland op het ontzorgd-tarief (€39) via de bestaande bedragwijziging bij Mollie. Zegt hij niets, dan gaat WhatsApp vanzelf uit en verandert er niets aan het abonnement. Nooit automatisch doorbelasten.

- Dagelijkse controle herinnert en sluit af; de proef is in de admin ook handmatig te beëindigen.
- Vereist twee kolommen (db/migrations/20260930-proef-ontzorgd.sql) vóór de uitrol.

## 1.35.9 (30 september 2026)

- De feestbalk is een kaartje geworden dat op de telefoon netjes past; de ronde vorm werd daar een ei.

## 1.35.8 (30 september 2026)

- Het feestje bij de eerste blik op de live site duurt nu ruim zes seconden met meer confetti, en de balk zegt erbij: vanaf nu werk je je website bij via de WordSwap-chat in je portaal.

## 1.35.7 (30 september 2026)

- Het feest-script uit 1.35.6 deed niets: een aanhalingsteken brak het af. Hersteld, en de test controleert nu of het script geldige JavaScript is.

## 1.35.6 (30 september 2026)

**Een feestje bij de eerste blik op de live site.** De knop in de livemail opent de website met drie seconden confetti en de regel "Gefeliciteerd, je website staat live", met erbij dat alleen de klant dit ziet. Gewone bezoekers en Google zien nooit iets: het feestje verschijnt alleen met het toevoegsel uit die knop, alleen op een gewone pagina, en het toevoegsel verdwijnt meteen uit de adresbalk. De mail zelf verklapt niets.

## 1.35.5 (30 september 2026)

**WordPress-kopieën staan tijdelijk klaar.** Een kopie (vaak meerdere GB) blijft 30 dagen in het portaal; een week vooraf krijgt de klant één herinnering, daarna ruimt de dagelijkse controle hem op. Zo betalen we niet maandenlang voor opslag waar niets meer mee gebeurt. De uploadmail, de livemail, het portaal en de admin noemen de einddatum. Kopieën van vóór vandaag (RoelArt, Vakbeursonline) tellen vanaf vandaag: zij lopen tot 29 oktober.

## 1.35.4 (30 september 2026)

**Mail "je website staat live".** Op de klantpagina, zodra het eigen domein is ingevuld: één mail aan de klant met het nieuwe adres, wat we de komende dagen nog testen, dat formulierberichten sowieso binnenkomen, een knop naar de site en een persoonlijke noot. Optioneel met het verzoek de eigen mailserver te koppelen: de klant vult de servergegevens en het wachtwoord zelf in zijn portaal in, nooit per mail. Met voorbeeld en bevestigingsvraag.

- Route B: kopieerknop bij elke naam en waarde, geen overtypen meer. Stap 2 gaat open zodra de certificaten klaar zijn (bij een domein dat al bij Cloudflare zit gaat "herkend" pas na het omzetten op groen).
- WordPress-back-up: tot 10 GB, upload in delen (Van den Berg: 3,7 GB).
- Van den Berg Mediation staat sinds vandaag live op vandenbergmediation.nl via route B, zonder onderbreking: alle 114 oude adressen werken, titels en omschrijvingen gelijk aan de oude site.

## 1.35.3 (30 september 2026)

**Importbestand voor de hoster.** Het blok "Domein blijft bij de hoster" heeft per stap een downloadknop: stap 1 de zes controleregels, stap 2 de twee verwijzingen. De hoster (of Jos, in het account van de hoster) importeert het bestand in één keer in plaats van alles over te typen. Getest bij Cloudflare: zes regels in één keer, allemaal op alleen DNS.

## 1.35.2 (30 september 2026)

**Aanmelden bij de hoster staat los van het veld Domein.** Het blok "Domein blijft bij de hoster" heeft een eigen invoerveld. Het veld bij Instellingen blijft leeg tot de overstap, want dat veld rolt de site opnieuw uit en stuurt formulieren en het maillogo naar het nieuwe adres. Zodra het certificaat klaar is, zegt het blok dat het moment van de overstap er is en wat er dan in welke volgorde moet.

**De werkversie wordt niet meer overschreven bij een domeinwijziging** zolang de klant een open concept heeft. Dezelfde controle als in het uitrolscript, nu ook in de admin.

## 1.35.1 (29 september 2026)

**Overstap zonder onderbreking.** Blijft het domein bij de hoster en heeft de site bezoekers, dan zet de hoster eerst controleregels in zijn DNS. Het certificaat staat dan klaar terwijl de oude site nog draait. Pas daarna gaat de verwijzing om. Bewezen op een testadres bij Domeinwinkel: de eerste meting na het omzetten gaf de site met een geldig certificaat.

- Het blok "Domein blijft bij de hoster" toont de twee stappen in volgorde, en zegt wanneer de verwijzing om mag.
- Het blok is altijd zichtbaar, ook als er nog geen domein is ingevuld.
- De admin ziet per adres of het al via ons loopt.
- "Snel aanmelden" blijft bestaan voor een domein waar nu niets op draait.

## 1.35.0 (29 september 2026)

**Hoofdadres per site: met of zonder www.** Een site die met www in Google staat, houdt www. Bij Instellingen staat een vinkje "Hoofdadres met www"; de site toont zich dan op www en het adres zonder www stuurt door. Standaard staat het uit, dus bestaande sites merken niets. Het domeinveld zelf blijft altijd zonder www, zodat een per ongeluk geplakte www nooit een site omgooit.

- Het oogst-script meet bij een migratie welk adres de oude site gebruikt en zegt of het vinkje aan moet.
- De livegang-controle keurt goed wat bij het gekozen hoofdadres hoort.

**Het domein blijft bij de hoster, nu ook in de admin.** Op de klantpagina staat een blok "Domein blijft bij de hoster": aanmelden met één knop, de regels voor de hoster in gewone taal, en de stand van verwijzing en certificaat per adres.

- De livegang-controle telt zo'n domein als gekoppeld.
- Het gezondheidsdashboard bewaakt dagelijks of de verwijzing en het certificaat nog actief zijn, en of geen eigen adres van wordswap.nl via Cloudflare loopt.

Vereist de kolom hoofdadres_www (db/migrations/20260929-hoofdadres-www.sql) vóór de uitrol.

## 1.34.9 (29 september 2026)

**Nooit meer een pagina zonder slotje.** Wie het onbeveiligde adres (http) van een site opent, wordt nu doorgestuurd naar het beveiligde adres (https). Tot nu toe toonde de site zich gewoon op beide. Samen met www gaat het in één doorverwijzing. Gevonden bij de livegang van aimia.nl; het gold voor alle sites.

- Sites op de nieuwe route (het domein blijft bij de hoster) hebben dit direct. Sites met een eigen koppeling krijgen het bij hun eerstvolgende publicatie.
- aimia.nl is de eerste site die live staat via de nieuwe route, met en zonder www.

## 1.34.8 (29 september 2026)

**Tweede route voor de livegang: het domein blijft bij de hoster.** Wil een hoster de DNS en de mail zelf houden, dan kan de website nu toch bij ons draaien. De hoster zet twee regels in zijn DNS die het websiteverkeer naar sites.wordswap.nl sturen; één verdeler kijkt naar de domeinnaam en serveert de juiste site. Wij raken de mailregels dan niet aan.

- Bewezen met een eigen testadres: aangemeld, certificaat binnen twee minuten, site bereikbaar, www stuurt door.
- Bestaande sites merken hier niets van: zij houden hun eigen koppeling.
- Nog alleen via de opdrachtregel (scripts/route-b.mts); de knop in de admin volgt.
- Nog niet getest voor een adres zonder www bij een externe hoster.

## 1.34.7 (29 september 2026)

**De mail hoort bij de eerste check.** Op elke leadkaart staat een knop Mailcheck. Eén klik laat zien waar domein, DNS en mail staan, in welke situatie de klant zit en wat het kost: mail die al los staat (niets verhuizen, inbegrepen), mail bij de hoster (blijven of verhuizen naar Soverin voor €75 inclusief de eerste postbus en €25 per extra postbus), alleen doorsturen, of geen mail.

- De check ziet of mail en website op dezelfde server staan en waarschuwt dan dat de hosting nog niet opgezegd mag worden.
- Vijf vaste regels op het scherm, waaronder: de klant licht zijn huidige leverancier zelf in, en aan de oude omgeving wordt niets veranderd.
- Kant-en-klare mail die de klant aan zijn huidige leverancier stuurt, met kopieerknop.

## 1.34.6 (29 september 2026)

**De demovideo staat nu bovenaan de homepage**, met een afspeelknop in het midden. Het klikbare voorbeeld werd nauwelijks gebruikt en is naar de plek lager op de pagina verhuisd ("Probeer het zelf"). De link bovenaan heet nu "Bekijk de video". De video laadt nog steeds pas na een druk op de knop.

## 1.34.5 (29 september 2026)

**Demovideo op de homepage.** Lager op de pagina staat nu een video van ruim 40 seconden met vier echte klussen in het portaal: foto vervangen, pagina toevoegen, nieuwsbericht plaatsen en kleur aanpassen. Het klikbare voorbeeld bovenaan blijft staan. Op de telefoon speelt de staande versie, op een breed scherm de vierkante. De video laadt pas als iemand op afspelen drukt, dus de pagina wordt er niet trager van.

## 1.34.4 (29 september 2026)

Reparatie: bij een lastige ontwerpvraag kon de chat halverwege stoppen met
"er ging bij ons iets mis", terwijl er niets mis was: hij zat nog na te
denken. Omdat dat nadenken geen enkel teken van leven gaf, dacht onze
bewaking dat hij vastzat. Nu geeft hij tijdens het nadenken gewoon
tekenen van leven en werkt hij rustig door. Je ziet daar zelf niets van.

## 1.34.3 (28 september 2026)

Twee dingen in je portaal die verwarrend waren. De knop om een testmail
van je bevestigingsmail te sturen zegt nu naar welk adres hij gaat, en
daarna "verstuurd naar ...". Eerst stond er alleen "naar mij", en dan
verwacht je hem misschien op een ander adres dan waarmee je inlogt.

En een logo dat we op je site vonden maar dat je nog niet gekozen hebt,
staat nu half doorzichtig met "nog niet gekozen" erbij. Het leek al in
je mails te staan, terwijl je het eerst nog moet kiezen.

## 1.34.2 (28 september 2026)

Inhaalslag: zeven wijzigingen van 26 en 28 september die alleen op de werkcomputer stonden en nooit waren uitgerold (het versienummer dat ze droegen, 1.31.6, was al bezet).

**Zoeken op de telefoon werkt overal hetzelfde, zoals bij Van den Berg.** Het vergrootglas staat op een smal scherm in de kopbalk naast de menuknop, en het zoekvenster klapt over de volle breedte direct onder de kop open, altijd bovenop de pagina. Een zoekveld dat op een groot scherm gewoon zichtbaar is, wordt op de telefoon vanzelf een vergrootglas.

**Het mobiele menu valt niet meer achter de pagina.** De controle voor oplevering opent het menu nu op telefoonformaat en kijkt of alle menulinks echt bovenop liggen. Ook ziet hij het als een telefoon de pagina uitzoomt omdat er iets buiten beeld staat.

**De ontwerpbalk blijft op de telefoon één regel.** Op een smal scherm liep de tekst over twee regels en schoof hij over het logo van de site heen.

- De verdwenen-check herkent ook het zoekveld in de bovenbalk.
- De dubbele-foto-check slaat beelden over die voor de bezoeker verborgen zijn (tweede kopie in een lopende logostrook).
- Migratierapport als pdf in WordSwap-huisstijl (scripts/migratie-rapport.mts), vaste stap na elke migratie. Past bij het rapportveld in de koppelmail.
- Poortregel link-tekst: een link met alleen een beeld zonder beschrijving is een fout.
- Leerpunten van de migraties Summit Group (YOOtheme) en UNDSQVRD (Webflow) in de skill.

## 1.34.1 (28 september 2026)

- Handtekening onder formuliermails: de bedrijfsnaam onder het logo kan uit (keuze in het handtekeningformulier in portaal en admin). Handig als de naam al in het logo staat. Zonder logo blijft de naam altijd staan.
- Vereist de kolom mail_naam_verbergen (db/migrations/20260928-mail-naam-verbergen.sql) op de database vóór de uitrol.

## 1.34.0 (28 september 2026)

Een nieuw bericht, project of dienst maakt de chat nu op basis van een
bestaande pagina: hij kopieert een vergelijkbare pagina en past alleen aan
wat anders is (titel, datum, tekst, foto). Eerst typte hij de hele pagina
opnieuw uit. Dat scheelt ongeveer een derde van de kosten van zo'n klus,
en de opmaak is gegarandeerd gelijk aan je andere berichten.

Reparatie: een automatische nabewerking zette bij sommige afbeeldingen
een instelling twee keer in de code. Onzichtbaar voor bezoekers, maar
slordig; dat gebeurt niet meer.

## 1.33.0 (28 september 2026)

De chat werkt nu ongeveer twee keer zo zuinig. Bij een klus met meerdere
stappen stuurde hij elke stap alles wat hij al gelezen had opnieuw mee
tegen de volle prijs; dat komt nu grotendeels uit het geheugen. Op een
grote site kostte een nieuw bericht zo'n 50 cent en werd het halverwege
afgekapt; nu kost dezelfde klus de helft en wordt hij afgemaakt. Dat
betekent ook dat je maandbudget verder reikt.

Vraag je om een nieuw bericht "bij actueel", dan zet de chat het nu ook
echt in het Actueel-blok op je homepage, in plaats van eerst te vragen
waar het moet komen. Heeft dat blok een vast aantal tegels, dan valt het
oudste bericht eraf en hoor je welk. En hij doet eerst het zichtbare
werk, zodat er nooit een half bericht zonder vermelding blijft staan.

Het voorbeeld in de paarse hint van de chat komt nu uit je eigen pagina:
een echte knop, prijs of kop, in plaats van altijd de openingstijden.

Op wordswap.nl zelf: een Meta-pixel achter de cookiekeuze, met de
cookiebalk en het privacybeleid daarop aangepast.

## 1.32.7 (28 september 2026)

- Het ⓘ-voorbeeld van de koppelmail toont nu ook het opleverrapport: een bijlage-regel in het kopje en de bijlage-zin in de mail, op basis van het gekozen bestand.

## 1.32.6 (28 september 2026)

- Opleverrapport bijvoegen bij het koppelen van een klantaccount: een pdf (max 10 MB) gaat als bijlage mee in de koppelmail, met een zin in de mail die de bijlage aankondigt. Het veld zit in het hoofdformulier en bij het opnieuw sturen van de mail. Een fout bestand wordt geweigerd vóór er iets wordt aangemaakt.
- Server-action-limiet van 1 naar 12 MB, anders strandde elke echte pdf-upload.
- Nieuwe bewakingstest koppel-rapport (met drievoudige bijt-controle).

## 1.32.5 (27 september 2026)

- Verzendrem op outreach-mails. Het bewerkformulier had versturen als standaardactie, waardoor een Enter in het onderwerpveld de mail zonder vraag verstuurde (echt gebeurd: mail 1 aan Schildersbedrijf Willemsen ging onbedoeld de deur uit). Opslaan is nu de standaardactie en elke verstuurknop stelt eerst een bevestigingsvraag met het e-mailadres erin.
- Het groene vinkje na een actie verschijnt alleen nog op de knop die echt is ingedrukt. Voorheen toonden bij twee knoppen in één formulier beide hun klaarlabel ("Verstuurd" naast "Opgeslagen" terwijl er alleen opgeslagen was).
- Nieuwe bewakingstest outreach-verzendrem (met drievoudige bijt-controle).

## 1.32.4 (27 september 2026)

**De AI-verbeterknop laat afbeeldingen in outreach-mails met rust.** De
herschrijf-AI kende de afbeelding-markering niet en kon hem bij "maak het
korter" per ongeluk omschrijven tot een kale link; nu weet hij dat zo'n
regel exact moet blijven staan, netjes op een eigen regel.

## 1.32.3 (27 september 2026)

**De livegang-checklist bewaakt nu ook "één adres voor Google".** Bij elke
live klantsite wordt gecontroleerd dat www netjes doorverwijst naar het kale
domein, dat de canonical van de homepage naar datzelfde adres wijst en dat
de sitemap dezelfde huisstijl gebruikt. Staat dat scheef, dan verdeelt
Google de posities over twee adressen; nu zie je het als rode regel met
precies wat er mis is. Aanleiding: de controle voor Van den Berg Mediation,
waar het gelukkig al perfect stond.

## 1.32.2 (27 september 2026)

**De livegang-checklist controleert nu ook de Google-aanmelding.** Een vers
domein met perfecte techniek kan maandenlang buiten Google blijven als
niemand hem bij Search Console aanmeldt. De checklist kijkt voortaan of er
een Google-verificatie op het domein staat (als DNS-regel of als meta-tag,
van wie dan ook) en legt uit wat er moet gebeuren als die ontbreekt, met de
eerlijke kanttekening dat een klant ook via een andere weg geverifieerd kan
zijn.

## 1.32.1 (27 september 2026)

**Outreach: afbeeldingen doen het nu echt, en je kunt eerst kijken en
proeven.** De afbeelding-knop in de mailbewerker zette een markering neer die
het outreach-verzendpad niet kende, waardoor er kale codetekst in de mail
belandde; dat is gerepareerd. En naast de afbeelding-knop staan nu twee
nieuwe: "Bekijk hoe hij eruitgaat" (opent precies jouw bewerkte tekst zoals
de ontvanger hem ziet, met voorbeeldgegevens ingevuld) en "Proef naar
mijzelf" (stuurt hem echt, via het outreach-verzendpad, alleen naar je eigen
adres). Zo test je een mail volledig voordat er ook maar iets naar een
prospect gaat.

## 1.32.0 (26 september 2026)

**Nieuw: het gezondheidsdashboard.** Elke nacht raakt WordSwap al zijn stille
afhankelijkheden echt aan: de database, mail versturen én de mailbox,
Cloudflare, GitHub, Mollie, de Meta-leadkoppeling, de AI-verbinding, de
UptimeRobot-bewaking en elke live klantsite (antwoordt hij, en staat onze
uitrol er echt op?). De uitslag staat als stoplichtjes op één pagina in het
beheer, met daaronder de versie-waakhond die laat zien welke van onze
bouwpakketten achterlopen. Wordt iets rood dat gisteren groen was, dan krijgt
Jos automatisch één mailtje; geen dagelijkse "alles is oké"-post. Met een
"Nu controleren"-knop voor een verse meting op elk moment.

## 1.31.6 (26 september 2026)

**Elke landingspagina beantwoordt nu zijn eigen vragen.** Twaalf pagina's
over WordPress en AI herhaalden deels dezelfde standaardantwoorden; nu heeft
elke pagina vragen over zijn éigen onderwerp (onderhoud en veiligheid,
snelheid, het overstapproces, andere platformen dan WordPress, je eigen AI
gebruiken), en bewaakt een test dat een vraag nooit op twee pagina's tegelijk
staat. Ook nieuw: de overstap-pagina's en de nieuw-ontwerp-pagina's verwijzen
naar elkaar met de juiste prijzen (overstap vanaf €150, nieuw ontwerp vanaf
€250), zodat die twee nooit meer door elkaar gehaald worden.

## 1.31.5 (26 september 2026)

**De ontwerpbalk en een plakkend sitemenu zitten elkaar niet meer in de
weg.** Op een ontwerpvoorbeeld met een menu dat aan de bovenkant plakt,
verdween dat menu bij het scrollen achter onze "dit is niet je echte
website"-balk. De balk geeft nu zijn hoogte door als variabele, zodat
sitemenu's er automatisch onder kunnen schuiven; op de echte site verandert
er niets. De bouwregels schrijven dit patroon voortaan voor.

## 1.31.4 (26 september 2026)

**Je eigen opmerking in de ontwerp-mails is nu een herkenbaar kadertje.**
Met het kopje "Persoonlijke noot van Jos" en een groen accent, zodat de klant
in één oogopslag ziet wat persoonlijk voor hem geschreven is en wat de vaste
uitleg is.

## 1.31.3 (26 september 2026)

**De ontwerp-mail vertelt standaard dat de chat er nog niet op werkt.** De
klant weet nu vanzelf dat hij het ontwerpvoorstel in deze fase niet zelf via
de chat aanpast, en dat een antwoord op de mail genoeg is om iets te laten
wijzigen.

## 1.31.2 (26 september 2026)

**Het mailvoorbeeld bij het ontwerp toont nu ook je eigen opmerking.** De
voorbeeldknop liet de standaardmail zien zonder de tekst die je in het vak
had getypt; nu neemt hij die gewoon mee, zodat je precies ziet wat de klant
krijgt.

## 1.31.1 (26 september 2026)

**Een verborgen ontwerp blijft voor de beheerder bereikbaar, en een oude
link legt zichzelf uit.** Verbergen gooide het ontwerp-adres helemaal weg;
veilig voor de klant-link, maar de beheerder kon er dan zelf ook niet meer
bij, en wie de oude link nog had zag een kale foutmelding. Voortaan
verwisselt verbergen het adres: in het beheer staat direct een nieuw geheim
adres om mee te blijven kijken, en op het oude adres verschijnt een nette
melding ("deze link is vervangen; onverwacht? mail of bel ons even"), met
de geruststelling dat de website zelf gewoon doordraait.

## 1.31.0 (26 september 2026)

Vraag je om icoontjes of kleurvarianten om uit te kiezen, dan krijg je nu
kieskaartjes in de chat: kleine plaatjes met een naam eronder, een tik en
hij wordt geplaatst. Achter de drie puntjes zitten er twee knoppen bij:
icoontjes laten maken en je hele site laten nakijken op dode links.

Bij de SEO-knop kun je nu ook instellen hoe je pagina eruitziet als iemand
hem deelt via WhatsApp of Facebook: eigen kop, tekst en een foto uit je
fotobank, met een voorbeeldkaartje erbij. Nieuwe knoppen zetten je
bedrijfsgegevens klaar voor Google en laten alle alt-teksten nakijken.
Het paneel opent nu midden over de pagina en scrolt netjes op kleine
schermen.

De foto-, video- en audiobank tonen de nieuwste bovenaan, met een
volgorde-keuze. Uit de fotobank kon je al meerdere foto's tegelijk
meesturen met een opdracht.

In WhatsApp krijg je de link naar je live site niet meer tijdens het
wijzigen (die toonde nog de oude stand) maar precies bij "Staat live!".
En loopt een website tegen zijn maandbudget aan, dan krijgt WordSwap daar
nu zelf ook een seintje van, zodat je geholpen wordt ook als je vergeet
te mailen.

## 1.30.36 (26 september 2026)

**iDEAL heet op alle betaalplekken nu "iDEAL / Wero".** iDEAL gaat op in het
Europese Wero; klanten zien bij hun bank steeds vaker die naam. De betaalknop
in de mail, de betaalpagina, de opdrachtbevestiging en de admin-uitleg noemen
voortaan beide namen, zodat niemand schrikt van een onbekend woord.

## 1.30.35 (26 september 2026)

**De betaalmail zegt niet meer dat je website al bij ons draait.** Op het
moment van betalen is de overstap nog niet gebeurd; de mail begint nu met
"Fijn dat je gebruik wilt maken van WordSwap!". En het lange streepje in de
onderwerpregel is vervangen door een komma.

## 1.30.34 (26 september 2026)

**De klant krijgt een mailtje rond zijn nieuwe ontwerp, twee kanten op.**
Zet je het ontwerpvoorstel zichtbaar, dan gaat er standaard een mail mee
(uitvinkbaar) met een knop naar het ontwerp, de geruststelling dat er niets
live staat, en ruimte voor een eigen opmerking bovenaan; met voorbeeldknop.
Trek je het ontwerp weer terug, dan gaat er net zo'n mailtje uit dat de
bekijk-link tijdelijk niet werkt en dat de huidige site gewoon doordraait,
zodat niemand op een dode link stuit zonder uitleg. (Het zichtbaar-deel kwam
door een samenloop met de WhatsApp-releases al zonder eigen nummer mee met
1.30.33; bij deze alsnog netjes vermeld.)

## 1.30.33 (26 september 2026)

Reparatie: in het WhatsApp-bericht over een te grote klus stond door een
tekenfout "Ã©Ã©n" in plaats van "één". Binnen het uur hersteld.

## 1.30.32 (26 september 2026)

Reparatie in WhatsApp: het webadres van je website staat nu als klikbare
link op een eigen regel, bijvoorbeeld onder "Goed, we werken nu aan Aimia".
Eerst stond het adres tussen haakjes achter de naam; daar maakte WhatsApp
geen link van en kopiëren ging ook niet. Verder zijn de laatste lange
streepjes uit de vaste WhatsApp-teksten gehaald.

## 1.30.31 (26 september 2026)

**Dode links laten opsporen, en een opgeruimde werkbalk.** In de tips onder
de chat staat nu dat je gewoon kunt vragen "controleer mijn site op dode
links": de chat loopt dan alle pagina's na, meldt per pagina wat er kapot is
en repareert het op verzoek meteen (met de eerlijke kanttekening dat hij
adressen buiten je site niet kan bezoeken). En de losse fotobank-knop achter
de drie puntjes is weg: de Fotobank zit al achter de paperclip, twee ingangen
was dubbelop.

## 1.30.30 (26 september 2026)

**"Laat mij zelf kijken" is nu een echte knop, en de chat tekent zelf
iconen.** De controleknop onder een antwoord (de AI maakt een schermafbeelding
van wat jij ziet en beoordeelt zijn eigen werk) was een klein grijs regeltje
dat je zo overkeek, terwijl het een van de nuttigste functies is. Hij valt nu
op en legt zichtbaar uit wat hij doet. Daarnaast weet de chat voortaan dat hij
icoontjes, silhouetten en simpele illustraties gewoon zelf kan tekenen, in de
stijl van de site; hij zegt dus nooit meer dat hij dat niet kan.

## 1.30.29 (26 september 2026)

**De chat heeft een nieuwe, eigen motor.** De vastloper van vandaag zat in de
kant-en-klare gereedschaps-lus van het Anthropic-pakket, die af en toe zijn
weksignaal verliest; de makers hebben hun reparatie daarvoor nooit afgemaakt.
Die lus is er nu helemaal uit: de chat stuurt zijn stappen voortaan zelf aan,
met dezelfde gereedschappen en veiligheidsregels, en de stiltewachter blijft
als extra vangnet staan. In de bewijsronde rondde de nieuwe motor drie van de
drie ritten netjes af waar de oude er drie van de vier liet hangen. Grote
opdrachten zoals een nieuwe pagina met menu-aanpassing horen hiermee gewoon
weer af te komen.

## 1.30.28 (26 september 2026)

**Een storing heet nu een storing.** Als het vangnet van vanochtend een
vastgelopen beurt afbrak, kreeg je soms "dit verzoek is te groot, knip het
op", ook bij een simpele vraag als "maak een referentiepagina". Dat was niet
waar en het legde de schuld bij jou. Voortaan zegt de chat dan eerlijk: er
ging bij ons iets mis, er is niets veranderd (of: wat af is staat als concept
klaar), probeer het gewoon opnieuw. "Te groot, knip op" verschijnt alleen nog
als de opdracht echt te groot was.

## 1.30.27 (26 september 2026)

**Anthropic-pakket bijgewerkt van 0.120 naar 0.128, en een eerlijke
bekentenis.** De update is door de volledige teststraat en de naspeelproef
gegaan; de vastloper van vanochtend zit ook in de nieuwste versie (de makers
hebben hun eigen oplossing daarvoor nooit afgemaakt), dus onze stiltewachter
blijft het vangnet. Daarnaast: versies 1.30.25 en 1.30.26 zijn per ongeluk
uitgebracht terwijl één test faalde; een koppelteken in het releasedraaiboek
maskeerde de foutcode. De test is hersteld en het draaiboek controleert
voortaan de echte uitslag. Aan de sites zelf is niets misgegaan; de falende
test bewaakte een regel die inmiddels door een betere was vervangen.

## 1.30.26 (26 september 2026)

**De stopknop zegt nu gewoon "Stop".** Tijdens het werken werd de
verstuurknop een klein rood vierkantje, en dat werd niet herkend als "hier
kun je stoppen". Nu staat het woord erop, zodat iedereen weet dat een lopende
opdracht altijd veilig af te breken is; er verandert dan niets aan de site.

## 1.30.25 (26 september 2026)

**De echte oorzaak van de hangende chat is gevonden en gevangen.** De motor
onder de chat verliest heel af en toe tussen twee stappen zijn weksignaal: er
is dan geen fout en geen lopend verzoek, hij wacht gewoon eeuwig, en geen
enkele tijdslimiet komt er nog bij. Drie keer nagespeeld op een kopie van EVC
Autotechniek, drie keer raak. Elke wachtstap heeft nu een eigen wekker: blijft
het anderhalve minuut volledig stil, dan geeft de chat het op, bewaart hij wat
er al gebouwd is als concept en zegt hij dat eerlijk. In de naspeelproef kwam
een beurt die voorheen eeuwig hing nu netjes terug, mét de gebouwde pagina.

## 1.30.24 (26 september 2026)

**De chat overlegt eerst, belooft eerlijk en kan echt niet meer blijven
hangen.** Bij elke opdracht die meer is dan een kleine tekstaanpassing zegt de
chat nu éérst in één zin wat hij gaat doen, en bouwt hij daarna; zo kun je
bijsturen terwijl hij werkt. De wachtmelding bij grote klussen zei "over 1
minuten rond ik af" en bleef dat zeggen; nu telt hij netjes af en vertelt hij
na de bouwgrens eerlijk dat hij aan het afronden is. En de harde tijdkap die
de nacontroles al hadden, zit nu ook op het hoofdwerk zelf. De zin waarmee de
chat uitlegt dat hij niet op internet kan zoeken is bovendien vriendelijker:
"daar is deze chat niet voor bedoeld" in plaats van "ik heb geen internet".

## 1.30.23 (26 september 2026)

**De chat is eerlijk over wat hij niet kan, en zegt zijn plan meteen.** De
chat heeft geen internet, maar dat stond nergens; op "kijk wat ik op Google
heb staan" zou hij kunnen doen alsof. Nu zegt hij eerlijk dat hij dat niet
kan en biedt hij aan wat wél werkt (plak de teksten of een schermafbeelding
in de chat). En bij een opdracht met meerdere onderdelen verschijnt de
volgorde-zin nu als allereerste bericht, vóór hij aan het werk gaat, zodat je
direct ziet wat er gaat gebeuren.

## 1.30.22 (26 september 2026)

**Een zoekvak dat niets kan vinden wordt nu tegengehouden.** De zoekfunctie op
een klantsite leest een index die pas bij het publiceren wordt gebouwd, en
pagina's zonder titel vallen daar stil buiten. De opleveringspoort controleert
voortaan: heeft de site een zoekvak, dan moet die index ook echt pagina's gaan
bevatten. Zo kan er nooit een zoekvak online komen waar een bezoeker niets in
kan vinden.

## 1.30.21 (26 september 2026)

**De chat benoemt bij een meerdelige opdracht eerst de volgorde.** Vraag je
meerdere dingen in één bericht (een pagina maken én reviews erop én het menu
aanpassen), dan zegt de chat eerst kort wat hij in welke volgorde doet, en
maakt hij liever één onderdeel helemaal af dan drie half. Lukt niet alles in
één keer, dan staat er precies wat er nog openstaat. En wie tijdens een
lopende opdracht iets anders probeert (zoals foto's ordenen), krijgt nu een
duidelijke melding: even wachten tot de chat klaar is, dan kan het meteen.

## 1.30.20 (26 september 2026)

**De chat kan niet meer blijven hangen op een nacontrole.** Bij het testen op
EVC Autotechniek bleef de chat minutenlang staan op "Ik loop de vaste
afspraken na...", en zolang die vastzat was ook de terugzetknop geblokkeerd.
De tijdgrens van zo'n ronde werd alleen tussen stappen gecontroleerd; één
hangende stap kon er dwars doorheen. Voortaan wordt de ronde na zijn
tijdslimiet echt afgebroken en gaat de beurt gewoon verder met opslaan en
publiceren.

## 1.30.19 (25 september 2026)

**De reviewvraag nodigt nu ook uit om ontevredenheid te melden.** Direct onder
de reviewknop staat: ben je ergens niet tevreden over, antwoord dan juist ook
op deze mail, dan lossen we het op. Eerlijker naar de klant, en een klacht
komt zo eerst bij ons terecht in plaats van meteen in een openbare review.

## 1.30.18 (25 september 2026)

**De reviewvraag-mail legt nu uit wat een "ja" betekent.** De vraag of we een
website als voorbeeld mogen noemen was te vaag. De mail noemt voortaan de drie
plekken (wordswap.nl, Facebook, LinkedIn, steeds met plaatje en link), laat de
klant per plek kiezen, en benoemt eerlijk het voordeel voor de klant zelf: elke
vermelding is een extra link naar zijn website en dus goed voor zijn eigen
vindbaarheid.

## 1.30.17 (25 september 2026)

**Kleine tekstverbetering in de reviewvraag-mail:** "het helpt mijn kleine
bedrijf enorm" is nu "het helpt mijn bedrijf enorm".

## 1.30.16 (25 september 2026)

**Het blok "Documenten over je bedrijf" is uit het portaal gehaald.** Het
hoorde bij de chatbot die er nog niet is, en zolang die er niet is leidt een
uploadvak met "binnenkort" alleen maar af. Eerder geüploade documenten blijven
gewoon bewaard. Het blok komt terug zodra de chatbot er is en per klant aan of
uit gezet kan worden.

## 1.30.15 (25 september 2026)

**Leads bellen of appen zonder overtypen.** Het telefoonnummer van een lead
(uit het Meta-formulier of zelf ingevuld) staat nu in de leadlijst, en in het
opengeklapte blok zijn e-mail en nummer klikbaar. Nieuw is de knop "App: net
gemaild": die opent WhatsApp met dat nummer en een voorgetypt berichtje dat er
een mail onderweg is, met de voornaam er al in. Even aanpassen en versturen.

## 1.30.14 (25 september 2026)

**Meekijken als de klant.** Op de klantpagina in het beheer staat nu de knop
"Bekijk als klant": die opent het gewone klantportaal van die site, precies
zoals de klant het ziet, met een gele balk erboven zodat je altijd weet dat je
meekijkt. Zo kun je vóór het koppelen controleren of alles er goed bij staat,
zonder de site eerst aan jezelf te hangen en later over te dragen. Kijken wel,
beslissen niet: opzeggen en het opleveringsakkoord werken alleen nog voor de
eigenaar zelf, zodat een meekijker die knoppen nooit per ongeluk namens de
klant kan indrukken.

## 1.30.13 (25 september 2026)

**De websitedownload is nu een echt vertrekpakket.** De downloadknop in het
portaal gaf tot nu toe de ruwe bouwbestanden: zette je die ergens anders neer,
dan misten menu, topbalk en voettekst op elke pagina. Voortaan krijg je de site
precies zoals hij online staat, met de zoekfunctie erbij en je eigen domein al
ingevuld. En er zit een handleiding in (VERTREK.md): wat je moet doen om de
site ergens anders neer te zetten, welke formulier-regel je dan moet aanpassen
en waarom je de e-mailinstellingen van je domein met rust laat, inclusief een
kant-en-klaar bericht voor ChatGPT of Claude dat je er stap voor stap doorheen
helpt. Alles is van jou, ook in de praktijk.

## 1.30.12 (25 september 2026)

**Zeven lessen uit de Van den Berg-controle zitten nu vast in de bouwregels.**
Een aanmeldformulier van een externe dienst (zoals ActiveCampaign of Mailchimp)
wordt voortaan één-op-één overgenomen en nooit meer omgebouwd naar ons eigen
formulier, want dan breken de opvolgmails van die dienst. Sitetracking breder
dan Google (ActiveCampaign, HubSpot, Hotjar, Clarity) gaat ook intact mee. En
drie bouwfouten die stil misgingen zijn nu regels: een link met een knop-klasse
blijft een opgemaakte knop, verborgen elementen blijven écht verborgen (ook
binnen een grid), en een blog- of kennisoverzicht toont alle berichten, ook als
het oude overzicht achterliep. Meetscripts krijgen een vaste plek
(delen/meten.html) en starten pas na de eerste weergave: zelfde meetcodes,
merkbaar snellere site.

## 1.30.11 (25 september 2026)

**Een overgezette website blijft nu écht hetzelfde, ook met ingesloten kaarten.**
Cookie-vrij was een doel op zich geworden: een ingesloten Google Maps-kaart werd
bij het overzetten vervangen door een linkje, en dan is de kopie zichtbaar een
andere website. Dat is omgedraaid. Wissels die niemand ziet blijven (YouTube en
Vimeo in de variant die pas cookies zet bij het afspelen), maar een kaart of
andere embed zonder zo'n onzichtbare variant komt voortaan één-op-één mee. Ook
vastgelegd: meetscripts zoals Google Analytics en de Meta Pixel gaan met
dezelfde meetcodes mee (statistieken lopen zonder gat door), en
verificatie-tags voor Search Console en Meta verhuizen mee of worden door ons
opnieuw gezet; de klant hoeft daar niets voor uit te zoeken.

## 1.30.10 (24 september 2026)

**E-mail staat nu als apart blok in de livegang-checklist.** Bij een overstap
verhuist de website, maar de e-mail moet blijven draaien waar hij draait. Alles
wat daarvoor nodig is staat in de domeininstellingen, en juist daar gaat het
mis: één vergeten regel en de post stopt of belandt stilletjes in de spam,
terwijl de website perfect werkt. Daar zie je het dus niet aan. De checklist
controleert nu per klant waar de mail draait, of de instellingen compleet zijn,
en waarschuwt als de mail bij de oude webhoster staat: die hosting mag dan niet
opgezegd worden.

## 1.30.9 (24 september 2026)

**Foto's in meerdere maten, zodat een telefoon niet het grote beeld hoeft te
laden.** Tot nu toe kreeg elke afbeelding één formaat: 2000 pixels breed, ook
op een scherm van 390. Bij één foto merk je dat niet, bij een pagina met
tientallen werken is dat het verschil tussen snel en traag. Er komen nu
kleinere versies naast, en de browser kiest zelf welke hij nodig heeft. In een
fotogalerij laden de miniaturen voortaan de kleine versie; klik je erop, dan
komt het grote beeld. Gemeten op een schilderij van een kunstenaar: 363 kB werd
133 kB per miniatuur. Voor bestaande sites verandert er niets aan de adressen
van de foto's, en een afbeelding die iemand zelf heeft ingericht blijft zoals
hij is.

## 1.30.8 (23 september 2026)

**Leads uit Meta komen nu echt binnen.** Meta kent twee soorten sleutels: één
voor je bedrijf en één voor je pagina, en alleen die tweede mag leadformulieren
lezen. Dat is nergens te zien en levert alleen een cryptische foutmelding op.
Het systeem leidt die paginasleutel nu zelf af uit de sleutel die je invult, dus
je hoeft er niets extra's voor te doen. Welke rechten je precies nodig hebt
staat voortaan in de code opgeschreven, zodat dit niet nog een keer uitgezocht
hoeft te worden.

## 1.30.7 (23 september 2026)

**De leadlijst laat nu zien wat er als laatste gebeurde.** In elke regel stond
alleen je vólgende actie. Mailde je iemand vanuit je eigen postbus, dan zag je
dat nergens terug en leek het alsof er niets was gebeurd. Boven de volgende
actie staat nu wanneer er voor het laatst contact was en welke kant het op
ging, of dat nu via de Mailer of via je eigen mailbox liep. De lijst staat ook
standaard op laatste contact bovenaan; wil je hem weer als takenlijst, dan zet
je hem met één keuze terug op eerstvolgende actie.

**En je leest meer van een mail.** Van elk bericht werd maar een klein stukje
bewaard, waardoor je net het deel miste waar het antwoord in stond. Dat is nu
drie keer zoveel. De aanhalingen van eerdere mails blijven eraf, dus je krijgt
alleen wat iemand zelf geschreven heeft en niet de hele antwoordreeks.

## 1.30.6 (23 september 2026)

**Eerst je vraag typen, dan pas WhatsApp.** De knop rechtsonder heet nu "Stel
je vraag" en opent een klein vak waarin de bezoeker zijn vraag schrijft. Die
tekst staat daarna klaar in WhatsApp, waar hij hem zelf verstuurt. Dat scheelt
een heen en weer: voorheen kwam er "ik heb een vraag over de prijzen" binnen en
moest je terugvragen wélke vraag. Onder zijn vraag komt automatisch één regel
te staan met de pagina waar hij vandaan kwam, zodat je de context hebt zonder
erom te vragen. Er staat met zoveel woorden bij dat het bericht in WhatsApp
verstuurd wordt en niet door de knop zelf.

## 1.30.5 (23 september 2026)

**Appen kan nu overal op de site.** Rechtsonder staat op elke pagina een
WhatsApp-knop, en daarnaast staat het in de voettekst, op de contactpagina en
onder de prijzen. Het bijzondere zit in wat er alvast in het bericht staat: wie
vanaf de kapperspagina klikt stuurt "ik heb een kapsalon en een vraag over mijn
website", en wie vanaf de prijzen komt stuurt iets anders. Zo is meteen duidelijk
waar iemand vandaan komt. Het is een gewone link, geen chatwidget: er wordt
niets extra's geladen en er gaat pas iets naar WhatsApp als je er zelf op klikt.
Op het portaal, de demo en de planpagina blijft de knop weg, want daar staat de
chat al rechtsonder.

## 1.30.4 (23 september 2026)

**Zelf een afspraak vastleggen.** Heb je al per mail of telefoon een moment
afgesproken, dan hoefde je tot nu toe alsnog de hele planlink-route te lopen,
terwijl de ander die link nooit gebruikt heeft. Op de leadkaart staat nu
"Zelf een afspraak vastleggen": datum, tijd en duur invullen en hij staat in je
agenda. Er gaat geen mail uit, want die heeft de ander al van jou gehad. De
lead schuift daarna vanzelf naar "Afspraak gepland" en dat tijdvak is meteen
bezet in je planlink, zodat niemand er overheen kan boeken.

## 1.30.3 (23 september 2026)

**Geen achternaam meer onder de post.** Mail uit de Mailer kwam binnen als
"Jos Klijnhout | WordSwap" en zette er onderaan nog eens "Jos Klijnhout" bij.
Dat leest als een brief van een instantie. Zowel de afzendernaam als de
handtekening staan nu overal op "Jos van WordSwap": in de Mailer, onder
facturen, onder de opzegmail en in het bericht dat we in een contactformulier
achterlaten. Op de website blijft de volledige naam gewoon staan, want daar is
het juist het tegenovergestelde: daar wil je zien met wie je te maken hebt.

## 1.30.2 (23 september 2026)

**Bevestigingen aan potentiële klanten kwamen niet aan bij een tikfout.** Wie
via de planlink een moment koos, moest zijn naam en e-mailadres opnieuw
intypen, en alle mails daarna gingen naar dat getypte adres. Eén tikfout en de
bevestiging, en later ook de afzegging, verdwenen in het niets. Nu gebruiken we
bij een potentiële klant gewoon het adres waar de uitnodiging al heen ging. Hij
ziet op de pagina naar welk adres de bevestiging gaat en hoeft niets meer in te
vullen.

**Voorbeeld bekijken kan nu ook bij potentiële klanten.** Het ⓘ-knopje naast de
uitnodiging, de bevestiging en de afzegging laat de mail zien precies zoals hij
aankomt, met het onderwerp dat je zelf invulde. Er wordt niets verstuurd.

## 1.30.1 (22 september 2026)

**Zelf het onderwerp van de afspraakmails kiezen.** De uitnodiging aan een
potentiële klant heette altijd "Even kennismaken?", maar soms is het gesprek
allang afgesproken en wil je alleen nog momenten voorstellen. Bij het versturen
kun je nu zelf een onderwerp meegeven, en dat kan ook bij de bevestigingsmail.
Laat je het leeg, dan blijft alles zoals het was. Laat je de standaardzin weg,
dan wordt het onderwerp voortaan "Wanneer schikt het jou?" in plaats van een
kennismaking die het niet is.

## 1.30.0 (22 september 2026)

Een afspraak inplannen kan nu ook met iemand die nog geen klant is. Stond
iemand op de leadlijst, dan kon je hem tot nu toe geen momenten voorstellen:
de afsprakenmodule werkte alleen bij bestaande klanten. Vanaf nu zet je bij een
lead net zo goed een paar dagen klaar, stuur je hem het voorstel per mail, en
kiest hij zelf een moment.

Wat daarbij hoort:

* De uitnodiging aan iemand die nog geen klant is gaat over kennismaken en
  belooft geen telefoontje: bellen of videobellen mag hij zelf zeggen.
* Bij het bevestigen kun je invullen hoe je contact opneemt, bijvoorbeeld dat je
  een Zoom-link stuurt. Dat staat nu ook op de pagina waar hij zijn moment koos,
  niet alleen in de mail.
* Het afsprakenoverzicht laat afspraken met klanten en met potentiële klanten
  door elkaar zien, zodat je één agenda houdt en niets dubbel kunt boeken.
* Wordt iemand klant, dan maak je met één knop de klantomgeving aan. Het
  kennismakingsgesprek blijft staan waar het gebeurde, bij de lead.

## 1.29.2 (22 september 2026)

**De knop "Mail klaarzetten met AI" bij een lead deed het niet.** Er kwam
alleen "de AI kon geen tekst maken", zonder dat er ergens iets te vinden was.
De oorzaak was een te krap ingesteld tokenbudget: het model denkt tegenwoordig
eerst zelf na, dat denken telt mee in dat budget, en bij een eerste leadmail
was het budget al op voor het eerste woord op papier stond. Het budget staat nu
ruim, en als een antwoord toch ooit afgekapt wordt, staat dat voortaan met
zoveel woorden in het logboek in plaats van te verdwijnen.

## 1.29.1 (22 september 2026)

**Leads: "Afspraak gepland" als eigen status.** Staat er een gesprek in de
agenda, dan was dat tot nu toe niet aan de leadlijst te zien: zo iemand stond
gewoon op "In gesprek", tussen alle anderen. Er is nu een aparte status
"Afspraak gepland", in oranje, zodat hij eruit springt. De lead blijft gewoon
meelopen in de opvolging, want een geplande afspraak is geen afgeronde lead.

## 1.28.1 (22 september 2026)

Uit de fotobank kun je nu meerdere foto's tegelijk kiezen om mee te sturen
met één opdracht. Klik "Gebruik in opdracht" bij elke foto die mee moet (de
knop wordt dan "Gaat mee", nog een keer klikken haalt hem er weer af), druk
onderin op Klaar en vertel in de chat wat er met de foto's moet gebeuren:
"zet deze drie in de galerij". Eerst kon er maar één foto per keer mee en
sloot de bank meteen na het kiezen.

## 1.28.0 (22 september 2026)

Drie dingen op de website.

Het uitklapkopje onderaan ("Meer over eenvoudiger websitebeheer") stond op
dezelfde minuscule letter als de links eronder. Nu leesbaar, zodat je ziet dat
je erop kunt klikken.

In het formulier voor een nieuwe website ontbrak de goedkoopste en meest
gekozen route: je huidige ontwerp overzetten vanaf 150 euro. Wie daar belandde
en gaandeweg bedacht dat zijn site eigenlijk prima is, moest iets kiezen dat
duurder was dan hij nodig had. Bij het AI-ontwerp staat er nu ook bij dat 250
euro geldt tot acht pagina's.

En elke landingspagina kan voortaan zijn eigen afbeelding hebben. Die stond
hard ingesteld, waardoor bijvoorbeeld de pagina voor hoveniers een ondernemer
in een atelier liet zien.

## 1.27.1 (22 september 2026)

Zestien pagina's op de website hadden een titel of omschrijving die Google
afkapt, tot 231 tekens aan toe. Die zijn ingekort met dezelfde woorden, zodat
er in de zoekresultaten een hele zin staat in plaats van een halve.

De controle die dit vond staat nu vast in de testen, zodat een nieuwe pagina
er niet meer langs kan.

## 1.27.0 (22 september 2026)

Vijf nieuwe pagina's op de website, per vak: hoveniers, schilders,
installateurs, bouwbedrijven en kapsalons. Daar stond nog niets voor, terwijl
dat precies de bedrijven zijn die WordSwap gebruiken. Wie zoekt op "website
voor hoveniersbedrijf" kwam nergens uit.

Elke pagina gebruikt het voorbeeld uit dat vak: een tuinproject erop met een
appje vanaf de klus, voor-en-na-foto's vanaf de steiger, een prijslijst die in
een minuut klopt. En overal staat wat er níét kan, zodat niemand op iets
rekent dat wij niet bouwen.

## 1.26.0 (22 september 2026)

Komt een bericht van je contactformulier niet als mail bij je aan, dan krijgt
WordSwap daar nu een seintje van. Dat was tot nu toe het stilste dat er mis
kon gaan: de bezoeker ziet "verzonden", het bericht staat netjes in je
portaal, en jij hoort niets. Je mist dan een aanvraag zonder dat je het weet.

De inhoud van het bericht gaat bewust niet mee in dat seintje. Staat jouw site
op "niets bewaren", dan zou dat de belofte breken, en anders kan WordSwap het
gewoon in je portaal bekijken.

Verder is de tekst over welke websites passen preciezer gemaakt. Er stond dat
een webshop of ledenomgeving niet kan, en AI-zoekmachines namen dat over
zonder het verschil dat telt: dat geldt alleen als die ín WordPress draait.
Draait je webshop bij een externe partij, of gebruik je een extern
boekings- of reserveringssysteem, dan kan je site gewoon over.

## 1.25.1 (22 september 2026)

Reparatie: bij je allereerste wijziging kon het voorbeeldvenster kort de
foutpagina van de browser tonen, met "heeft de verbinding geweigerd". Dat leest
als een kapotte site, terwijl er niets aan de hand was: je voorbeeldomgeving
wordt op dat moment aangemaakt en is een halve minuut lang nog niet
bereikbaar.

Het venster wacht nu tot die omgeving antwoordt en laat zolang zien dat hij
wordt klaargezet. Zodra hij er is verschijnt je site vanzelf.

## 1.25.0 (22 september 2026)

In de outreach staan nu twee knoppen op de kaart zelf: **🕓 Later** en
**🚫 Niet mailen**. Dat zat achter "Bewerken / status wijzigen", en dan doe
je het tijdens het langslopen niet.

"Later bekijken" is nieuw, voor een bedrijf dat nu niet interessant genoeg is
maar wel blijft bestaan. Het krijgt een eigen lijst, valt buiten de bulk, en
je kunt het altijd weer op "nieuw" zetten. Dat is iets anders dan niet-mailen,
want dat is definitief en niet te wissen.

## 1.24.2 (22 september 2026)

Heb je een cookiemelding op je site, dan staat die niet meer in de weg in het
voorbeeldvenster naast de chat. Hij verscheen daar telkens opnieuw, precies
over de pagina die je aan het aanpassen was.

Bezoekers van je site krijgen hem gewoon, ongewijzigd. Het verbergen gebeurt
alleen in dat ene venster.

## 1.24.1 (22 september 2026)

Reparatie: het inspreken ging wel aan maar niet meer uit. Het rode knopje
bleef pulseren en reageerde nergens op, vooral op een telefoon.

Er waren drie oorzaken. We vroegen de browser netjes af te ronden in plaats
van direct te stoppen, en op een telefoon gebeurde dat soms niet. Het knopje
ging pas uit als dat afronden gelukt was, dus juist dan nooit. En zodra de AI
aan het werk was, stond de knop helemaal uit.

De microfoon stopt nu ook vanzelf als je je bericht verstuurt of het scherm
verlaat. Daarvoor bleef hij openstaan en tikte je volgende zin zichzelf in
het lege veld.

## 1.24.0 (22 september 2026)

De ingeklapte conceptbalk op de telefoon geldt nu ook voor klanten, niet
alleen in de demo. Het gele blok kostte daar 176 pixels; de balk doet
hetzelfde in 58, en dat scheelt ruim een kwart van je scherm voor de chat.

Alle vier de acties staan in de balk zelf: publiceren, het concept bekijken,
een stap terug met een pijltje, en weggooien met een kruisje. Weet je niet wat
die tekens doen, dan klap je met de drie puntjes uit en staat het voluit.

Weggooien vraagt op de telefoon één keer na. Het is niet terug te draaien en
het kruisje staat vlak naast "stap terug", dus een mistik zou al je werk
kosten. Op een computer verandert er niets.

## 1.23.1 (22 september 2026)

Reparatie op de telefoon: in de chat kon je soms niet meer bij de bovenkant
van het gesprek, schoof het scherm opzij als je erover veegde, en tekende de
telefoon teksten over elkaar heen.

Dat kwam door een opmaakcombinatie die de browser laat denken dat er niets te
scrollen valt, terwijl de bovenkant van het gesprek buiten beeld hangt. In een
proef stond het bovenste blok 150 pixels boven de rand en was het niet te
bereiken. Het gesprek plakt nog steeds aan de onderkant, maar nu zonder die
klem, en er zit een rem op het opzij schuiven.

Op een computer verandert er niets.

## 1.23.0 (22 september 2026)

Het gele conceptblok nam op een telefoon te veel van het scherm in beslag,
precies waar de chat hoort te staan. In de demo klapt het nu in tot één
regel: "Concept, niet live" met Bekijk en Publiceer ernaast, en stap terug en
concept weggooien achter een knopje. Gemeten op een telefoon van 390 breed
gaat het van 176 naar 48 pixels.

De voorbeeldknoppen verdwijnen zolang er een opdracht loopt of een concept
open staat, anders was die gewonnen ruimte er meteen weer af.

Voor klanten verandert er niets; die houden het vertrouwde blok, ook op hun
telefoon.

## 1.22.0 (22 september 2026)

De probeer-demo is uitgekleed, zonder dat er iets verandert voor klanten.

Publiceren blijft een echt moment: je ziet "concept, nog niet live", je klikt
Publiceer, en het venster slaat om naar "gelijk aan de live site". Wat
verdwenen is, is de tweede website die daarvoor per bezoeker werd uitgerold.
Die was onzichtbaar, kostte wachttijd en kon mislukken, terwijl de bezoeker
zijn wijziging al in het voorbeeld zag staan. Zijn eigen omgeving is nu ook
zijn site, en daarom is de knop "Open live site" in de demo weg: er is niets
anders meer om te openen.

Verder uit de demo: de SEO-knop, en de AI maakt er geen nieuwe pagina's meer
aan en laat het menu met rust. Dat raakt elke pagina tegelijk en duurt
minuten, en dat is precies waar iemand afhaakt die voor het eerst kijkt.

## 1.21.5 (21 september 2026)

Correctie op 1.21.3: de reden dat een "geen interesse" niet herkend werd, was
niet dat een HTML-mail geen tekst opleverde. Die tekst wordt gewoon gelezen.
Het zat in drie andere plekken, gevonden door zes echte mailvormen door het
echte pad te halen:

- Wie zijn antwoord tússen onze aangehaalde tekst typt (oudere Outlook, veel
  telefoons) had alleen regels met ">" ervoor, en die werden allemaal
  weggegooid. Dit was het geval van Harry.
- Wie ónder een Outlook-"Van:"-blok antwoordt, verloor alles na dat blok. De
  streepjeslijn erboven telde als het antwoord.
- Het onderwerp werd vóór de tekst geplakt en telde daardoor óók als het
  antwoord, met hetzelfde gevolg.

Elke reparatie heeft een test die aantoonbaar faalt als je hem weghaalt.

## 1.21.4 (21 september 2026)

Geen zichtbare verandering. De herkenning van een afwijzing wordt nu getest
met een echte mail die alleen uit HTML bestaat, door hetzelfde pad als de
mailbox-lezer, met onze eigen mail als aanhaling eronder. De vorige test
voerde losse zinnen aan en was groen terwijl het in het echt misging.

## 1.21.3 (21 september 2026)

Drie reparaties rond een reactie op de outreach, gevonden doordat iemand
"geen interesse" terugschreef en toch als warme lead in de lijst kwam.

De tekst van een antwoord dat alleen uit HTML bestaat werd niet gelezen, dus
viel de hele reactie weg. Een beleefd nee ("geen interesse", "geen behoefte",
"nee bedankt") telt nu als: geen mail meer, en geen lead. En een lead
verwijderen maakt eerst de koppeling met de outreach los, want anders
weigerde de database met een kale foutmelding.

## 1.21.2 (21 september 2026)

De beheerder valt buiten de daggrens van tien berichten in de demo, zodat hij
hem kan testen zonder zichzelf buiten te sluiten. Voor bezoekers verandert er
niets.

## 1.21.1 (21 september 2026)

Reparatie: een opdracht die halverwege omviel kon het werkslot van een site
eindeloos bezet houden. De klus zelf was dood, maar het signaal "ik ben nog
bezig" bleef doorlopen, en elke volgende opdracht wachtte daar netjes op.
Een nieuw gesprek beginnen hielp niet, want het slot hoort bij de persoon,
niet bij het gesprek.

Een slot vervalt nu na twintig minuten hoe dan ook, ruim boven wat een echte
opdracht ooit nodig heeft. En de uurlijkse demo-reset ruimt de sloten van de
demo mee op, zodat elke bezoeker schoon begint.

## 1.21.0 (21 september 2026)

De demo wordt elk uur teruggezet. Zat er op dat moment iemand midden in een
opdracht, dan bleef bij hem "De AI is bezig" eeuwig staan: zijn opdracht werkte
door aan iets dat niet meer bestond en er kwam nooit een antwoord. Nu stopt zo
een opdracht zichzelf en staat er gewoon wat er gebeurd is, met de uitnodiging
hem opnieuw te sturen.

Na "concept klaar" liep in de demo soms nog anderhalve minuut een extra
controleronde, voor dingen die een bezoeker niet ziet zoals een ontbrekende
alt-tekst. Die slaan we in de demo over. Bij een klantsite blijft hij staan.

En de bestedingsruimte per demo-bezoeker is meegegroeid met het grotere model,
zodat een opdracht niet halverwege wordt afgekapt.

## 1.20.0 (21 september 2026)

De probeer-demo draait nu op hetzelfde AI-model als een echte klantsite.
Daarvoor stond er het snelle, goedkope model onder, en dat liet het product
slechter zien dan het is: op een klus van een paar bestanden ging het zoeken
en kostte het negentien stappen.

De vier voorbeelden onder de chat zijn ook lichter gemaakt. Ze raken alle vier
maar één bestand, zodat je binnen enkele seconden ziet gebeuren wat je vroeg.

## 1.19.0 (21 september 2026)

In de probeer-demo staan nu vier voorbeelden klaar onder de chat: de
openingstijden aanpassen, een nieuwe pagina laten maken, een balk bovenaan
zetten en de kleur van de knoppen veranderen. Eén klik en de opdracht gaat
meteen weg, dus je ziet binnen tien seconden je eigen wijziging op de site
staan zonder dat je iets hoeft te bedenken.

Het lege invoerveld was wat de demo tegenhield: wie niet weet wat hij moet
typen, tikt iets halfslachtigs en gaat weg met de indruk dat het tegenvalt.
Het welkomscherm zet daarom ook geen tekst meer klaar in de balk.

Dit geldt alleen voor de demo. In het klantportaal verandert er niets.

## 1.18.0 (21 september 2026)

De ingebouwde outreachmails zijn herschreven. Die zijn het vangnet: er staan
geen eigen sjablonen in het systeem en de scan schrijft alleen de eerste mail,
dus mail 2 en 3 kwamen hier altijd vandaan.

Eruit: de belofte dat iemand de kopie van zijn site eerst gratis te zien
krijgt. Ook eruit: de prijzen in mail 2 en 3, want die botsten met de prijs die
per site in mail 1 staat. Mail 1 noemt het bedrag nog wel.

De mails zijn korter, eindigen met een vraag in plaats van een oproep, en de
onderwerpen zijn drie verschillende vragen in kleine letters. En alle lange
streepjes zijn eruit, ook die in de demo-knop onder elke mail.

## 1.17.0 (21 september 2026)

De scan kan een verbeterde mail nu gewoon opnieuw insturen. Staat dat bedrijf
nog op "nieuw", dan vervangt de nieuwe versie de klaarstaande mail. Daarvoor
moest een bedrijf eerst verwijderd worden om er nog iets aan te kunnen
veranderen, en dan raakte je kwijt wie al gemaild was en wanneer.

Wie al post kreeg, wie gereageerd heeft, wie op de niet-mailen-lijst staat en
wie buiten de bulk gezet is, wordt niet aangeraakt.

## 1.16.1 (21 september 2026)

Het nieuwe blok voor het bewaren van formulierberichten staat nu ook in het
snelmenu bovenaan de klantpagina, zodat je er niet meer naartoe hoeft te
scrollen.

## 1.16.0 (21 september 2026)

Per website is nu te kiezen hoeveel wij bewaren van de berichten die via de
formulieren binnenkomen. Dat is er voor praktijken die gegevens van hun eigen
klanten ontvangen, zoals een fysiopraktijk, een advocatenkantoor of een
boekhouder: die moeten kunnen uitleggen waar die gegevens staan en wie erbij
kan. Het staat voor iedere klant open.

Drie standen. Normaal, zoals het was. WordSwap kan niet meelezen: de berichten
worden bewaard en de klant ziet ze gewoon, maar wij niet. Of niets bewaren:
het bericht gaat alleen per mail naar de klant en wordt nergens opgeslagen,
bijlagen ook niet.

Bij die laatste stand is er geen vangnet meer. Komt de mail niet aan, dan is
het bericht weg, en daarom ziet de bezoeker dat dan meteen op zijn scherm in
plaats van te wachten op een antwoord dat nooit komt.

## 1.15.2 (21 september 2026)

Mediationbureaus horen niet bij de beroepsgroepen die we overslaan. Een
mediationbureau is geen advocatenkantoor en die benaderen we gewoon. Een
kantoor dat allebei doet valt nog steeds af op het advocatendeel.

## 1.15.1 (21 september 2026)

Reparatie: de Verbeter-knop bij een outreachmail leek willekeurig te haperen.
Dat deed hij niet. Deze route was de enige met een AI erachter zonder
tijdslimiet, en werd door het platform afgekapt zodra het herschrijven wat
langer duurde. Een korte aanwijzing werkte daardoor wel en een uitgebreide
niet. Hij krijgt nu de tijd, en gaat er toch iets mis, dan staat er op het
scherm wat er mis ging in plaats van "probeer het nog eens".

## 1.15.0 (21 september 2026)

Advocaten, notarissen, accountants en zorgpraktijken gaan niet meer mee in de
koude bulk. Niet omdat het niet mag, maar omdat deze kantoren een
geheimhoudingsplicht hebben en moeten kunnen uitleggen waar gegevens van hun
klanten staan. Dat gesprek voer je aan de telefoon, niet per koude mail.

Ze worden niet weggegooid: ze staan apart onder "Buiten de bulk", met de reden
erbij. Wil je er toch iets mee, dan zet je zo'n bedrijf zelf terug op "nieuw".
Dat is bewust een handeling. De twaalf die al in de lijst stonden zijn meteen
verplaatst; er was er nog geen enkele gemaild.

## 1.14.0 (21 september 2026)

Wie op een outreachmail antwoordt met "graag verwijderen" of "niet meer
mailen" wordt niet langer als warme lead opgepakt, maar gaat rechtstreeks naar
de niet-mailen-lijst. Er staat bij in het dagverslag wie dat was. De knop
onderaan de mail werkte al; dit vangt iedereen die liever gewoon terugschrijft.

De AI achter de Verbeter-knop kent nu de echte prijzen, wat het product kan en
wat we nooit beloven. Daarvoor kende hij één zin over WordSwap en verzon hij
de rest.

Er liepen drie prijsverhalen door elkaar: 150 euro in de code, 250 euro in de
klaarstaande mails en "no cure no pay" in de AI-instructie. Het is overal 150
euro eenmalig en vanaf 19 euro per maand geworden, ook in de 61 mails die al
klaarstonden.

## 1.13.2 (21 september 2026)

Reparatie: op de outreachkaart stonden de gegevens en de knoppen in dezelfde
regel. Bij een lang mailadres werd de tekstkolom samengeduwd en viel het adres
letter voor letter uit elkaar. De knoppen staan nu op hun eigen regel.

## 1.13.1 (21 september 2026)

Onder een koude mail staat voortaan alleen de voornaam. Een volledige naam
onder een bericht aan iemand die je nog niet kent leest als een brief van een
instantie. Klantpost en leadpost houden de volledige naam.

De mails die de scan aanleverde ondertekenden zichzelf ook nog een keer, dus
stond de afzender er drie keer onder. Die dubbele afsluiting wordt nu
weggeknipt, ook bij de mails die al klaarstonden.

## 1.13.0 (21 september 2026)

De mail die naar een prospect gaat staat nu met één klik open: lezen,
aanpassen en versturen gebeurt in hetzelfde vak. Wat op het scherm staat is
precies wat verstuurd wordt, want bij versturen wordt die tekst eerst
bewaard. Daarmee kan een bewerking die je vergat op te slaan niet meer
stilletjes verloren gaan.

Op elke kaart staat ook een knop om de website van het bedrijf te openen, om
er zelf even naar te kijken voor je iets verstuurt.

## 1.12.1 (21 september 2026)

Op de outreachkaart staan nu ook het telefoonnummer, de contactpersoon, de
plaats en de inschatting die de scan meestuurt. Het nummer is aanklikbaar, en
bij een bedrijf zonder mailadres staat er dat het om bellen gaat.

Wat de scan maar één keer gezien heeft staat er apart bij, duidelijk
gescheiden van de bevinding waar een mail op gebaseerd mag worden.

## 1.12.0 (21 september 2026)

**Geen bevestigde bevinding, geen mail.** De scan die bedrijven met een
verwaarloosde website opspoort geeft per bevinding aan hoe zeker hij is: twee
keer hetzelfde gezien, één keer gezien, of achtergrondinformatie.

Alleen wat twee keer bevestigd is mag de reden van een mail zijn. De rest komt
wel op het kaartje te staan, maar blijft uit de mail. Is er niets bevestigd,
dan komt het bedrijf op "bellen" te staan in plaats van in de mailstroom, en
wordt er ook geen mail klaargezet.

Reden: je schrijft iemand aan over zijn eigen website. Zit je ernaast, dan maak
je dat niet meer goed.

## 1.11.0 (21 september 2026)

**Koude outreach gaat voortaan vanaf een eigen afzender.** Post aan mensen die
ons nog niet kennen wordt nu eenmaal vaker als ongewenst weggeklikt, en dat
telt mee in de reputatie van het adres waar hij vandaan komt. Tot nu toe
deelde die post zijn afzender met alle klantmail: afspraakbevestigingen,
uitnodigingen voor het portaal, facturen.

Dat is nu gescheiden. Klantpost blijft gaan zoals hij ging; koude post krijgt
zijn eigen adres. Antwoorden komen nog steeds gewoon in dezelfde postbus
binnen, dus aan de gesprekken verandert niets.

## 1.10.1 (21 september 2026)

De scan levert ook een contactpersoon, een inschatting warm of koud, en een
kant-en-klare mailtekst mee. Die komen nu allemaal binnen, zodat de mail al
klaarstaat om te lezen, bij te schaven en te versturen.

De ingang accepteert de veldnamen die de scan zelf al gebruikt, zodat daar
niets omgebouwd hoeft te worden.

## 1.10.0 (21 september 2026)

**De websitescan levert nu rechtstreeks aan in de outreach.** De scan die
bedrijven met een verwaarloosde website opspoort draait buiten WordSwap. Die
kan zijn vondsten nu zelf aanleveren, in plaats van dat er elke dag een
bestand heen en weer moet.

Ze komen binnen bij de outreach en niet bij de leads. Dat onderscheid is de
kern: outreach is koud en massaal, een lead is iemand die gereageerd heeft.
Mailt zo'n bedrijf terug, dan wordt het vanzelf een lead, met die eerste
reactie meteen in de tijdlijn.

Bedrijven zonder mailadres komen apart te staan met de aantekening dat ze
gebeld moeten worden.

**Dubbel benaderen kan niet meer.** Bij elk nieuw bedrijf wordt over de
outreach én de leads heen gekeken, op website, e-mailadres en telefoonnummer
tegelijk. Verschillende schrijfwijzen van hetzelfde nummer of domein worden
als hetzelfde herkend.

## 1.9.0 (21 september 2026)

**Het ontwerp van een oude site wordt nu echt opgemeten.** Bij het overzetten
werd al een lijst gemaakt met de precieze lettertypen, kleuren, maten en
secties van de oude site, zodat de nieuwe site er hetzelfde uitziet. Alleen
werd die lijst door een fout nooit opgeslagen, en dan moet de bouwer het doen
op het oog.

Dat is rechtgezet. Er komt nu ook bij te staan hoe de beweging op de oude site
liep: welk onderdeel wanneer in beeld komt, hoe lang dat duurt en vanaf welke
kant. Daarmee kan een bewegende kop precies zo worden nagebouwd in plaats van
stilgezet.

## 1.8.0 (21 september 2026)

**Bewegende koppen blijven voortaan bewegen.** Had je oude site een schuivende
hero met een paar boodschappen, dan werd dat bij het overzetten een stilstaand
plaatje. Er ging geen tekst verloren op de pagina, maar de site voelde dood,
en de boodschappen van de tweede en derde slide verdwenen stilletjes.

Nu wordt die beweging nagebouwd: kop, ondertitel en knoppen verschijnen na
elkaar, net als eerst. Zijn er meerdere beelden, dan wisselen die rustig af.
En de tekst van elke slide blijft staan, desnoods als blok eronder.

Bezoekers die beweging liever niet hebben krijgen automatisch een stille
versie.

## 1.7.1 (21 september 2026)

Twee controles sloegen vals alarm. Een site die zijn links relatief schrijft
kreeg de melding dat élke pagina onbereikbaar was, terwijl het menu gewoon
werkte. En een bedrijfsblok telde alleen mee als de soort in onze lijst stond,
waardoor een bakkerij met keurige gegevens toch een melding kreeg. Nu telt het
adres, niet de naam van de soort.

## 1.7.0 (21 september 2026)

Het zoekvak kan nu ook als zichtbaar invoerveld, in plaats van als vergrootglas
dat je eerst moet aanklikken. Handig voor een bovenbalk naast een
telefoonnummer of inloglink, zoals veel sites het hadden staan. Beide smaken
gebruiken dezelfde zoeklijst en werken hetzelfde.

## 1.6.3 (21 september 2026)

De zoekresultaten bleven onzichtbaar op sites met uitklapmenu's. Zulke sites
verbergen de lijstjes in hun menu, want dat zijn hun submenu's, en onze
resultatenlijst is ook zo'n lijstje. De treffers werden dus wel gevonden maar
niet getoond.

De zoekfunctie houdt nu zelf de regie over wat zichtbaar is, zonder aan de
opmaak van de site te komen.

## 1.6.2 (21 september 2026)

In het zoekvak gebeurde niets als je op enter drukte. Nu opent enter het
bovenste resultaat, zoals je verwacht.

En het zoekvak is nooit meer stil. Terwijl de resultaten worden opgehaald
staat er "Even zoeken...", en lukt dat niet, dan zie je dat ook. Eerst kon je
naar een leeg vak kijken zonder te weten of het aan het zoeken was of stuk.

## 1.6.1 (21 september 2026)

De zoekfunctie zocht ook in het menu en de kopbalk. Op een site waar die niet
in een apart inhoudsblok staan, stond de hele kopregel in elke pagina: zoeken
op een woord uit het menu gaf dan alle pagina's als resultaat, en elk
resultaat begon met "Inloggen" en het telefoonnummer in plaats van met de
inhoud.

De zoeklijst herkent de omlijsting nu vanzelf: tekst die op vrijwel elke
pagina staat hoort bij het sjabloon en niet bij de pagina. Bij de eerste site
waar dit speelde ging de zoeklijst van 288 kB naar 47 kB en zakte het aantal
resultaten op een menu-woord van alle 33 naar 1.

## 1.6.0 (21 september 2026)

**Een nieuw ontwerp kan niet meer ongemerkt iets laten vallen.** Bij een
herontwerp wordt het menu vaak opnieuw opgebouwd, en dan kan er een onderdeel
uit vallen: het zoekvak, een agenda, een taalknop. Dat leverde geen
foutmelding op, want de nieuwe site is op zichzelf gewoon in orde. Er is
alleen iets minder, en dat merk je pas veel later.

Voordat een ontwerp naar de werkversie gaat, wordt het nu naast de live site
gelegd. Valt er iets weg, dan zie je precies wat, wat je eraan kunt doen, en
de knop vraagt eerst of het zo klopt. Het blokkeert niet: soms wil je juist
versimpelen. Maar dan is het een keuze.

## 1.5.5 (21 september 2026)

De instellingen van je eigen mailserver liggen niet meer open en bloot in je
portaal. Je ziet nog wel of alles werkt, maar om iets te wijzigen klik je
eerst op "Ja, ik wijzig mijn mailserver zelf". Daar staat bij wat er kan
misgaan en dat je ons altijd even kunt vragen.

Reden: vul je hier iets verkeerds in, dan merk je dat niet. Je mail blijft
gewoon aankomen, alleen niet meer vanaf je eigen adres.

## 1.5.4 (21 september 2026)

Op de klantpagina in de admin sprong het gesprek bij elke herlading over het
scherm heen. Dat gebeurt daar niet meer: je komt op die pagina meestal voor
iets anders, en groot maken kan nog steeds met de knop. In het klantportaal
blijft het wel zo, want daar kom je juist om aan je website te werken.

## 1.5.3 (21 september 2026)

Sites met een automatische nieuwsfeed konden hetzelfde bericht twee keer op de
site krijgen. Publiceert de bron een bericht opnieuw met een iets ander adres,
bijvoorbeeld een correctie een minuut later, dan zag ons systeem dat als een
nieuw artikel. Er kwamen dan twee pagina's met dezelfde titel, en Google koos
er zelf één.

Voortaan geldt: dezelfde kop op dezelfde dag is hetzelfde bericht. Een
terugkerende kop als "Nieuwsbrief december" mag een jaar later gewoon weer.

## 1.5.2 (21 september 2026)

Nog twee dingen rond diezelfde apostrof. Een omschrijving die ermee begint,
zoals "'s Ochtends open", werd gezien als helemaal ontbrekend. Dat was een
harde fout die een oplevering tegenhield terwijl er niets aan de hand was.

En de controle op dubbele teksten kijkt nu ook naar de tekst die WhatsApp en
LinkedIn onder het deelplaatje tonen. Die raakt los van de gewone omschrijving
zodra iemand er één bijwerkt en de ander vergeet, en dan staat er op elke
gedeelde link hetzelfde.

## 1.5.1 (21 september 2026)

De controle op dubbele teksten sloeg vals alarm bij Nederlandse teksten met
een apostrof, zoals "pagina's" of "foto's". De omschrijving werd bij dat
streepje afgekapt, waardoor pagina's op hun eerste woorden werden vergeleken
en ten onrechte als dubbel werden gemeld.

Tegelijk is de controle scherper geworden: hij meldt nu ook teksten die pas
verschillen ná het stuk dat Google laat zien. Die zien er in de
zoekresultaten alsnog identiek uit.

## 1.5.0 (21 september 2026)

**Je kunt nu zelf instellen dat de mail van je website vanaf je eigen adres
komt.** Dat kon al, maar alleen als wij het voor je invulden. Wijzig je het
wachtwoord van je mailbox, dan kun je dat nu zelf bijwerken in je portaal
zonder op ons te wachten.

Met een knop Uitproberen ernaast, die een echt testbericht naar je toe stuurt.
Dat is geen extraatje: zonder testen vul je iets verkeerds in, zie je niets
gebeuren, en gaan je berichten maandenlang via ons in plaats van via jou.

Werkt je mailserver even niet, dan zie je dat in je portaal staan, met de
vermoedelijke oorzaak erbij. Je bezoekers merken er niets van, want hun
berichten komen gewoon aan.

Je wachtwoord wordt versleuteld opgeslagen en nooit teruggetoond.

## 1.4.0 (21 september 2026)

**Een kapotte mailserver blijft niet langer onopgemerkt.** Klanten kunnen de
mail van hun website via hun eigen mailbox laten lopen, zodat berichten echt
van hun eigen adres komen. Ging daar iets mis, dan kwam de mail nog steeds
aan, maar via ons adres in plaats van dat van de klant. Er ging niets kapot,
dus niemand merkte het.

Nu wordt zo'n storing vastgelegd, komt er een melding binnen, en staat het in
het klantoverzicht met de vermoedelijke oorzaak erbij: wachtwoord gewijzigd,
servernaam onbekend, verkeerde poort, certificaat of een volle mailbox. Gaat
het daarna weer goed, dan verdwijnt de melding vanzelf.

**Plus een knop om het te testen.** Die logt echt in op de mailserver, en met
een adres erbij stuurt hij ook een echt testbericht. Inloggen lukt namelijk
soms wel terwijl versturen alsnog geweigerd wordt.

## 1.3.0 (21 september 2026)

**Zes controles erbij die de vindbaarheid bewaken.** De poort keek al of elke
pagina een titel, een omschrijving en werkende links had. Daar komt nu bij:

- **Bedrijfsgegevens.** Staat er een telefoonnummer of adres op de site, dan
  hoort er ook een bedrijfsblok in de code te staan met diezelfde gegevens.
  Dat is wat Google gebruikt voor lokale resultaten, en wat je kaartje met
  foto, adres en belknop in de zoekresultaten voedt.
- **Pagina's die per ongeluk op niet-indexeren staan.** De stilste fout die er
  is: de pagina werkt gewoon, er komt geen foutmelding, en hij verdwijnt
  binnen weken uit Google. Stond hij eerder wel in de zoekresultaten, dan is
  dit nu een harde fout.
- **Eén hoofdkop per pagina.** Zonder hoofdkop weet Google niet waar de pagina
  over gaat, met vijf ook niet.
- **Dubbele titels en omschrijvingen.** Staat dezelfde titel op meerdere
  pagina's, dan kiest Google er zelf één en negeert de rest.
- **Pagina's waar niets naartoe linkt.** Die vindt Google wel via de sitemap,
  maar ze tellen nauwelijks mee.
- **Paginagewicht.** Hoeveel een bezoeker moet binnenhalen voor één pagina,
  met een schatting van wat dat op een telefoon betekent.

Op één na zijn het allemaal waarschuwingen: een werklijstje, geen blokkade.

## 1.2.1 (20 september 2026)

De controle op kwijtgeraakte onderdelen keek alleen naar WordPress-kenmerken.
Daardoor zag hij niets zodra de vorige versie een site van onszelf was, en dat
is precies het geval bij een nieuw ontwerp dat een blok laat vallen. Hij
herkent nu ook onze eigen bouwstenen, dus een ontwerp dat het zoekvak uit het
menu haalt wordt voortaan gemeld.

## 1.2.0 (20 september 2026)

**De opleveringspoort merkt nu wanneer er iets is kwijtgeraakt.** Tot nu toe
controleerde hij of de nieuwe site in zichzelf klopte: werkende links, een
favicon, niet te zware foto's, goed op een telefoon. Maar bijna niets
vergeleek hem met de site zoals die was. Daardoor kon een onderdeel stil
wegvallen zonder dat er ergens een foutmelding ontstond. Er was gewoon iets
minder.

Zo verloor een site zijn zoekfunctie bij het overzetten. De oude site had er
tientallen verwijzingen naar, de nieuwe geen enkele, en dat viel pas weken
later op.

De poort legt nu de oude site naast de nieuwe en waarschuwt bij een
zoekfunctie, taalknop, nieuwsbriefaanmelding, agenda, webshop, ledeninlog of
reacties die wel bestonden en nu nergens meer staan. Het is een waarschuwing
en geen blokkade: soms wil een klant iets juist niet meer, en dat mag.

## 1.1.0 (20 september 2026)

**Zoeken op je eigen website.** Had je oude site een vergrootglas in het menu,
dan werkt dat nu ook op je nieuwe site. Je bezoeker typt een woord en krijgt
meteen de pagina's waar dat woord op staat.

Het belangrijkste zit vanbinnen: de zoeklijst wordt opnieuw gemaakt op het
moment dat je publiceert. Pas je via de chat een tekst aan, voeg je een pagina
toe of haal je er een weg, dan klopt het zoekresultaat meteen. Je hoeft er
niets voor te doen en er kan niets achterlopen.

Verder:

* Pagina's die je bewust buiten Google houdt, zoals de bedanktpagina na een
  formulier, blijven ook uit de zoekresultaten.
* De zoeklijst wordt pas opgehaald als een bezoeker echt op het vergrootglas
  klikt, en blijft klein genoeg voor een telefoon, ook bij een groot archief.
* Lukt het maken van de zoeklijst een keer niet, dan gaat publiceren gewoon
  door en blijft de vorige lijst staan. Je raakt je wijziging dus nooit kwijt.

## 1.0.1 (20 september 2026)

Kleine verbeteringen in het portaal, uit de testdag met de banken:

- Een bericht van WordSwap (zo'n aankondiging bovenin) komt nu één keer duidelijk
  in beeld over de hele pagina, met een knop om hem te sluiten. Eerder stond hij
  op een plek die je bijna nooit zag.
- Eén keer wegklikken is genoeg: dat onthouden we voortaan bij je account. Log je
  later op je telefoon in, dan hoef je niet alles opnieuw weg te klikken.
- De chat opent elke vraag weer gewoon met "Momentje..." in plaats van een
  mededeling over het openstaande concept die niets met je vraag te maken had.

## 1.0.0 (20 september 2026)

De eerste echte versie. Aanleiding: Roelie (RoelArt) staat live, heeft betaald
en haar incasso loopt. Vanaf hier is WordSwap geen project meer maar een dienst
met een klant erop.

Vier weken bouwen, van niets tot dit.

**Een WordPress-site overzetten.** Rechtstreeks vanaf de live site, een export
is niet nodig. Alle pagina's, berichten, foto's, documenten, audio en video
gaan mee. Foto's worden automatisch naar webformaat omgezet zodat de site snel
blijft, en pagina's met veel beeld krijgen vanzelf een nette fotogalerij. De
site komt te draaien op Cloudflare en is daarmee een stuk sneller dan daarvoor.
Vindbaarheid blijft gelijk of wordt beter: de oude adressen blijven werken.

**De website aanpassen door het te typen.** De klant logt in op zijn eigen
portaal, typt wat er anders moet, en de website gaat er zelf mee aan de slag.
Hij krijgt een concept te zien en keurt dat goed voordat het live staat. Wijzen
op de pagina kan ook: klik iets aan en zeg wat eraan moet veranderen.

**Een vangnet tegen halve wijzigingen.** Staat dezelfde tekst of foto op meer
plekken, dan meldt het systeem dat en vraagt of de rest mee moet. Dat gebeurt
mechanisch, niet op gevoel van de AI.

**Foto's, video's, audio en documenten** hebben elk een eigen bank in het
portaal: terugzien wat er op de site staat, opnieuw plaatsen of opruimen.
Uploaden gaat via de paperclip in de chat.

**Formulieren** op de site komen binnen in het portaal en per mail, met een
bevestigingsmail aan de invuller die per formulier in te stellen is. Er zit een
spamrem op zonder dat de bezoeker een puzzel hoeft op te lossen.

**Afspraken maken** vanuit de site, met uitnodiging, bevestiging, afzegging en
agendabestand, allemaal met eigen tekst.

**Je website appen (bèta).** Een klus doorgeven via WhatsApp, met foto's,
spraak of een pdf erbij.

**Een nieuw ontwerp naast de bestaande site.** De klant kan het bekijken voordat
er iets verandert, op een adres dat alleen hij kent.

**Onder de motorkap:** een opleveringspoort die elke site controleert voordat
hij live mag, een fair-use-teller per klant, een AI-budget per site, automatisch
incasseren via Mollie, en een leadadministratie die bijhoudt wie wanneer
gemaild is.

**Wat er nog niet is** en waar we eerlijk over zijn: reacties onder
blogberichten, een nieuwsbrief naar je lezers, en zoeken in je eigen archief.
Die staan op de planning.
