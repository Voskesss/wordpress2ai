# Wat er verandert aan WordSwap

Dit is de lijst in gewone taal: wat een klant zou snappen, niet wat een
programmeur leest. De technische historie staat in git, dit bestand is de
menselijke samenvatting. Het is ook de bron voor serviceberichten aan klanten.

**Een nieuwe versie uitbrengen:** het nummer bijwerken in `lib/versie.ts` en in
`package.json`, hieronder een blok erbij, en daarna een label op de commit die
live ging:

```bash
git tag -a v1.0.1 -m "Korte omschrijving" && git push origin v1.0.1
```

Elke klantsite krijgt bij het overzetten een `wordswap.json` mee met de versie
waarmee hij gebouwd is. Doet een site later iets raars, dan zie je daar met
welke stand van de bouwmotor hij gemaakt is.

Nummers: het eerste cijfer gaat omhoog bij iets waar een klant zijn manier van
werken voor moet aanpassen, het tweede bij nieuwe mogelijkheden, het derde bij
reparaties.

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
