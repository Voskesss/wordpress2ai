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
