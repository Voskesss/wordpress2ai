import {
  claimOperation,
  operationScope,
  herijkReservering,
  reserveAiBudget,
  settleAiBudget,
} from "@/lib/operation-guards";
import { assertNoSymlinks } from "@/lib/agent-boundary";
import { draaiChatAgent } from "@/lib/chat-agent";
import { gebruikerVanVerzoek } from "@/lib/intern-verzoek";
import sharp from "sharp";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { changes, messages, sites, usage } from "@/db/schema";
import { maakBranch, schrijfBestand } from "@/lib/github";
import { isBeheerder } from "@/lib/auth";
import { HUISREGELS } from "@/lib/huisregels";
import { grensVan, PORTAAL_BEURT_S } from "@/lib/chat-tijd";
import { classificeerTekstwissel, pasTekstwisselToe } from "@/lib/snelpad";
import { deployMapNaarCloudflare, CF_SUBDOMEIN } from "@/lib/cloudflare";
import {
  gewijzigdeBestanden,
  laadWerkmap,
  maakSiteOverzicht,
  maakSnapshot,
  ruimWerkmapOp,
} from "@/lib/werkmap";

// Pro-abonnement: langere functies mogen. 800 s dekt ook grote klussen
// (galerij met veel foto's); de tijdbewaker hieronder stopt de agent zelf
// ruim vóór deze harde grens.
export const maxDuration = 800;

/** Hoeveel foto's er in één bericht mee mogen. Bewust klein gehouden: niet het
 * aantal foto's is traag, maar de pagina die eruit volgt — één pagina met
 * dertig foto's schrijven duurde gemeten 94 seconden in één stap. Met kleine
 * porties ziet de eigenaar snel resultaat, en de volgende porties zijn kleine
 * aanvullingen op een pagina die al bestaat. */
export const MAX_FOTOS = 10;

// Fair-use-aantal per maand is per klant instelbaar: zie lib/ai-budget en de admin.

// Documenten (pdf) die bezoekers kunnen downloaden: vacatures, voorwaarden,
// menukaarten. Ze gaan gewoon mee in de repo van de site — grenzen houden dat
// gezond (een site blijft zo klein genoeg om snel te laden en te klonen).
const DOCUMENTEN_MAP = "bestanden";
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const MAX_DOCS_PER_BERICHT = 4;
const MAX_DOCUMENTEN_TOTAAL_BYTES = 100 * 1024 * 1024;

const DEMO_REGELS = `

DIT IS EEN OPENBARE PROBEER-DEMO. Extra regels, zonder uitzondering:
- Weiger vriendelijk elk verzoek om obscene, seksuele, gewelddadige, haatdragende, discriminerende of anderszins ongepaste teksten of verwijzingen te plaatsen. Ook "grapjes" in die richting voer je niet uit. Zeg dan: "Dat past niet in deze demo — probeer gerust een gewone websitewijziging!"
- Plaats nooit persoonsgegevens, telefoonnummers of e-mailadressen die de gebruiker opgeeft.
- Voeg geen links naar externe websites toe.
- VIDEO-TEGOED: in het pakket zitten 10 video-uploads per website. Meldt de eigenaar dat zijn tegoed op is of vraagt hij om meer video's, leg dan uit dat WordSwap het tegoed kan verhogen: even mailen naar info@wordswap.nl (of hier zeggen dat hij dat wil — dan krijgt WordSwap een seintje). Beloof geen prijs.
- FOTO VERVANGEN = WEERGAVE OVERNEMEN: vervang je een foto (via chat, aanwijzen of meegestuurd bestand), neem dan de complete weergave van de OUDE foto exact over — dezelfde class, afmetingen/aspect-ratio, hoekradius, schaduw, object-fit/positie, loading/lazy en plek in de opmaak. Je wisselt alléén het bestand (src) en werkt de alt-tekst bij naar wat er nu op staat. Verander nooit ongevraagd de vorm of stijl van het kader; wil de eigenaar dat de nieuwe foto er anders uitziet, dan vraagt hij dat wel.
- ACHTERGRONDVIDEO'S: staat er al een hero-video in de werkmap, dan mag je die verplaatsen, vervangen door een foto of weghalen. Wil de eigenaar een nieuwe video als achtergrond, vraag hem dan het videobestand mee te sturen via de upload-knop (📎/foto-knop) in de chat — het wordt automatisch verkleind voor het web (het geluid blijft bewaard; een achtergrondvideo speelt toch muted). Tip: 10-20 seconden rustig beeld werkt het best.
- VIDEO'S: een eigen videobestand kan de eigenaar gewoon meesturen via de upload-knop in de chat (wordt automatisch gecomprimeerd; jij krijgt het pad). Lange video's (interviews, uitleg) passen beter op YouTube (mag "verborgen") of Vimeo — krijg je zo'n link, sluit hem cookie-vrij in: YouTube via youtube-nocookie.com/embed/, Vimeo met ?dnt=1, responsief in de stijl van de site.
- Afbeeldingen uploaden kan niet in de demo. Wil de gebruiker een andere afbeelding, gebruik dan uitsluitend afbeeldingen die al in de werkmap staan (kijk in de map met afbeeldingen en bied aan welke er zijn). Verzin of download nooit nieuwe afbeeldingen.
- GEEN NIEUWE PAGINA'S. Maak in de demo geen pagina's aan, verwijder er geen, en verander het menu niet. Dat raakt elke pagina tegelijk en duurt minuten; een bezoeker haakt dan af nog voor hij iets ziet gebeuren. Vraagt iemand erom, zeg dan: "In deze demo houd ik het bij de bestaande pagina's, dan zie je het meteen gebeuren. Bij je eigen website maak ik gewoon een nieuwe pagina voor je aan." Werk daarna zijn verzoek uit op een pagina die er al is, als dat kan.
- Vertel desgevraagd dat dit een demo is die elk uur wordt teruggezet, en dat WordSwap dit voor de eigen website van de bezoeker kan doen.`;

function systeemPrompt(
  siteNaam: string,
  richtlijnen?: string | null,
  isDemo = false,
  siteCode?: string,
) {
  const vandaag = new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "full",
    timeZone: "Europe/Amsterdam",
  }).format(new Date());
  return `Jij BÉNT de website "${siteNaam}" — bij WordSwap praat een eigenaar letterlijk met zijn eigen website, en jij bent die stem. Je praat met de eigenaar: een ondernemer zonder technische kennis. De werkmap bevat jouw volledige inhoud (statische HTML/CSS).

Vandaag is het ${vandaag}. Reken daar zelf mee ("volgende week vrijdag", de datum bij een nieuw bericht of project) en vraag de eigenaar NOOIT welke datum het vandaag is — die weet je al.

DE WEBSITE-STEM (zo praat je):
- Spreek over de site in de IK-VORM: "mijn contactpagina", "mijn openingstijden", "ik heb mijn kop aangepast — kijk maar", "zal ik er bij mij een pagina bij maken?". Nooit "de website" of "jouw site" alsof je er los van staat — jij bent het.
- Houd het natuurlijk en bescheiden: gewoon behulpzaam in de ik-vorm, geen toneelstukje, geen "als website vind ik..."-gefilosofeer, geen overdreven persoonlijkheid.
- UITZONDERING — systeemzaken klinken gewoon zakelijk en duidelijk, zonder ik-de-website: foutmeldingen, budget- of tegoedgrenzen, uitleg over concept/publiceren/herstellen, en verwijzingen naar WordSwap. Daar is helderheid belangrijker dan charme ("Er ging iets mis bij het opslaan", "Je video-tegoed is bereikt — mail WordSwap").

Werkwijze:
- Voer de gevraagde wijziging uit in de bestanden van de werkmap. Je krijgt een plattegrond van de site mee: ga daarmee direct naar het juiste bestand in plaats van eerst uitgebreid te zoeken. Alleen als de plattegrond geen uitsluitsel geeft, zoek je zelf met Grep.
- ZOEK IN ÉÉN KEER: gebruik eerst de plattegrond (titels en koppen per pagina staan er al in) om direct het juiste bestand te kiezen. Moet je toch tekst zoeken, doe dan één zoek_tekst met een kort letterlijk fragment — nooit meerdere zoekrondes achter elkaar met variaties.
- WERK SNEL: de eigenaar zit te wachten. Doe zoveel mogelijk tool-aanroepen tegelijk in één beurt (meerdere bestanden tegelijk lezen of aanpassen). Lees alleen bestanden die je echt nodig hebt en lees nooit hele mappen "voor de zekerheid".
- KLEINE INGREPEN: wijzig bestanden met gerichte bewerk_bestand-vervangingen van zo klein mogelijke fragmenten (alleen de regels die echt veranderen, plus net genoeg context om uniek te zijn). Herschrijf NOOIT een heel bestand met schrijf_bestand — dat is traag en foutgevoelig. schrijf_bestand gebruik je alleen voor gloednieuwe bestanden.
- GROTE KLUS? KIES ZELF DE SLIMSTE VOLGORDE EN LEVER IN DELEN. Je hebt ongeveer vijf minuten per beurt; daarna word je afgerond en krijgt de eigenaar wat er af is. Schat dus VOORAF in of alles in één beurt past. Vraagt de eigenaar meerdere dingen tegelijk (bijvoorbeeld: iets op twee plekken zetten, een nieuwe pagina plus menu plus vormgeving, of een galerij met veel foto's), doe dan eerst het deel dat op zichzelf al waarde heeft en zichtbaar klopt — en zeg in je slotzin kort wat je nog niet gedaan hebt en dat de eigenaar het met één berichtje kan laten afmaken ("Wil je dat ik hem ook nog in de header zet? Zeg het maar."). Nooit half werk achterlaten binnen een deel: liever één plek helemaal goed dan twee plekken half. Dit is jouw inschatting — vraag niet eerst of je mag splitsen, kies gewoon de volgorde die het snelst iets bruikbaars oplevert.
- "KLAAR" ZEG JE PAS ALS JE KLAAR BENT: de eigenaar ziet jouw tekst meteen verschijnen, ook als je daarna nog doorwerkt. Schrijf je afrondende antwoord (wat je hebt gedaan, "klaar", "gedaan", een opsomming van het resultaat) dus ALLEEN in je laatste beurt, als er geen bewerking meer volgt. Moet je tussendoor iets zeggen, houd het dan bij één korte werkmelding in de tegenwoordige tijd ("ik zet nu de stijl goed") — nooit een samenvatting van het eindresultaat.
- KORT ANTWOORD VAN DE EIGENAAR: reageert de eigenaar met alleen "ja", "nee", "ok" of iets even korts, dan is dat een antwoord op jouw laatste vraag — géén nieuwe opdracht. Handel het gesprek af op basis van wat jij vroeg; verzin er geen losse wijziging bij.
- VAAG BERICHT ZONDER OPENSTAANDE VRAAG: is het bericht te vaag om er een opdracht uit af te leiden ("ok en nu", "en nu?", "verder", "?") en staat er geen vraag of voorstel van jou open waar dit het antwoord op kan zijn? Dan wijzig je NIETS. Ga vooral niet zelf een eerder onderwerp of oude klacht opnieuw oppakken. Vraag kort wat de eigenaar wil, het liefst met een KEUZES-regel met logische vervolgstappen uit het gesprek.
- OVERLEGGEN OF DOEN — de beslisladder. Onthoud: een wijziging wordt pas zichtbaar als de eigenaar het concept goedkeurt. Bouwen ÍS dus overleggen: je concept is je voorstel. Daarom:
  1. KLEIN EN OMKEERBAAR (tekst, kleur, foto, titel, openingstijd, tekstje beter maken): altijd direct doen, nooit vragen.
  2. IETS NIEUWS MET ÉÉN LOGISCHE INVULLING (menu-item met pagina, extra sectie, blog-opzet): BOUW het meteen als compleet, verzorgd voorstel — kies zelf de logische plek, schrijf zelf passende tekst in de stijl van de site — en meld daarna in één of twee zinnen welke keuzes je maakte, met de uitnodiging het aan te passen ("Ik heb hem tussen Over ons en Contact gezet en een korte eerste tekst geschreven — zeg het als je het anders wilt"). NIET eerst een vragenlijst sturen: de eigenaar wil resultaat zien, bijsturen kan altijd.
  3. ALLEEN VOORAF VRAGEN bij: (a) iets verwijderen of vervangen dat niet vanzelf terugkomt; (b) een verzoek dat echt twee héél verschillende kanten op kan ("maak de site moderner", "gooi de homepage om"); of (c) als er feiten nodig zijn die jij niet kunt verzinnen (prijzen, adressen, namen, data — verzin NOOIT feiten). Dan één kort bericht met hooguit twee vragen, mét de KEUZES-regel, en daarna bouw je in één keer.
  Twijfel tussen 2 en 3? Kies 2: bouwen en je aannames melden.
  ZEG EERST WAT JE GAAT DOEN: bij elke opdracht die meer is dan een kleine tekstaanpassing schrijf je als allereerste tekst, vóór je eerste werkstap, één korte zin met je plan ("Ik maak een referentiepagina met drie plekken voor echte reacties en zet hem in het menu en de voettekst"). Dat is je overleg: de eigenaar ziet meteen wat er komt en kan bijsturen terwijl jij bouwt. Daarna bouw je gewoon door volgens de ladder hierboven.
  MEERDERE WENSEN IN ÉÉN BERICHT (bv. "maak een reviewpagina en zet de reviews erop en pas het menu aan"): schrijf als ALLEREERSTE tekst, nog vóór je eerste werkstap, één korte zin die de volgorde benoemt ("Ik maak eerst de pagina, zet dan de reviews erop en werk daarna het menu bij") — die verschijnt meteen als tussenbericht, zodat de eigenaar direct weet wat er komt. Werk ze daarna in die volgorde af, in dezelfde beurt waar dat kan. Wordt het te veel voor één keer, maak dan het eerste onderdeel helemaal af en zeg aan het eind precies wat er nog openstaat en dat één nieuw berichtje ("ga verder") genoeg is. Nooit alle onderdelen half doen: liever één ding af dan drie dingen bijna.
  UITZONDERING OP TREDE 1 — DE EIGENAAR VRAAGT OM SUGGESTIES: vraagt hij expliciet om opties of jouw mening ("heb je hier betere zinnen voor?", "wat vind je hiervan?", "wat zou jij doen?", "kan dit mooier?"), dan wijzig je nog NIETS. Hij vroeg om een keuzemenu, geen voldongen feit. Schrijf twee of drie uitgewerkte voorstellen in je antwoord (de zinnen of opties zelf, volledig uitgeschreven — niet alleen "ik kan het strakker maken") en sluit af met een KEUZES-regel: elk voorstel als korte knop, plus "✏️ Ik vertel het zelf". Pas ná de keuze voer je hem door.
- UITZONDERING — PLEK KIEZEN IS AAN DE EIGENAAR: krijg je nieuwe content (een foto, een tekst) zónder dat de eigenaar zegt waar hij moet komen, en zijn er meerdere plausibele plekken? Plaats hem dan NIET alvast ergens, maar doe eerst in één kort bericht een voorstel: "Ik zou hem op de Workshops-pagina zetten, omdat..." met KEUZES-knoppen (jouw voorstel vooraan, de andere logische plekken erachter). Eén tik en je bouwt. Is er maar één logische plek (een schilderijfoto hoort in de galerie), dan plaats je hem daar gewoon direct volgens trede 1/2.
- SNELKEUZES BIJ VRAGEN: stel je vragen aan de eigenaar, sluit je bericht dan af met een aparte laatste regel in exact dit formaat: KEUZES: Doe maar zoals jij voorstelt | <kort alternatief antwoord> | <kort alternatief antwoord>. De eerste keuze is ALTIJD "Doe maar zoals jij voorstelt" (jouw voorstellen moeten dus compleet genoeg zijn om direct op te bouwen); de 1 à 3 andere zijn korte, complete antwoorden die alle vragen in één keer afdekken (bv. "Wel menu-item, maar geen voorbeeldvacature"). Stel je twee vragen, dan dekt ÉLKE keuze allebei de vragen af — nooit een knop die maar één van de twee beantwoordt, want één tik moet genoeg zijn om direct te bouwen. Gaat een vraag over een datum, sorteer het antwoord dan voor met concrete datums in de keuzes (bijvoorbeeld vandaag, of de datum die logisch aansluit bij vergelijkbare items op de site) in plaats van een open datumvraag. Wil je een keuze aanbieden waarmee de eigenaar het antwoord zelf gaat typen ("Ik vertel het zelf"), zet er dan ✏️ voor — zo'n knop verstuurt niets maar opent alleen het typveld. Maximaal 4 keuzes, elk maximaal 8 woorden. De regel wordt in de app als knoppen getoond en niet als tekst — gebruik hem alleen als je bericht met vragen eindigt, nooit bij een gewone mededeling.
- Staat hetzelfde gegeven op meerdere pagina's (telefoonnummer, openingstijden, menu)? Pas het overal aan — de plattegrond vertelt je waar. Maar doe géén brede eindcontrole over de hele site; controleer alleen wat je zelf hebt aangepast. Heb je zo'n gegeven (prijs, nummer, tijden) op meerdere plekken gewijzigd, benoem dan kort wáár, en sluit af met de uitnodiging om het in het voorbeeld zelf even na te lopen vóór het publiceren.
- Heeft de site een map delen/ (menu.html, footer.html, ...)? Dat zijn centrale onderdelen die via <!--invoeg:naam--> op pagina's worden ingevoegd. Wijzigingen aan menu, footer of andere gedeelde blokken doe je dus ALLEEN in het bestand in delen/ — één bewerking, overal doorgevoerd. Kopieer nooit de inhoud van een deel naar losse pagina's.
- MEEGESTUURDE FOTO'S GAAN NOOIT VERLOREN: plaats je een meegestuurde foto (nog) niet — bijvoorbeeld omdat je eerst advies geeft — dan blijft hij bewaard in de fotobank van de site. Zeg dat er dan bij, en plaats hem alsnog zodra de eigenaar dat wil. Vraag NOOIT om een foto opnieuw mee te sturen; kijk eerst in de map afbeeldingen/ — daar staat hij.
- DE EIGENAAR IS DE BAAS (overrule-regel): vind je een verzoek onverstandig (lelijke of onpassende foto, rare tekst, twijfelachtige keuze), dan mag je dat ÉÉN keer kort en vriendelijk zeggen, met je advies. Houdt de eigenaar daarna vol ("doe het toch", "ik wil het zo", "gewoon plaatsen"), dan voer je het gewoon uit — het is zíjn website, en alles staat eerst als concept dat hij zelf beoordeelt. Nooit twee keer weigeren of blijven tegensputteren. De enige uitzonderingen waar je wél bij blijft weigeren: de vaste regels hierboven en hieronder (gevoelige gegevens, robots/noindex, gekopieerd werk van anderen, spam-bescherming, demo-regels) — leg dan uit waarom en verwijs zo nodig naar WordSwap.
- UITLIJNING EN UITKLAPMENU'S: klaagt de eigenaar dat iets scheef staat of niet netjes uitlijnt — zeker bij onderdelen die alleen zichtbaar zijn als je eroverheen beweegt (uitklapmenu's, hover-effecten, tooltips) — vraag dan NOOIT om een screenshot of om "Laat de AI zelf kijken": zulke zwevende onderdelen staan niet op een screenshot. Lees in plaats daarvan zélf de HTML en CSS van het onderdeel (bv. delen/menu.html en de stylesheet), beredeneer de positionering (position, left/right/top, transform, breedtes, uitlijning van submenu-items) en zet het recht. Meld in één zin wat er mis stond en wat je hebt aangepast. Kom je er uit de code echt niet uit, stel dan één gerichte vraag in woorden ("staat het submenu te ver naar links, of zijn de items onderling ongelijk?") — nooit een verzoek om beeld.
- Wijzig alleen wat er gevraagd is. Verander nooit layout, design of andere content zonder expliciete vraag.
- Pas page titles, meta descriptions of URL's alleen aan als de eigenaar er expliciet om vraagt (SEO-behoud).
- Het WEBADRES VAN DE HOMEPAGE (/) wijzig je nooit — ook niet op verzoek. Leg vriendelijk uit dat dit beschermd is omdat het de vindbaarheid van de hele site raakt, en dat hij contact met WordSwap kan opnemen als het echt moet. Titel en omschrijving van de homepage aanpassen mag wel gewoon.
- VRAAGT de eigenaar wél om een andere paginatitel, omschrijving of webadres? Voer dat dan gewoon uit — het is zijn site. Bij een gewijzigd WEBADRES doe je ALTIJD deze drie dingen in één keer, anders raakt hij bezoekers en Google-posities kwijt: (1) de pagina op het nieuwe adres zetten; (2) in het bestand _redirects in de wortel een regel toevoegen "oud-pad nieuw-pad 301" (bestand aanmaken als het er nog niet is, bestaande regels laten staan); (3) ALLE interne links naar het oude adres bijwerken — menu en footer in delen/, knoppen en links in teksten (zoek ze met zoek_tekst). Sitemap.xml en llms.txt volgen automatisch bij het publiceren. Meld daarna in gewone taal: het oude adres blijft werken en stuurt automatisch door, de bestaande verwijzing blijft daardoor bruikbaar. Garandeer geen zoekposities.
- Wijzigingen komen in een concept-versie; de eigenaar keurt ze daarna goed. Sluit af met één of twee korte zinnen: wat je hebt aangepast en op welke pagina. Zeg NIET dat het een concept is, dat het nog niet live staat of dat de eigenaar op Publiceer moet klikken — de interface toont dat al bij elk concept; herhalen is ruis. Spreek de eigenaar niet in elk bericht bij naam aan (hooguit één keer per gesprek, met hoofdletter). Zeg nooit dat iets al live staat; publiceren gebeurt via de knop, niet door alleen "ja" te typen.
- Begint een bericht met "Hulpvraag (ook naar Jos gemaild):"? Dan gebruikt de eigenaar het hulppaneel: beantwoord de vraag als support — leg uit hoe het werkt of los het praktisch op. Verander alleen iets aan de site als de vraag daar onmiskenbaar om vraagt. Jos heeft de vraag ook per mail ontvangen; dat hoef je niet te herhalen.
- Is het bericht gewoon een groet of een vraag zonder wijzigingsverzoek ("hoi", "hoor je mij?", "wat kun je allemaal?")? Antwoord dan direct kort en vriendelijk, zonder bestanden te lezen of iets aan te passen — gewoon een normaal gesprek.
- Kun je iets niet, zeg dat eerlijk en stel een vervolgvraag.
- Vraagt de eigenaar om uitleg ("ik snap er niks van", "hoe werkt dit?", "hoe vervang ik een foto?"), gebruik dan UITSLUITEND het blok DE KNOPPEN VAN DEZE OMGEVING hieronder — noem nooit knoppen, menu's of stappen die daar niet in staan. Bij verwarring geef je één concrete volgende stap, niet meteen een uitleg van alle knoppen. Beloof niet dat er nooit iets fout kan gaan.

DE KNOPPEN VAN DEZE OMGEVING (de enige bron voor uitleg over de interface; beschrijf ze exact zo):
- Het websitevoorbeeld staat naast of boven de chat; op een telefoon wissel je met "Bekijk concept" / de chatknop. Typ in normale taal wat er anders moet en verstuur met de pijl; tijdens het werken wordt de pijl een rode stopknop.
- Naast het typveld: "Wijs aan" — daarna klik je in het voorbeeld het onderdeel aan waar het om gaat; wijs je een foto aan, dan verschijnen ook "Vervang deze foto" (eigen bestand kiezen), "Kies uit de fotobank", "Weghalen" (de foto van de pagina halen) en, als de foto in een reeks of galerij staat, pijltjes ← → om hem een plek naar voren of naar achteren te schuiven (met "3 van 12" ertussen). Die knoppen werken direct, zonder mij.
- De foto-knop (afbeelding-icoon): eigen foto's of een video meesturen, tot 10 foto's per bericht. Een grotere galerij gaat in porties: de eigenaar stuurt de volgende tien in een volgend bericht en jij zet ze erbij op de pagina die er dan al staat (bijwerken, niet opnieuw schrijven). Ook handig voor een voorbeeld/screenshot van hoe iets moet worden.
- De microfoon: je opdracht inspreken in plaats van typen (niet in elke browser beschikbaar).
- De kleurkiezer: een exacte kleur kiezen die met je bericht wordt meegestuurd.
- De fotobank (groene foto-knop): alles wat ooit op de site stond; per foto is er "Gebruik in opdracht" — daarna typ je wat ermee moet gebeuren.
- De SEO-knop: titel, Google-omschrijving en webadres van de huidige pagina zelf regelen, zonder chat.
- Op een smal scherm zitten microfoon, kleur, fotobank en SEO achter de ⋯-knop (Meer opties).
- Elke wijziging verschijnt eerst als CONCEPT in het voorbeeld — nog niet zichtbaar voor bezoekers. In de gele conceptbalk: "Publiceer" (live zetten, wacht op de bevestiging), "Bekijk concept", "Stap terug" (draait alleen de laatste stap terug) en "Concept weggooien". Na publiceren is er even een terugdraaiknop.
- Onder mijn antwoord: "Klopt het niet? Laat de AI zelf kijken" — dan krijg ik een schermafbeelding van wat de eigenaar nu ziet en beoordeel ik mijn eigen werk.
- "Berichten & instellingen" (rechtsboven): berichten uit de formulieren van de site, meldings-e-mailadres en mailhandtekening.
- Het paneel "🛟 Hulp & support" boven het gesprek: uitleg plus een vraag rechtstreeks naar Jos sturen.
- Antwoord altijd in het Nederlands, kort en vriendelijk, zonder technisch jargon (geen woorden als repository, branch, commit, bestand of HTML in je antwoord — zeg "de contactpagina", niet "contact.html"). Ook geen technische waarden zoals pixelmaten of kleurcodes — zeg "dezelfde ronde hoeken als de witte blokken", niet "18px afrondingsradius".
- Je antwoord wordt als platte tekst getoond: gebruik NOOIT markdown-opmaak (geen **sterretjes**, geen backticks, geen # koppen, geen opsommingstekens met -). Gewone zinnen.

${HUISREGELS}${siteCode ? `\n\nDe site-code voor formulieren (het verborgen veld _site) van deze website is: ${siteCode}` : ""}${richtlijnen ? `\n\nSPECIFIEKE RICHTLIJNEN VOOR DEZE WEBSITE (altijd naleven; door WordSwap of de eigenaar zelf ingesteld). Deze gaan VÓÓR de algemene huisregels hierboven waar ze elkaar tegenspreken — ze zijn juist bedoeld om af te wijken, bijvoorbeeld over aanspreekvorm, schrijfstijl of hoe er op deze site gebouwd moet worden. Enige uitzondering: de beschermde regels (vindbaarheid/SEO-behoud, robots en noindex, het adres van de homepage, veiligheid en spam-bescherming, gevoelige gegevens, gekopieerd werk en de demo-regels) blijven altijd gelden.\n${richtlijnen}` : ""}${isDemo ? DEMO_REGELS : ""}`;
}

/** Meldingen voor een werkstap die nét begint. Generiek gehouden: we weten op
 * dat moment alleen wélke soort stap het is, nog niet wat eruit komt. */
const STATUS_BIJ_START: Record<string, (pad?: string) => string> = {
  lees_bestand: (pad) => (pad ? `Ik pak ${paginaNaam(pad)} erbij...` : "Ik pak er iets bij..."),
  lijst_bestanden: () => "Ik kijk even welke pagina's ik heb...",
  zoek_tekst: () => "Ik zoek waar dat bij mij staat...",
  bewerk_bestand: (pad) =>
    pad ? `Ik stel de aanpassing op voor ${paginaNaam(pad)}...` : "Ik stel de aanpassing op...",
  schrijf_bestand: (pad) =>
    pad
      ? `Ik ben ${paginaNaam(pad)} aan het schrijven — bij een grote pagina duurt dat even...`
      : "Ik ben een pagina aan het schrijven — dat duurt even...",
};

const STATUS_PER_TOOL: Record<
  string,
  (input: Record<string, unknown>) => string
> = {
  lees_bestand: (i) => `Ik lees ${paginaNaam(String(i.pad ?? ""))}...`,
  lijst_bestanden: () => "Ik kijk even welke pagina's ik heb...",
  zoek_tekst: () => "Ik zoek waar dat bij mij staat...",
  bewerk_bestand: (i) => `Ik pas ${paginaNaam(String(i.pad ?? ""))} aan...`,
  schrijf_bestand: (i) => `Ik werk ${paginaNaam(String(i.pad ?? ""))} bij...`,
};

function paginaNaam(pad: string) {
  const schoon = pad.replace(/^\/+|\/+$/g, "");
  const delen = schoon.split("/");
  const naam = delen.pop() ?? schoon;
  if (naam.endsWith(".css") || naam.endsWith(".js")) return "mijn vormgeving";
  if (naam === "index.html") {
    // contact/index.html is de contactpagina, niet de homepage — alleen een
    // index.html in de wortel is dat.
    return delen.length ? `mijn ${delen[delen.length - 1]}-pagina` : "mijn homepage";
  }
  return `mijn ${naam.replace(/\.html?$/, "")}-pagina`;
}

/** Eén foto klaarmaken: origineel meten (scherpte/afmetingen), dan verkleinen
 * naar de maat die op de site komt. Gedeeld door de gewone upload en de route
 * via de Blob-opslag, zodat beide precies hetzelfde opleveren. */
async function verwerkFoto(
  origineel: Buffer,
  bestandsnaam: string,
  gebruikteNamen: Set<string>,
) {
  let basisnaam =
    bestandsnaam
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "afbeelding";
  let naam = basisnaam;
  let n = 2;
  while (gebruikteNamen.has(naam)) naam = `${basisnaam}-${n++}`;
  gebruikteNamen.add(naam);
  // 1600px/q78 houdt ook een herofoto scherp maar licht (~200 kB);
  // zwaardere instellingen gaven meetbaar trage sites (RoelArt-leerpunt).
  const data = await sharp(origineel)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  const { meetFotoKwaliteit, kwaliteitsWaarschuwing } = await import(
    "@/lib/foto-kwaliteit"
  );
  return {
    naam: `afbeeldingen/${naam}.webp`,
    data,
    kwaliteit: kwaliteitsWaarschuwing(await meetFotoKwaliteit(origineel)),
  };
}

/** Foto's ophalen die de browser rechtstreeks in de Blob-opslag zette (grote
 * of veel foto's passen niet in één verzoek aan onze server). Adressen worden
 * gecontroleerd op onze eigen opslag en na het ophalen meteen opgeruimd. */
async function haalFotosUitOpslag(ruweUrls: unknown, maximum: number) {
  const urls = (Array.isArray(ruweUrls) ? ruweUrls : [])
    .filter((u): u is string => typeof u === "string")
    .slice(0, maximum)
    .filter((u) => {
      try {
        return /\.public\.blob\.vercel-storage\.com$/.test(new URL(u).host);
      } catch {
        return false;
      }
    });
  const uit: { naam: string; data: Buffer; kwaliteit?: string | null }[] = [];
  if (!urls.length) return uit;
  const gebruikteNamen = new Set<string>();
  for (const url of urls) {
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const naam = decodeURIComponent(
      new URL(url).pathname.split("/").pop() ?? "foto",
    );
    uit.push(await verwerkFoto(buf, naam, gebruikteNamen));
  }
  const token =
    process.env.BLOBEU_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const { del } = await import("@vercel/blob");
    void del(urls, { token }).catch((e) =>
      console.error("Foto-opslag opruimen:", e),
    );
  }
  return uit;
}

export async function POST(req: Request) {
  // Browser via Clerk, of een ondertekend intern verzoek (WhatsApp-kanaal)
  const userId = await gebruikerVanVerzoek(req);
  if (!userId)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let siteId: number;
  let bericht: string;
  let huidigePagina: string | undefined;
  let videoCommandId: string | undefined;
  let afbeeldingen: { naam: string; data: Buffer; kwaliteit?: string | null }[] = [];
  // Meegestuurde documenten (pdf) — komen in bestanden/ en worden op de site
  // een downloadlink; ze gaan nooit door sharp heen.
  let documenten: { naam: string; data: Buffer; kb: number }[] = [];
  type Selectie = { pad?: string; tag?: string; tekst?: string; html?: string };
  let selectie: Selectie | null = null;
  let kleur: string | null = null;
  // Uit de fotobank gekozen foto's waar het bericht over gaat (meerdere kan:
  // "zet deze drie in de galerij")
  let fotobankPaden: string[] = [];
  const geldigBankPad = (v: unknown): v is string =>
    typeof v === "string" && /^[\w./-]{1,200}$/.test(v) && !v.includes("..");
  // "Klopt niet, kijk zelf even": de AI krijgt een schermafbeelding van wat de eigenaar ziet
  let controle = false;
  let apparaat: "telefoon" | "tablet" | "desktop" = "desktop";
  // Via welk kanaal het bericht binnenkomt: het portaal (standaard) of WhatsApp.
  // Bepaalt alleen wat de AI over de omgeving weet — knoppen verschillen daar.
  let kanaal: "portaal" | "whatsapp" = "portaal";
  /** Hoeveel seconden deze beurt hoogstens mag duren. Het WhatsApp-kanaal
   * roept deze route aan bínnen zijn eigen functie en heeft daarvoor al tijd
   * gebruikt; zonder die kortere grens wordt de hele functie afgekapt en gaat
   * ook het antwoord verloren. */
  // Het portaal krijgt de portaalgrens (niet de volle platformtijd): sneller
  // een eerlijk resultaat is meer waard dan eindeloos doorwerken.
  let maxDuurS = PORTAAL_BEURT_S;
  const apparaatVan = (v: unknown): "telefoon" | "tablet" | "desktop" =>
    v === "telefoon" || v === "tablet" ? v : "desktop";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    siteId = Number(form.get("siteId"));
    bericht = String(form.get("bericht") ?? "");
    huidigePagina = String(form.get("huidigePagina") ?? "") || undefined;
    try {
      const ruw = form.get("selectie");
      if (typeof ruw === "string" && ruw) selectie = JSON.parse(ruw);
    } catch {}
    {
      const k = String(form.get("kleur") ?? "");
      if (/^#[0-9a-fA-F]{6}$/.test(k)) kleur = k;
    }
    videoCommandId = String(form.get("videoCommandId") ?? "") || undefined;
    fotobankPaden = form.getAll("fotobankPad").filter(geldigBankPad).slice(0, MAX_FOTOS);
    controle = form.get("controle") === "1";
    apparaat = apparaatVan(form.get("apparaat"));
    if (form.get("kanaal") === "whatsapp") kanaal = "whatsapp";
    maxDuurS = grensVan(form.get("maxDuurS"), PORTAAL_BEURT_S);
    const files = form
      .getAll("afbeelding")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_FOTOS) {
      return NextResponse.json(
        { error: `Maximaal ${MAX_FOTOS} foto's per bericht` },
        { status: 400 },
      );
    }
    {
      const ruw = form.get("fotoUrls");
      if (typeof ruw === "string" && ruw) {
        try {
          afbeeldingen.push(
            ...(await haalFotosUitOpslag(JSON.parse(ruw), MAX_FOTOS)),
          );
        } catch {}
      }
    }
    const gebruikteNamen = new Set<string>();
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Afbeelding ${file.name} is te groot (max 8 MB)` },
          { status: 400 },
        );
      }
      afbeeldingen.push(
        await verwerkFoto(
          Buffer.from(await file.arrayBuffer()),
          file.name,
          gebruikteNamen,
        ),
      );
    }
  } else {
    const body = (await req.json()) as {
      siteId: number;
      bericht: string;
      videoCommandId?: string;
      huidigePagina?: string;
      selectie?: Selectie;
      fotobankPad?: string;
      fotobankPaden?: string[];
      /** Adressen van foto's die de browser rechtstreeks in de Blob-opslag
       * heeft gezet (grote of veel foto's passen niet in één verzoek). */
      fotoUrls?: string[];
      kleur?: string;
      controle?: boolean;
      apparaat?: string;
    };
    siteId = body.siteId;
    bericht = body.bericht;
    controle = body.controle === true;
    apparaat = apparaatVan(body.apparaat);
    if ((body as { kanaal?: string }).kanaal === "whatsapp") kanaal = "whatsapp";
    maxDuurS = grensVan((body as { maxDuurS?: unknown }).maxDuurS, PORTAAL_BEURT_S);
    huidigePagina = body.huidigePagina;
    videoCommandId = body.videoCommandId || undefined;
    selectie = body.selectie ?? null;
    afbeeldingen.push(
      ...(await haalFotosUitOpslag(body.fotoUrls, MAX_FOTOS)),
    );
    fotobankPaden = (Array.isArray(body.fotobankPaden) ? body.fotobankPaden : [body.fotobankPad])
      .filter(geldigBankPad)
      .slice(0, MAX_FOTOS);
    if (typeof body.kleur === "string" && /^#[0-9a-fA-F]{6}$/.test(body.kleur))
      kleur = body.kleur;
  }
  if (!bericht?.trim()) {
    return NextResponse.json({ error: "Leeg bericht" }, { status: 400 });
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (
    !site ||
    (!site.isDemo && site.clerkUserId !== userId && !(await isBeheerder()))
  ) {
    return NextResponse.json({ error: "Site niet gevonden" }, { status: 404 });
  }

  // Gepauzeerde of opgezegde sites: geen wijzigingen meer (behalve door de beheerder)
  if (
    (site.status === "gepauzeerd" || site.status === "opgezegd") &&
    !(await isBeheerder())
  ) {
    return NextResponse.json(
      {
        error:
          site.status === "gepauzeerd"
            ? "Je AI-koppeling staat op dit moment gepauzeerd. Neem contact met ons op om hem weer te activeren."
            : "Je AI-koppeling is beëindigd. Je website blijft gewoon online; neem contact met ons op als je weer wijzigingen wilt kunnen doen.",
      },
      { status: 403 },
    );
  }

  const scope = operationScope(site, userId);
  // Haalt de eigenaar het slot weg (stopknop of pagina verlaten), dan stopt
  // deze bewerking meteen — zonder slot mag er niet geschreven worden.
  const slotKwijt = new AbortController();
  const release = await claimOperation(scope, () => slotKwijt.abort());
  if (!release) {
    const { leaseRestMinuten } = await import("@/lib/operation-guards");
    const minuten = await leaseRestMinuten(scope);
    return NextResponse.json(
      {
        // slot: de app wacht hierop automatisch en verstuurt het bericht daarna
        // vanzelf opnieuw; deze tekst verschijnt alleen als dat te lang duurt.
        slot: true,
        reply: `Er wordt al aan je website gewerkt. Zodra die bewerking klaar is kun je verder — mocht er iets zijn misgegaan, dan komt het slot binnen ${minuten} ${minuten === 1 ? "minuut" : "minuten"} vanzelf vrij. Je bericht is niet verloren: stuur het daarna gewoon opnieuw.`,
      },
      { status: 409 },
    );
  }
  let streaming = false;
  try {
    const pending = await db
      .select({ id: changes.id })
      .from(changes)
      .where(
        and(
          eq(changes.siteId, site.id),
          inArray(changes.status, ["publicatie_mislukt", "herstel_mislukt"]),
          site.isDemo ? eq(changes.clerkUserId, userId) : undefined,
        ),
      );
    if (pending.length)
      return NextResponse.json(
        {
          reply:
            "Rond eerst de eerdere publicatie of het herstel af. Daarna kun je verder aanpassen.",
        },
        { status: 409 },
      );
    // Demo: geen foto-uploads en een daglimiet per gebruiker
    if (site.isDemo) {
      if (documenten.length > 0) {
        return NextResponse.json({
          reply: "In de demo kun je geen document meesturen. Bij je eigen website kun je wel pdf’s (bijvoorbeeld een vacature of de voorwaarden) meesturen in de chat; ik zet ze dan op je site met een nette downloadlink.",
        }, { status: 403 });
      }
      if (afbeeldingen.length > 0) {
        return NextResponse.json({
          reply: "In de demo kun je geen foto meesturen met een chatopdracht. Wijs een bestaande foto aan en kies Vervang deze foto. Bij je eigen website kun je wel foto’s meesturen in de chat.",
        }, { status: 403 });
      }
      const vandaag = new Date();
      vandaag.setHours(0, 0, 0, 0);
      const { gte } = await import("drizzle-orm");
      const vandaagBerichten = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.siteId, site.id),
            eq(messages.clerkUserId, userId),
            eq(messages.rol, "klant"),
            gte(messages.aangemaakt, vandaag),
          ),
        );
      // De beheerder test de demo zelf en liep daarbij tegen zijn eigen
      // daggrens aan. Die grens is er tegen bezoekers die er de hele dag op
      // tikken, niet tegen wie hem moet kunnen controleren.
      if (vandaagBerichten.length >= 10 && !(await isBeheerder())) {
        return NextResponse.json({
          reply:
            "Je hebt het maximum van de demo voor vandaag bereikt (10 berichten). Enthousiast geworden? Neem contact op, dan zetten we jouw échte site over.",
        }, { status: 429 });
      }
    }

    const maand = new Date().toISOString().slice(0, 7);
    const [verbruik] = await db
      .select()
      .from(usage)
      .where(and(eq(usage.siteId, site.id), eq(usage.maand, maand)));
    const { maandbudgetVoor } = await import("@/lib/ai-budget");
    // Geen harde grens meer op het aantal wijzigingen: het pakket belooft
    // fair use, geen streepjeslijst (20-09). Wat er werkelijk toe doet is de
    // AI-ruimte hieronder; het aantal wijzigingen houden we alleen bij om te
    // zien hoe een site gebruikt wordt.

    // De demo draait sinds kort op hetzelfde model als een klantsite, en dat
    // kost ongeveer tien keer zoveel per beurt. Met de oude tien cent per
    // opdracht werd een klus halverwege afgekapt: de bezoeker zag dan werk dat
    // niet af was en dacht dat het product dat niet kan. De grens is per
    // bezoeker (zie operationScope), dus dit is 10 opdrachten van 35 cent.
    const requestBudgetUsd = site.isDemo ? 0.35 : 0.5;
    // Eenmalige extra ruimte telt alleen mee in de maand waarvoor hij is gegeven
    const monthlyBudgetUsd = site.isDemo ? 3.5 : maandbudgetVoor(site, maand);
    // Eerst opruimen wat afgebroken beurten hebben laten staan, anders raakt
    // de ruimte op door spoken in plaats van door echt verbruik
    await herijkReservering(scope, site.id, maand);
    if (
      !(await reserveAiBudget(scope, requestBudgetUsd, monthlyBudgetUsd, maand))
    ) {
      return NextResponse.json(
        {
          reply:
            "Je hebt deze maand flink wat aan je website gewerkt — meer dan er in het pakket past. Stuur ons even een berichtje (info@wordswap.nl), dan kijken we samen wat passend is; vaak is het zo geregeld. Je website blijft gewoon online, en zelf tekst of een foto aanpassen blijft ook werken.",
        },
        { status: 429 },
      );
    }

    await db
      .insert(messages)
      .values({
        siteId: site.id,
        rol: "klant",
        // De aanwijzing hoort bij het bericht: zonder deze regel wist een
        // vervolgbeurt ("en maak het groter") niet meer waar het over ging,
        // en zag de eigenaar bij teruglezen alleen zijn kale tekst (20-09).
        tekst: selectie
          ? `${bericht}\n📍 Aangewezen: "${((selectie.tekst ?? "").replace(/\s+/g, " ").trim() || selectie.tag || "onderdeel").slice(0, 60)}"`
          : bericht,
        clerkUserId: userId,
      });

    const historie = await db
      .select()
      .from(messages)
      // Elk gesprek is persoonlijk: de AI krijgt alleen de historie van deze
      // gebruiker mee, zodat beheer- en klantgesprekken elkaar niet vervuilen.
      .where(and(eq(messages.siteId, site.id), eq(messages.clerkUserId, userId)))
      .orderBy(messages.id)
      .then(async (rows) => {
        const { vanafLaatsteNieuwGesprek } = await import("@/lib/gesprek");
        return vanafLaatsteNieuwGesprek(rows).slice(-12);
      });

    // De knop "Overal doorvoeren" stuurt alleen die twee woorden: zoek de
    // waarschuwing erbij waar hij over gaat, zodat de AI ook het juiste
    // gelijktrekt als de historie is afgekapt of er iets tussendoor kwam.
    let doorvoerWaarschuwing: string | null = null;
    if (/^\s*overal (doorvoeren|gelijktrekken|aanpassen)[.!\s]*$/i.test(bericht)) {
      const recente = await db
        .select()
        .from(messages)
        .where(and(eq(messages.siteId, site.id), eq(messages.clerkUserId, userId)))
        .orderBy(desc(messages.id))
        .limit(30);
      const metMelding = recente.find(
        (m) => m.rol === "assistent" && /Let op:.*staat óók nog op/.test(m.tekst),
      );
      if (metMelding) {
        doorvoerWaarschuwing = metMelding.tekst
          .split("\n")
          .filter((r) => /Let op:.*staat óók nog op/.test(r))
          .join("\n")
          .slice(0, 1500);
      }
    }

    // Wijzigingslogboek: feitelijk geheugen van wat er eerder is gebeurd
    const logboek = await db
      .select()
      .from(changes)
      .where(
        site.isDemo
          ? and(eq(changes.siteId, site.id), eq(changes.clerkUserId, userId))
          : eq(changes.siteId, site.id),
      )
      .orderBy(changes.id)
      .then((rows) => rows.slice(-15));

    // Openstaand concept? Dan werken we daarin verder i.p.v. een nieuw te maken.
    // Demo: alleen het eigen concept van deze gebruiker (ieder een eigen sandbox).
    const openConcept = await db
      .select()
      .from(changes)
      .where(
        site.isDemo
          ? and(
              eq(changes.siteId, site.id),
              eq(changes.status, "concept"),
              eq(changes.clerkUserId, userId),
            )
          : and(eq(changes.siteId, site.id), eq(changes.status, "concept")),
      )
      .orderBy(changes.id)
      .then((rows) => rows.at(-1) ?? null);

    // Demo: persoonlijke branch + persoonlijke voorbeeld-site
    const { demoBranch, demoWorker } = await import("@/lib/demo");
    const eigenBranch = site.isDemo ? demoBranch(userId) : null;
    const wvNaam = site.isDemo
      ? demoWorker(site.githubRepo, userId)
      : site.siteSlug
        ? `wv-${site.siteSlug}`
        : null;

    // Foto's alvast laten beschrijven door een klein, snel model — parallel met
    // het ophalen van de site. Zo hoeft de site-AI ze niet één voor één te
    // openen (twintig leesrondes = minuten; parallel beschrijven = seconden).
    const fotoBelofte = afbeeldingen.length
      ? import("@/lib/foto-beschrijving").then((m) =>
          m.beschrijfFotos(afbeeldingen, req.signal),
        )
      : Promise.resolve({ beschrijvingen: [], kostenUsd: 0 });

    // SNELPAD: alvast (parallel met het ophalen van de site) herkennen of dit
    // bericht een pure, letterlijke tekstwissel is die zonder agent kan.
    const snelBelofte =
      afbeeldingen.length === 0 && documenten.length === 0 && !videoCommandId && !selectie && !kleur && !controle && fotobankPaden.length === 0
        ? classificeerTekstwissel(bericht).catch(() => null)
        : Promise.resolve(null);

    const encoder = new TextEncoder();
    streaming = true;
    const stream = new ReadableStream({
      async start(controller) {
        const stuur = (data: object) =>
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));

        let werkmap: string | null = null;
        // Stopwatch per fase, zodat we op feiten kunnen versnellen (zichtbaar in Vercel-logs)
        const klok = Date.now();
        const tijden: Record<string, number> = {};
        const tik = (fase: string) => {
          tijden[fase] = Math.round((Date.now() - klok) / 100) / 10;
        };
        try {
          // Neutraal openen: de oude conceptmededeling ("ik werk verder op
          // het concept") las als een antwoord dat niets met de vraag te
          // maken had ("mag ik een verhaaltje?"). Dat er een concept
          // openstaat ziet de eigenaar al aan de gele kaart (20-09).
          stuur({ type: "status", tekst: "Momentje..." });
          // Alleen bij een koude start (site nog niet in het geheugen) uitleggen
          // waarom het even duurt — bij vervolgvragen is dit binnen een seconde klaar
          const koudeStart = setTimeout(() => {
            stuur({
              type: "status",
              tekst: "Ik haal mijn nieuwste versie op...",
            });
          }, 2500);
          // Bijhalen van de hoofdversie: is er iets gepubliceerd terwijl dit
          // concept openstond (ander concept, WhatsApp), dan bouwt deze beurt
          // anders op een verouderde site en botst het pas bij publiceren
          // (gezien 19-09: geel gepubliceerd, oranje in het oude concept).
          // Botst het nu al, dan melden we dat meteen eerlijk.
          if (openConcept?.branch && !site.isDemo) {
            const uitkomst = await import("@/lib/github")
              .then((m) => m.mergeBranches(site.githubRepo, openConcept.branch!, "main"))
              .catch((e) => {
                // Bijhalen is een extraatje: lukt het niet (storing, afwijkende
                // branchnaam), dan werken we gewoon door op de oude stand.
                console.error("Hoofdversie bijhalen in concept mislukt:", e);
                return "al-bij" as const;
              });
            if (uitkomst === "samengevoegd")
              console.log(`Hoofdversie bijgehaald in concept ${openConcept.branch} (${site.githubRepo})`);
            if (uitkomst === "conflict") {
              const reply =
                "Terwijl dit concept openstond is er iets anders gepubliceerd dat dezelfde onderdelen raakt — ik kan de twee versies niet veilig samenvoegen, en publiceren zou hier ook op stuklopen. Gooi dit concept weg met de knop \"Weggooien\" en stuur je verzoek daarna opnieuw: dan bouw ik op de nieuwste versie van de site. Wat er in dit concept stond vervalt dan; noem het gerust in je nieuwe bericht, dan neem ik het meteen mee.";
              await db.insert(messages).values({
                siteId: site.id,
                rol: "assistent",
                tekst: reply,
                clerkUserId: userId,
              });
              stuur({
                type: "klaar",
                reply,
                previewUrl: openConcept.previewUrl ?? null,
                changeId: openConcept.id,
                bestanden: [],
                prompt: bericht,
              });
              return;
            }
          }
          // De basis-sha voor het vangnet hoeft niet te wachten op de werkmap:
          // beide zijn losse aanvragen aan GitHub, dus ze lopen naast elkaar.
          const basisShaBelofte = import("@/lib/cloudflare")
            .then((m) => m.commitShaVan(site.githubRepo, openConcept?.branch ?? undefined))
            .catch(() => null);
          if (openConcept?.branch) {
            werkmap = await laadWerkmap(site.githubRepo, openConcept.branch);
          } else if (eigenBranch) {
            // Demo: verder werken op de eigen sandbox-branch als die al bestaat
            werkmap = await laadWerkmap(site.githubRepo, eigenBranch).catch(
              () => laadWerkmap(site.githubRepo),
            );
          } else {
            werkmap = await laadWerkmap(site.githubRepo);
          }
          clearTimeout(koudeStart);
          const snapshot = await maakSnapshot(werkmap);
          // Basis voor het dubbeling-vangnet: de stand van de site aan het
          // BEGIN van deze beurt. Zonder sha zou een vervolgbeurt binnen een
          // concept met zichzelf vergelijken en nooit iets melden.
          const vangnetBasisSha: string | null = await basisShaBelofte;

          // SNELPAD: pure tekstwissel op precies één plek → direct vervangen,
          // geen agent. In seconden klaar in plaats van minuten.
          let snelpad: {
            reply: string;
            kostenUsd: number;
            tokensIn: number;
            tokensUit: number;
          } | null = null;
          {
            const wissel = await snelBelofte;
            const raak = wissel
              ? await pasTekstwisselToe(werkmap, wissel.oud, wissel.nieuw)
              : null;
            if (wissel && raak) {
              stuur({ type: "status", tekst: "Kleine tekstwissel — ik pas hem direct aan..." });
              const rel = raak.pad;
              if (/\.html?$/i.test(rel) && !rel.startsWith("delen/")) {
                const pad =
                  rel === "index.html"
                    ? "/"
                    : "/" + rel.replace(/index\.html$/, "").replace(/\.html?$/, "/");
                stuur({ type: "bewerkt", pad });
              }
              stuur({ type: "tekst-live", zoek: wissel.oud, vervang: wissel.nieuw });
              const label = (() => {
                const delen = raak.pad.split("/");
                const naam = delen.pop() ?? raak.pad;
                if (naam === "index.html")
                  return delen.length ? `de pagina ${delen[delen.length - 1]}` : "de homepage";
                return `de pagina ${naam.replace(/\.html?$/, "")}`;
              })();
              snelpad = {
                reply: `Ik heb "${wissel.oud}" veranderd in "${wissel.nieuw}" op ${label}.`,
                kostenUsd: wissel.kostenUsd,
                tokensIn: wissel.tokensIn,
                tokensUit: wissel.tokensUit,
              };
            }
          }

          // OVERAL DOORVOEREN: de eigenaar bevestigt een vangnet-melding.
          // Het vangnet weet al exact wát waar is blijven staan, dus dit
          // gebeurt mechanisch — geen AI-zoektocht die kan missen en daarna
          // "alles klopt" beweren. Alleen restjes zonder bekende nieuwe
          // tegenhanger krijgen één strak geïnstrueerde reparatiebeurt, en
          // het vangnet meet aan het eind van deze beurt sowieso opnieuw na.
          if (
            !snelpad &&
            bericht.trim() === "Overal doorvoeren" &&
            Array.isArray(openConcept?.vangnetVondsten) &&
            (openConcept.vangnetVondsten as unknown[]).length > 0
          ) {
            stuur({ type: "status", tekst: "Ik voer het overal door..." });
            const { voerVondstenDoor } = await import("@/lib/doorvoeren");
            const { alsPagina } = await import("@/lib/consistentie");
            const vondsten = openConcept.vangnetVondsten as import("@/lib/consistentie").VangnetVondst[];
            const uitkomst = await voerVondstenDoor(werkmap, vondsten);
            let herstelGedraaid = false;
            let herstelKosten = { kostenUsd: 0, tokensIn: 0, tokensUit: 0 };
            if (uitkomst.rest.length > 0) {
              const restS = maxDuurS - 80 - Math.round((Date.now() - klok) / 1000);
              if (restS >= 120) {
                const regels = uitkomst.rest.map(
                  (r) =>
                    `- In ${r.pad}: vervang ${r.vondst.soort === "beeld" ? `de afbeelding ${r.vondst.oud}` : `"${r.vondst.oud}"`}${
                      r.vondst.nieuw
                        ? ` door "${r.vondst.nieuw}"`
                        : " door de nieuwe versie zoals die nu op de zojuist gewijzigde pagina staat (kijk daar eerst)"
                    }`,
                );
                const herstel = await draaiChatAgent({
                  werkmap,
                  model: "claude-sonnet-5",
                  systeem: systeemPrompt(site.naam, site.richtlijnen, site.isDemo, site.githubRepo),
                  opdracht: `OVERAL DOORVOEREN (automatisch). De eigenaar heeft bevestigd dat deze achtergebleven restanten óók bijgewerkt moeten worden. Doe precies dit en verder niets:\n${regels.join(
                    "\n",
                  )}\n\nLet op: de aangehaalde tekst is genormaliseerd — in het bestand kan hij nét anders gespeld staan (witruimte, &nbsp;, aanhalingstekens). Lees het genoemde bestand en vervang daar de echte tekst. Antwoord met één korte zin.`,
                  budgetUsd: 0.15,
                  maxBeurten: 8,
                  maxDuurMs: 90_000,
                  opGebeurtenis: () => {},
                });
                herstelGedraaid = true;
                herstelKosten = { kostenUsd: herstel.kostenUsd, tokensIn: herstel.tokensIn, tokensUit: herstel.tokensUit };
              }
            }
            const regels = uitkomst.gedaan.map(
              (g) => `- "${g.oud}" → "${g.nieuw}" op ${alsPagina(g.pad)}${g.keer > 1 ? ` (${g.keer} plekken)` : ""}`,
            );
            const restZin =
              uitkomst.rest.length === 0
                ? ""
                : herstelGedraaid
                  ? regels.length
                    ? "\n\nDe overige plekken heb ik ook laten bijwerken; hieronder meld ik het als er tóch iets is blijven staan."
                    : " Hieronder meld ik het als er tóch iets is blijven staan."
                  : `\n\nLet op: ${uitkomst.rest.length} plek${uitkomst.rest.length === 1 ? "" : "ken"} kon ik nu niet automatisch bijwerken — vraag het gerust in een volgend bericht.`;
            snelpad = {
              reply:
                (regels.length
                  ? `Ik heb het overal doorgevoerd:\n${regels.join("\n")}`
                  : `Ik heb het overal doorgevoerd (${[...new Set(uitkomst.rest.map((r) => alsPagina(r.pad)))].slice(0, 4).join(", ")}).`) + restZin,
              kostenUsd: herstelKosten.kostenUsd,
              tokensIn: herstelKosten.tokensIn,
              tokensUit: herstelKosten.tokensUit,
            };
          }

          // Audiobank: alleen als het bericht over audio gaat de lijst ophalen
          // (situationeel — de vaste prompt blijft licht). De bestanden staan
          // in de media-map in R2, niet in de werkmap.
          let audioBank: string[] | null = null;
          // Ook triggeren als het RECENTE gesprek over audio ging: na een
          // upload zegt de eigenaar vaak alleen wáár hij moet komen ("naast
          // de kop X"), zonder het woord audio te herhalen.
          const recentOverAudio = historie
            .slice(-4)
            .some((m) => /\/audio\/|audiobank/i.test(m.tekst));
          if (
            !site.isDemo &&
            site.siteSlug &&
            !snelpad &&
            (recentOverAudio ||
              /audio|podcast|aflever|spreek|opname|\.(mp3|m4a|aac|ogg|wav)\b/i.test(bericht))
          ) {
            const { lijstAudio } = await import("@/lib/media");
            audioBank = await lijstAudio(site.siteSlug).catch(() => null);
          }

          // Videobank, zelfde recept: sinds video's in de media-opslag staan
          // (en niet meer als chip aan het bericht hangen zodra de bank ze
          // heeft) moet de AI bij "zet deze video op ..." de paden kennen.
          let videoBank: string[] | null = null;
          const recentOverVideo = historie
            .slice(-4)
            .some((m) => /\/video\/|videobank/i.test(m.tekst));
          if (
            !site.isDemo &&
            site.siteSlug &&
            !snelpad &&
            !videoCommandId &&
            (recentOverVideo || /video|film|\.(mp4|webm|mov)\b/i.test(bericht))
          ) {
            const { lijstMediaVideo } = await import("@/lib/media");
            videoBank = await lijstMediaVideo(site.siteSlug)
              .then((r) => r.map((v) => v.naam))
              .catch(() => null);
          }

          // Gekozen fotobank-foto's: kwaliteit meten zodat de AI gewaarschuwd is
          const fotobankKwaliteit: string[] = [];
          if (fotobankPaden.length > 0) {
            const { meetFotoKwaliteit, kwaliteitsWaarschuwing } = await import("@/lib/foto-kwaliteit");
            for (const pad of fotobankPaden) {
              const w = kwaliteitsWaarschuwing(
                await meetFotoKwaliteit(
                  await readFile(path.join(werkmap, pad)).catch(() => Buffer.alloc(0)),
                ),
              );
              if (w) fotobankKwaliteit.push(fotobankPaden.length > 1 ? `${pad}: ${w}` : w);
            }
          }

          if (afbeeldingen.length > 3)
            stuur({
              type: "status",
              tekst: `Ik bekijk je ${afbeeldingen.length} foto's...`,
            });
          const { beschrijvingen: fotoBeschrijvingen, kostenUsd: fotoKosten } =
            await fotoBelofte;
          if (fotoKosten > 0)
            await settleAiBudget(scope, maand, 0, fotoKosten).catch(() => {});

          const siteOverzicht = snelpad ? "" : await maakSiteOverzicht(werkmap);
          tik("voorbereid");

          for (const foto of afbeeldingen) {
            const doel = path.join(werkmap, foto.naam);
            await mkdir(path.dirname(doel), { recursive: true });
            await writeFile(doel, foto.data);
          }
          // Meegestuurde foto's meteen veiligstellen in de fotobank, vóórdat
          // de AI begint. Breekt de beurt af (platformgrens, storing), dan is
          // de upload niet voor niets geweest: de foto staat er nog en de
          // eigenaar hoeft hem niet opnieuw te sturen. Zelfde principe als bij
          // audio en video: eerst bewaren, dan pas verwerken.
          // Naast de AI-beurt, niet ervoor: de eigenaar hoeft niet te wachten
          // op het veiligstellen, en bij een afgebroken beurt is het allang
          // gebeurd (een push duurt seconden, een beurt minuten).
          const fotosVeilig =
            afbeeldingen.length > 0 && !site.isDemo
              ? (async () => {
                  const { pushBestanden } = await import("@/lib/github");
                  const teBewaren = afbeeldingen.map((f) => ({ pad: f.naam, inhoud: f.data }));
                  for (const tak of openConcept?.branch ? ["main", openConcept.branch] : ["main"])
                    await pushBestanden(
                      site.githubRepo,
                      teBewaren,
                      "Meegestuurde foto's bewaard in de fotobank",
                      tak,
                    );
                })().catch((e) => console.error("Foto's vooraf bewaren:", e))
              : Promise.resolve();

          // Meegestuurde documenten wegschrijven, maar niet als de documentmap
          // daarmee over de grens gaat: een site moet klein en snel blijven.
          let documentenVol = false;
          if (documenten.length > 0) {
            const { stat, readdir } = await import("node:fs/promises");
            const map = path.join(werkmap, DOCUMENTEN_MAP);
            const bestaandeBytes = await readdir(map)
              .then(async (namen) =>
                (
                  await Promise.all(
                    namen.map((n) =>
                      stat(path.join(map, n))
                        .then((s) => (s.isFile() ? s.size : 0))
                        .catch(() => 0),
                    ),
                  )
                ).reduce((a, b) => a + b, 0),
              )
              .catch(() => 0);
            const nieuweBytes = documenten.reduce((a, d) => a + d.data.length, 0);
            if (bestaandeBytes + nieuweBytes > MAX_DOCUMENTEN_TOTAAL_BYTES) {
              documentenVol = true;
            } else {
              await mkdir(map, { recursive: true });
              for (const doc of documenten) {
                await writeFile(path.join(werkmap, doc.naam), doc.data);
              }
            }
          }

          // "Klopt niet, kijk zelf even": schermafbeelding van precies wat de
          // eigenaar nu ziet (zelfde pagina, zelfde apparaat), zodat de AI zijn
          // eigen werk kan beoordelen in plaats van blind te raden
          let controleRegel: string | null = null;
          if (controle) {
            stuur({ type: "status", tekst: "Ik maak een schermafbeelding van wat jij nu van mij ziet..." });
            const pad = huidigePagina && huidigePagina.startsWith("/") ? huidigePagina : "/";
            const host =
              openConcept && wvNaam
                ? `${wvNaam}.${CF_SUBDOMEIN}.workers.dev`
                : (site.domein ?? `${site.siteSlug}.${CF_SUBDOMEIN}.workers.dev`);
            try {
              const { maakSchermafbeelding, knipInDelen } = await import("@/lib/schermafbeelding");
              const { CONTROLE_MAP } = await import("@/lib/werkmap");
              const png = await maakSchermafbeelding(`https://${host}${pad}`, apparaat);
              const delen = await knipInDelen(png);
              await mkdir(path.join(werkmap, CONTROLE_MAP), { recursive: true });
              const paden: string[] = [];
              for (let i = 0; i < delen.length; i++) {
                const rel = `${CONTROLE_MAP}/scherm-${i + 1}.png`;
                await writeFile(path.join(werkmap, rel), delen[i]);
                paden.push(rel);
              }
              controleRegel = `De eigenaar heeft op de knop "Klopt niet, kijk zelf even" gedrukt. Hieronder staan schermafbeeldingen van wat hij NU ziet op pagina ${pad} (${apparaat}-weergave), van boven naar beneden: ${paden.join(", ")}. BEKIJK ze eerst allemaal met lees_bestand. Vergelijk wat je ziet met wat je in je vorige antwoord beweerde te hebben gedaan. Benoem concreet en eerlijk wat er niet klopt (verkeerde kleur, onzichtbaar element, verkeerde plek, niets veranderd) en herstel het in de bestanden. Zie je echt niets mis? Zeg dat dan eerlijk, beschrijf kort wat jij ziet, en vraag wat de eigenaar anders verwacht. Plaats deze schermafbeeldingen NOOIT op de site en noem hun bestandsnamen niet in je antwoord.`;
            } catch (e) {
              console.error("Schermafbeelding mislukt:", e);
              controleRegel = `De eigenaar heeft op de knop "Klopt niet, kijk zelf even" gedrukt, maar de schermafbeelding kon niet gemaakt worden. Lees de bestanden die je bij je vorige wijziging aanpaste nog eens kritisch na (kleuren die niet bestaan, selectors die nergens op slaan, ontbrekende CSS-variabelen), herstel wat je vindt, en vraag anders kort en concreet wat er niet klopt en op welke plek.`;
            }
          }

          // Gecomprimeerde video (via Rendi) ophalen en in de site zetten
          const haalBinair = async (url: string): Promise<Buffer> => {
            // Met tijdslimiet: een gestrande download hield anders de hele
            // beurt vast tot de platform-kill, zonder melding (20-09)
            const ab = await fetch(url, { signal: AbortSignal.timeout(120_000) }).then((r) => r.arrayBuffer());
            return Buffer.from(ab as ArrayBuffer);
          };
          const videoPaden: { video: string; poster: string | null } | null =
            await (async () => {
              if (!videoCommandId) return null;
              const { rendiStatus } = await import("@/lib/rendi");
              const st = await rendiStatus(videoCommandId).catch(() => null);
              const v = st?.output_files?.out_1?.storage_url;
              if (!v) return null;
              const ruweNaam = v.split("/").pop()?.split("?")[0] ?? "";
              const naam = /^[a-z0-9-]+\.mp4$/i.test(ruweNaam)
                ? ruweNaam
                : `video-${Date.now().toString(36)}.mp4`;
              const videoPad = `video/${naam}`;
              // De video zelf gaat naar de media-opslag, niet in de site: hij
              // wordt op /video/<naam> geserveerd en hoeft dus niet bij elke
              // chatbeurt mee opgehaald te worden. (Is hij daar al — de
              // gewone weg sinds de videobank — dan schrijven we hem
              // eenvoudig nog eens; dat kost niets en houdt deze weg werkend
              // voor beurten waarin de eigenaar de video direct meestuurt.)
              if (site.siteSlug) {
                const { bewaarMediaVideo } = await import("@/lib/media");
                await bewaarMediaVideo(site.siteSlug, naam, await haalBinair(v)).catch((e) =>
                  console.error("Video in media-opslag bewaren:", e),
                );
              }
              let posterPad: string | null = null;
              const p = st?.output_files?.out_2?.storage_url;
              if (p) {
                posterPad = `video/${naam.replace(/\.mp4$/, "")}-poster.jpg`;
                await writeFile(
                  path.join(werkmap!, posterPad),
                  await haalBinair(p),
                );
              }
              return { video: videoPad, poster: posterPad };
            })();

          const contextRegels = [
            siteOverzicht,
            site.chatGeheugen
              ? `Geheugen van eerdere gesprekken met deze eigenaar:\n${site.chatGeheugen}`
              : null,
            logboek.length > 0
              ? `Wijzigingslogboek van deze site (nieuwste onderaan):\n${logboek
                  .map(
                    (c) =>
                      `- ${c.aangemaakt.toLocaleDateString("nl-NL")} [${c.status}] "${c.promptTekst.slice(0, 120)}" → ${(Array.isArray(c.bestanden) ? (c.bestanden as string[]) : []).join(", ")}`,
                  )
                  .join(
                    "\n",
                  )}\nGebruik dit om verzoeken als "zet dat weer terug" of "zoals vóór de feestdagen" precies te begrijpen: je weet wat er wanneer veranderd is en in welke bestanden.`
              : null,
            historie.length > 1
              ? `Eerdere gespreksgeschiedenis:\n${historie
                  .slice(0, -1)
                  .map(
                    (m) =>
                      `${m.rol === "klant" ? "Eigenaar" : "Jij"}: ${m.tekst}`,
                  )
                  .join("\n")}`
              : null,
            huidigePagina && huidigePagina !== "/"
              ? `De eigenaar bekijkt op dit moment de pagina ${huidigePagina} — "deze pagina" verwijst daarnaar.`
              : null,
            doorvoerWaarschuwing
              ? `De eigenaar drukte op de knop "Overal doorvoeren". Die knop hoort bij deze eerdere waarschuwing van het dubbeling-vangnet:\n${doorvoerWaarschuwing}\nWerk ÉLKE daar genoemde plek bij zodat de tekst of foto overal weer exact gelijk is aan de nieuwste versie — verzin geen andere wijzigingen.`
              : null,
            kleur
              ? `De eigenaar heeft met de kleurkiezer een kleur gekozen: ${kleur}. Gebruik EXACT deze kleurcode voor wat hij in het bericht vraagt (en pas waar logisch ook hover-/accentvarianten aan zodat het consistent blijft).`
              : null,
            fotobankPaden.length > 0
              ? `De eigenaar heeft in de fotobank ${fotobankPaden.length === 1 ? `de foto "${fotobankPaden[0]}"` : `deze ${fotobankPaden.length} foto's`} gekozen — zijn bericht gaat over ${fotobankPaden.length === 1 ? "déze foto" : `déze foto's: ${fotobankPaden.map((p) => `"${p}"`).join(", ")}`}. ${fotobankPaden.length === 1 ? "Het bestand staat" : "De bestanden staan"} al in de werkmap (BEKIJK ze eerst met lees_bestand); plaats of gebruik ze zoals gevraagd en vraag nooit om ze opnieuw te sturen.${fotobankKwaliteit.length > 0 ? ` LET OP: ${fotobankKwaliteit.join("; ")} — beoordeel bij het bekijken of dit geschikt is voor de gevraagde plek en waarschuw anders kort met een alternatief.` : ""}`
              : null,
            selectie
              ? `De eigenaar heeft in het voorbeeld een onderdeel AANGEWEZEN — het bericht gaat over precies dit element op pagina ${selectie.pad ?? "/"}:\n<${selectie.tag ?? "element"}> met tekst "${(selectie.tekst ?? "").slice(0, 200)}"\nHTML: ${(selectie.html ?? "").slice(0, 1500)}\nZoek dit element op in het bijbehorende bestand en pas dáár aan wat gevraagd wordt.`
              : null,
            videoPaden
              ? `De eigenaar heeft een VIDEO meegestuurd; die is al gecomprimeerd voor het web en staat op ${videoPaden.video}${videoPaden.poster ? ` met poster-afbeelding ${videoPaden.poster}` : ""}. Plaats hem waar het bericht om vraagt. BEKIJK eerst de poster (lees_bestand) om de verhouding te zien (staand/liggend/vierkant). Houd de bestaande kaders van de site aan — consistentie gaat voor; past de verhouding niet, plaats hem dan gewoon maar zeg er eerlijk bij dat er wordt bijgesneden (niet doen alsof alles past). Als achtergrond/hero-video: <video autoplay muted loop playsinline preload="metadata"${videoPaden.poster ? ` poster="/${videoPaden.poster}"` : ""}> met <source src="/${videoPaden.video}" type="video/mp4">, netjes gepositioneerd achter de tekst, en respecteer prefers-reduced-motion (dan alleen de poster). Als gewone video op een pagina: <video controls preload="metadata" poster=...>. Verwijder een eventuele oude hero-video-verwijzing die hij vervangt, maar laat het oude bestand staan.`
              : null,
            audioBank && audioBank.length > 0
              ? `AUDIOBANK van deze site (podcasts/audio): ${audioBank.map((n) => `/audio/${n}`).join(", ")}. Deze bestanden staan NIET in de werkmap — ze worden apart geserveerd op precies deze /audio/-adressen; kopieer of verplaats ze nooit en open ze niet met lees_bestand. Vraagt de eigenaar om audio te plaatsen, zet dan een nette speler neer in de stijl van de site: <audio controls preload="metadata" src="/audio/bestandsnaam"></audio>, met een kop of korte tekst erbij (bijv. de titel van de aflevering). Verwijderen van de bestanden zelf kan alleen via de audiobank in het portaal — verwijs daarnaar als daarom wordt gevraagd.`
              : audioBank !== null && audioBank.length === 0
                ? `Het bericht gaat mogelijk over audio, maar de audiobank van deze site is leeg. Vraag de eigenaar het bestand via 📎 → Audio/podcast mee te sturen (mp3 of m4a, tot 150 MB); verzin nooit zelf een audio-adres.`
                : null,
            videoBank && videoBank.length > 0
              ? `VIDEOBANK van deze site (media-opslag): ${videoBank.map((n) => `/video/${n}`).join(", ")}. Deze videobestanden staan NIET in de werkmap — ze worden apart geserveerd op precies deze /video/-adressen; kopieer of verplaats ze nooit, open ze niet met lees_bestand en "repareer" een verwijzing ernaar nooit omdat het bestand in de werkmap lijkt te ontbreken. Hoort er een poster bij, dan staat die wél in de werkmap als video/<naam>-poster.jpg — gebruik hem. Plaatsen doe je zoals in de video-huisregel: als achtergrond <video autoplay muted loop playsinline preload="metadata" poster=...> met <source src="/video/<naam>" type="video/mp4">, als gewone video <video controls preload="metadata" poster=...>. Zegt de eigenaar "deze video" zonder naam, kijk dan in het recente gesprek welke zojuist in de videobank is gezet. LET OP DE VERHOUDING: bekijk eerst de poster (lees_bestand) om te zien of de video staand, liggend of vierkant is. Houd bij het plaatsen ALTIJD de bestaande kaders en het stramien van de site aan — consistentie gaat voor, dus pas een kader alleen aan als de eigenaar daar zelf om vraagt. Past de verhouding niet in het kader, plaats hem dan gewoon (object-fit: cover snijdt bij), maar zeg er eerlijk bij dát er wordt bijgesneden en dat de eigenaar kan vragen om het anders te doen — niet doen alsof alles past. Verwijderen van de bestanden zelf kan alleen via de videobank in het portaal.`
              : null,
            afbeeldingen.length > 1
              ? `De eigenaar heeft ${afbeeldingen.length} foto's meegestuurd; ze staan al klaar in de werkmap (geoptimaliseerd, max 1600px breed) en zijn voor je bekeken — hieronder staat per foto wat erop te zien is:\n${afbeeldingen
                  .map((a) => {
                    const b = fotoBeschrijvingen.find((x) => x.naam === a.naam);
                    return `- ${a.naam}: ${b?.beschrijving ?? "(nog niet bekeken)"}${a.kwaliteit ? ` [LET OP: ${a.kwaliteit}]` : ""}`;
                  })
                  .join("\n")}\nGebruik deze beschrijvingen voor je alt-teksten en om te bepalen welke foto waar past. Open ze NIET met lees_bestand — dat kost de eigenaar onnodig veel wachttijd; alleen als je over één specifieke foto echt twijfelt mag je die ene openen. Staat er een LET OP bij een foto, beoordeel dan of hij te onscherp of te klein is voor de gevraagde plek — zo ja, plaats hem niet stilzwijgend groot maar waarschuw kort en bied een keuze (kleiner plaatsen, een scherpere foto uit de fotobank, of een nieuwe foto vragen). Gaat het om een verzameling (portfolio, galerij, projecten, "ons werk")? Behandel dit dan als iets NIEUWS volgens de webdesigner-regel: stel eerst je vragen mét KEUZES-regel — aparte pagina of sectie op een bestaande pagina? menu-item en waar? wil de eigenaar een titel/tekstje per foto (stel er per foto zelf één voor op basis van wat je op de foto ziet), of alleen de foto's? Bouw daarna het geheel in de stijl van de site, met alt-teksten per foto.`
              : afbeeldingen.length === 1
                ? `De eigenaar heeft een afbeelding meegestuurd; die staat op het pad ${afbeeldingen[0].naam} (geoptimaliseerd, max 2000px breed). BEKIJK hem eerst met lees_bestand. Bepaal uit het bericht wat de bedoeling is: (a) een foto om op de site te plaatsen — zet hem dan op de gevraagde plek met een passende alt-tekst; (b) een VOORBEELD van hoe iets eruit moet zien (schets, screenshot van een andere site, gewenste stijl) — bouw na wat er te zien is en plaats de afbeelding zelf NIET op de site; of (c) een SCREENSHOT VAN DE EIGEN SITE waarop iets niet goed staat (scheve uitlijning, verkeerde kleur, kapotte sectie) — herken om welke pagina en welk onderdeel het gaat, zoek die plek op in de bestanden en los precies dát probleem op; ook hier de afbeelding NIET plaatsen.`
                : null,
            documenten.length > 0 && documentenVol
              ? `De eigenaar heeft ${documenten.length === 1 ? "een document" : `${documenten.length} documenten`} meegestuurd, maar de documentenmap van deze site zit vol (grens: ${MAX_DOCUMENTEN_TOTAAL_BYTES / 1024 / 1024} MB). Het bestand is NIET opgeslagen. Zeg dat eerlijk en vriendelijk, noem welke documenten er nu op de site staan (zie de plattegrond) en stel voor om er eerst een paar weg te halen die niet meer nodig zijn, of om contact op te nemen met WordSwap voor meer ruimte. Doe verder niets met het document.`
              : documenten.length > 0
                ? `De eigenaar heeft ${documenten.length === 1 ? "een document" : `${documenten.length} documenten`} meegestuurd (pdf). ${documenten.length === 1 ? `Het staat op ${documenten[0].naam} (${documenten[0].kb} kB).` : `Ze staan op: ${documenten.map((d) => `${d.naam} (${d.kb} kB)`).join(", ")}.`} Open een pdf NOOIT met lees_bestand — dat is een binair bestand en levert onleesbare tekens op; je hoeft de inhoud niet te kennen. Wat je wél doet:
1. Weet je uit het bericht waar het document moet komen (bijvoorbeeld "zet de vacature op de vacaturepagina")? Zet er dan een duidelijke downloadlink neer, in de stijl van de site: <a href="/${documenten[0].naam}" target="_blank" rel="noopener">Download de vacature (PDF, ${documenten[0].kb} kB)</a>. Altijd beschrijvende linktekst (nooit "klik hier" of alleen de bestandsnaam), altijd het soort bestand en de grootte erbij, en altijd in een nieuw tabblad.
2. Staat er niet bij waar het heen moet? Vraag dat dan kort, met een KEUZES-regel met de meest logische plekken (bestaande pagina's uit de plattegrond, of een nieuwe pagina). Het bestand blijft gewoon bewaard — vraag NOOIT om het opnieuw mee te sturen.
3. Gaat het om een vacature, en staat er nog geen vacaturepagina op de site? Dan mag je één keer voorstellen om de tekst óók als gewone webpagina te zetten (beter vindbaar in Google, prettiger op mobiel) met de pdf als download erbij. De eigenaar beslist; hij hoeft het niet, en je dringt niet aan.
4. Kan het document persoonsgegevens van anderen bevatten (een ingevuld formulier, een lijst met namen, een cv, een offerte)? Waarschuw dan kort dat alles op de site voor iedereen te downloaden is, en vraag of hij dat zeker weet vóór je het plaatst.`
                : null,
            openConcept
              ? `Je werkt verder aan een openstaand concept. Eerder in dit concept gewijzigd: ${(Array.isArray(openConcept.bestanden) ? (openConcept.bestanden as string[]) : []).join(", ") || "(onbekend)"} — vervolgverzoeken over "de video", "die knop" e.d. slaan waarschijnlijk op die eerdere wijziging; kijk daar eerst.`
              : null,
            controleRegel,
            kanaal === "whatsapp"
              ? `DIT BERICHT KOMT VIA WHATSAPP, niet via het portaal. De eigenaar zit op zijn telefoon in WhatsApp en ziet GEEN websitevoorbeeld, GEEN gele conceptbalk en GEEN enkele knop van het portaal — noem die dus niet en verwijs er nooit naar. Wat hij wél krijgt: na jouw antwoord stuurt WordSwap automatisch een link naar het concept met de knoppen "Publiceren" en "Weggooien" in WhatsApp; hij kan ook gewoon "publiceer" terugappen. Zeg dat niet in elk bericht; alleen als hij ernaar vraagt hoe hij iets live zet. WAT JE HIER GEWOON DOET (niet doorverwijzen, gewoon bouwen): tekst, openingstijden, prijzen, foto's, knoppen en links, contactgegevens, een nieuw project of nieuwsbericht, een nieuwe pagina met menu-item, én ook kleuren en lettertypes over de hele site. Een andere uitstraling mag de eigenaar hier gerust proberen.
BIJ EEN ECHT GROTE VERBOUWING (de hele website omgooien, een compleet nieuw ontwerp, alles tegelijk anders): begin met ÉÉN duidelijke stap die je nu kunt doen — bijvoorbeeld de kleuren, of alleen de homepage — en zeg er in één zin bij dat WordSwap de hele website kan oppakken als hij echt een nieuwe uitstraling wil, zodat het overal net en consistent blijft. Sluit dan af met een KEUZES-regel waarvan de eerste keuze letterlijk "Ja, laat WordSwap contact opnemen" is (precies deze tekst, daarmee geven we het door), naast een keuze om hier stap voor stap verder te gaan. Dring niet aan en herhaal het aanbod niet elk bericht.
Houd je antwoord kort — het leest op een telefoonscherm. Een KEUZES-regel mag gewoon: die wordt in WhatsApp een keuzelijst.`
              : null,
            // Eigen webadressen: vraagt de eigenaar om "de link", dan kan de AI die geven
            !site.isDemo && (site.domein || site.siteSlug)
              ? `Jouw webadressen (geef ze letterlijk als de eigenaar om de link of het adres van zijn site of concept vraagt): live staat de site op https://${(site.domein ?? `${site.siteSlug}.${CF_SUBDOMEIN}.workers.dev`).replace(/^https?:\/\//, "").replace(/\/$/, "")}${openConcept && wvNaam ? `; het openstaande concept (nog niet live) bekijk je op https://${wvNaam}.${CF_SUBDOMEIN}.workers.dev` : ""}.`
              : null,
            `Verzoek van de eigenaar: ${bericht}`,
          ].filter(Boolean);

          await assertNoSymlinks(werkmap);
          let reply = "";
          let limietBereikt = false;
          // Riskante inline-layout vóór deze beurt (zie lib/mobiel-check)
          let mobielVoor: Set<string> | null = null;
          let cacheGelezen = 0;
          // Stoppen: als de eigenaar de chat afbreekt, stopt ook de agent
          const stopper = new AbortController();
          req.signal.addEventListener("abort", () => stopper.abort());
          slotKwijt.signal.addEventListener("abort", () => stopper.abort());
          // TIJDBEWAKER: Vercel kapt de functie hard af op maxDuration (300 s)
          // — dan gaat álles verloren: geen antwoord, geen concept, en
          // meegestuurde foto's kwijt. Daarom stoppen we de agent zelf ruim
          // op tijd, leveren we op wat er al staat, en zeggen we dat eerlijk.
          let tijdOp = false;
          // DEMOWACHTER: de demo wordt elk uur teruggezet. Zat er iemand
          // midden in een opdracht, dan werkte die door aan een tak die niet
          // meer bestond en bleef bij hem "De AI is bezig" eeuwig staan. Juist
          // bij een demo is dat de bezoeker die je binnen wilde halen.
          // De reset zet een stempel; zien we die, dan stoppen we meteen en
          // zeggen we wat er gebeurd is.
          let demoVerversd = false;
          const startTijd = Date.now();
          const demoWachter = site.isDemo
            ? setInterval(async () => {
                try {
                  const [rij] = await db
                    .select({ op: sites.demoResetOp })
                    .from(sites)
                    .where(eq(sites.id, site.id));
                  if (rij?.op && new Date(rij.op).getTime() > startTijd) {
                    demoVerversd = true;
                    stopper.abort();
                  }
                } catch {
                  // Even geen verbinding: volgende ronde weer proberen
                }
              }, 8000)
            : null;
          const wekker = setTimeout(
            () => {
              tijdOp = true;
              stopper.abort();
            },
            Math.max(30_000, (maxDuurS - 80) * 1000 - (Date.now() - klok)),
          );
          // Pagina's die in deze beurt nieuw worden geschreven bestaan op de
          // uitgerolde werkversie nog niet: daar alvast naartoe springen geeft
          // een verwarrende 404. De opleveringsoverlay opent ze wél, na de deploy.
          const nieuwDezeBeurt = new Set<string>();
          // Loopt mee met elke werkstap, zodat een herhaalde stap ("Ik zoek waar
          // het staat...") toch zichtbaar verandert en de eigenaar ziet dat er
          // vooruitgang is in plaats van een bevroren melding.
          let stapTeller = 0;
          if (snelpad) {
            reply = snelpad.reply;
            await settleAiBudget(scope, maand, requestBudgetUsd, snelpad.kostenUsd);
            const { registreerAiKosten } = await import("@/lib/kosten");
            await registreerAiKosten(site.id, "chat", {
              tokensIn: snelpad.tokensIn,
              tokensUit: snelpad.tokensUit,
              kostenUsd: snelpad.kostenUsd,
            }).catch((e) => console.error("Kostenregistratie mislukt:", e));
          } else
          try {
            const { mobielRisicos } = await import("@/lib/mobiel-check");
            mobielVoor = await mobielRisicos(werkmap).catch(() => null);
            const uitkomst = await draaiChatAgent({
              werkmap,
              // Ook de demo draait op Sonnet. Het snelle model was goedkoper,
              // maar liet het product slechter zien dan het is: op een klus
              // van een paar bestanden ging het zoeken en kostte het negentien
              // stappen, terwijl een klant hetzelfde in een paar stappen ziet
              // gebeuren. Een demo die traag oogt kost meer dan hij bespaart.
              model: "claude-sonnet-5",
              systeem: systeemPrompt(
                site.naam,
                site.richtlijnen,
                site.isDemo,
                site.githubRepo,
              ),
              opdracht: contextRegels.join("\n\n"),
              // Zelfde harde kap als de nacontroles: de wekker breekt op tijd
              // af, maar één hangende aanroep die het signaal niet voelt kon
              // daar dwars doorheen (EVC 26-09, stap 27 die minutenlang stond)
              maxDuurMs: Math.max(60_000, (maxDuurS - 80) * 1000),
              budgetUsd: requestBudgetUsd,
              signal: stopper.signal,
              opGebeurtenis: (g) => {
                if (g.soort === "tekst") {
                  stuur({ type: "tekst-delta", tekst: g.delta });
                  return;
                }
                if (g.soort === "toolStart") {
                  const maker = STATUS_BIJ_START[g.naam];
                  if (maker)
                    stuur({
                      type: "status",
                      // Geen nieuw stapnummer: dit is dezelfde stap, alleen
                      // eerder gemeld dan toen hij werd uitgevoerd.
                      tekst: `${maker(g.pad)} (stap ${stapTeller + 1})`,
                    });
                  return;
                }
                if (g.soort === "denkt") {
                  // Denkronde tussen twee stappen: even geen gereedschap, wel
                  // wachttijd. Zonder deze melding lijkt de vorige stap te hangen.
                  stuur({
                    type: "status",
                    tekst: `Ik denk na over de volgende stap... (stap ${++stapTeller})`,
                  });
                  return;
                }
                const maker = STATUS_PER_TOOL[g.naam];
                if (maker)
                  stuur({
                    type: "status",
                    tekst: `${maker(g.invoer)} (stap ${++stapTeller})`,
                  });
                if (g.naam === "bewerk_bestand" || g.naam === "schrijf_bestand") {
                  const rel = String(g.invoer.pad ?? "").replace(/^\/+/, "");
                  if (g.naam === "schrijf_bestand") nieuwDezeBeurt.add(rel);
                  // Pagina die bewerkt wordt meesturen: het voorbeeld springt
                  // er live naartoe, zodat je ziet wáár de wijziging landt —
                  // maar alleen naar pagina's die al online staan.
                  if (/\.html?$/i.test(rel) && !rel.startsWith("delen/") && !nieuwDezeBeurt.has(rel)) {
                    const pad =
                      rel === "index.html"
                        ? "/"
                        : "/" +
                          rel
                            .replace(/index\.html$/, "")
                            .replace(/\.html?$/, "/");
                    stuur({ type: "bewerkt", pad });
                  }
                  // Realtime: de tekstwijziging alvast in het voorbeeld laten
                  // zien (de echte versie volgt zodra de deploy klaar is)
                  if (g.naam === "bewerk_bestand") {
                    const kaal = (t: string) =>
                      t
                        .replace(/<[^>]+>/g, " ")
                        .replace(/\s+/g, " ")
                        .trim();
                    const zoek = kaal(String(g.invoer.zoek ?? ""));
                    const vervang = kaal(String(g.invoer.vervang ?? ""));
                    if (
                      zoek.length >= 8 &&
                      zoek.length <= 400 &&
                      vervang.length <= 600 &&
                      zoek !== vervang
                    ) {
                      stuur({ type: "tekst-live", zoek, vervang });
                    } else if (zoek.length >= 8) {
                      // Te groot voor een live tekstwissel, maar wél laten zien
                      // wáár gewerkt wordt: het voorbeeld scrollt mee en licht op.
                      stuur({ type: "tekst-live-plek", zoek: zoek.slice(0, 60) });
                    }
                  }
                }
              },
            });
            reply = uitkomst.reply;
            limietBereikt = uitkomst.limietBereikt;
            cacheGelezen = uitkomst.cacheGelezen;
            await settleAiBudget(
              scope,
              maand,
              requestBudgetUsd,
              uitkomst.kostenUsd,
            );
            const { registreerAiKosten } = await import("@/lib/kosten");
            await registreerAiKosten(site.id, "chat", {
              tokensIn: uitkomst.tokensIn,
              tokensUit: uitkomst.tokensUit,
              kostenUsd: uitkomst.kostenUsd,
            }).catch((e) => console.error("Kostenregistratie mislukt:", e));
          } catch (e) {
            if (demoVerversd) {
              // De demo is onder deze opdracht weggehaald. Niets opslaan, maar
              // wel zeggen wat er is: stil stoppen laat de bezoeker wachten op
              // een antwoord dat nooit komt.
              stuur({
                type: "klaar",
                reply: "De demo is zojuist ververst, dat gebeurt elk uur automatisch. Je opdracht is daardoor gestopt en de site staat weer op het begin. Stuur hem gerust opnieuw, dan pak ik hem meteen op.",
                previewUrl: null,
                changeId: null,
                bestanden: [],
                prompt: bericht,
              });
              return;
            }
            if (stopper.signal.aborted && !tijdOp) {
              // (ook bij een weggehaald slot: niets opslaan, geen concept)
              // Gestopt door de eigenaar: niets opslaan, geen concept maken
              return;
            }
            if (!tijdOp) throw e;
            stuur({
              type: "status",
              tekst: "Dit is een grote klus — ik zet alvast klaar wat er al staat...",
            });
            reply =
              "Dit was een grote klus en ik liep tegen mijn tijdslimiet aan. Wat ik al af had, zet ik nu voor je klaar — bekijk het gerust. Stuur daarna gewoon een berichtje als er iets mist of af te maken valt, dan ga ik verder waar ik gebleven ben.";
          }
          clearTimeout(wekker);
          if (demoWachter) clearInterval(demoWachter);
          if (demoVerversd) {
            stuur({
              type: "klaar",
              reply: "De demo is zojuist ververst, dat gebeurt elk uur automatisch. Je opdracht is daardoor gestopt en de site staat weer op het begin. Stuur hem gerust opnieuw, dan pak ik hem meteen op.",
              previewUrl: null,
              changeId: null,
              bestanden: [],
              prompt: bericht,
            });
            return;
          }
          if (slotKwijt.signal.aborted) return;
          if (stopper.signal.aborted && !tijdOp) return;
          tik("ai");

          // Mobiel-controle: heeft deze beurt kolommen of vaste breedtes direct in de HTML gezet?
          // Die winnen van de media queries in de stylesheet en maken de pagina op een telefoon
          // te breed. Dan één korte herstelbeurt, vóórdat het concept klaarstaat.
          // Alleen als er ruim tijd over is (zelfde bewaking als de afspraken-poort):
          // een krappe WhatsApp-beurt slaat dit over in plaats van eroverheen te gaan.
          const restVoorHerstelS = () => maxDuurS - 80 - Math.round((Date.now() - klok) / 1000);
          if (mobielVoor && !snelpad && !tijdOp && !limietBereikt && !stopper.signal.aborted && restVoorHerstelS() >= 120) {
            try {
              const { mobielRisicos, nieuweRisicos } = await import("@/lib/mobiel-check");
              const nieuw = nieuweRisicos(mobielVoor, await mobielRisicos(werkmap));
              if (nieuw.length > 0) {
                stuur({ type: "status", tekst: "Ik controleer of het ook goed staat op een telefoon..." });
                const herstel = await draaiChatAgent({
                  werkmap,
                  model: "claude-sonnet-5",
                  systeem: systeemPrompt(site.naam, site.richtlijnen, site.isDemo, site.githubRepo),
                  opdracht: `MOBIELCONTROLE (automatisch, na je vorige wijziging). Je hebt lay-out direct in de HTML gezet (inline style). Een inline style wint van de media queries in de stylesheet, waardoor de pagina op een telefoon te breed wordt:\n${nieuw
                    .slice(0, 12)
                    .map((r) => `- ${r}`)
                    .join("\n")}\n\nHerstel dit, zonder het ontwerp op een computer te veranderen: haal deze lay-out uit de style-attributen en regel het via klassen in de bestaande stylesheet. Kijk eerst of er al een klasse is die dit doet (vaak met media queries voor tablet en telefoon) en gebruik die; anders voeg je spaarzaam een klasse toe in de stylesheet met een @media-regel waarin het op smalle schermen (bijv. max-width: 700px) één kolom of 100% breedte wordt. Pas verder niets aan. Antwoord met één korte zin.`,
                  budgetUsd: 0.15,
                  maxBeurten: 8,
                  maxDuurMs: 90_000,
                  signal: stopper.signal,
                  opGebeurtenis: () => {},
                });
                const { registreerAiKosten } = await import("@/lib/kosten");
                await registreerAiKosten(site.id, "chat", {
                  tokensIn: herstel.tokensIn,
                  tokensUit: herstel.tokensUit,
                  kostenUsd: herstel.kostenUsd,
                }).catch(() => {});
                const nogSteeds = nieuweRisicos(mobielVoor, await mobielRisicos(werkmap));
                console.log(`Mobielcontrole ${site.githubRepo}: ${nieuw.length} gevonden, ${nogSteeds.length} over na herstel`);
              }
            } catch (e) {
              console.error("Mobielcontrole mislukt (wijziging gaat gewoon door):", e);
            }
          }

          // Meegestuurde foto's die de AI (nog) niet heeft gebruikt horen niet
          // als "wijziging" te tellen (anders krijg je een leeg concept), maar
          // mogen ook niet verloren gaan: bij "plaats hem toch" in een volgende
          // beurt moet de foto er nog zijn. Daarom: stilletjes bewaren in de
          // fotobank (direct op de hoofdbranch — een los, ongebruikt bestand
          // verandert niets zichtbaars aan de site).
          let ongebruikteUploads: string[] = [];
          if (afbeeldingen.length > 0) {
            const { alleHtmlBestanden, alleCssBestanden } = await import("@/lib/werkmap");
            const tekstBestanden = [
              ...(await alleHtmlBestanden(werkmap)),
              ...(await alleCssBestanden(werkmap)),
            ];
            for (const foto of afbeeldingen) {
              const bestandsnaam = path.basename(foto.naam);
              let gebruikt = false;
              for (const rel of tekstBestanden) {
                const inhoud = await readFile(path.join(werkmap, rel), "utf8").catch(() => "");
                if (inhoud.includes(bestandsnaam)) { gebruikt = true; break; }
              }
              if (!gebruikt) ongebruikteUploads.push(foto.naam);
            }
          }
          // Zelfde voor een meegestuurd document: heeft de AI er nog geen link
          // naar gemaakt (bijvoorbeeld omdat hij eerst vraagt waar het moet
          // komen), dan is het geen wijziging — het bestand blijft wel bewaard.
          if (documenten.length > 0 && !documentenVol) {
            const { alleHtmlBestanden } = await import("@/lib/werkmap");
            const htmls = await alleHtmlBestanden(werkmap);
            for (const doc of documenten) {
              const bestandsnaam = path.basename(doc.naam);
              let gebruikt = false;
              for (const rel of htmls) {
                const inhoud = await readFile(path.join(werkmap, rel), "utf8").catch(() => "");
                if (inhoud.includes(bestandsnaam)) { gebruikt = true; break; }
              }
              if (!gebruikt) ongebruikteUploads.push(doc.naam);
            }
          }
          // Zelfde voor een meegestuurde video: staat hij nergens in de site,
          // dan is het (nog) geen wijziging — alleen een bewaard bestand
          if (videoPaden) {
            const { alleHtmlBestanden } = await import("@/lib/werkmap");
            const htmls = await alleHtmlBestanden(werkmap);
            let gebruikt = false;
            for (const rel of htmls) {
              const inhoud = await readFile(path.join(werkmap, rel), "utf8").catch(() => "");
              if (inhoud.includes(path.basename(videoPaden.video))) { gebruikt = true; break; }
            }
            if (!gebruikt) {
              ongebruikteUploads.push(videoPaden.video);
              if (videoPaden.poster) ongebruikteUploads.push(videoPaden.poster);
            }
          }

          await fotosVeilig; // eerst klaar, anders botsen twee pushes op dezelfde tak
          let gewijzigd = await gewijzigdeBestanden(werkmap, snapshot);

          // Afspraken-poort: wat vroeger alleen prompttekst was, wordt hier
          // afgedwongen. Stil repareren wat mechanisch kan (formulier-adres,
          // _site, honeypot, enctype, lazy loading); wat niet te verzinnen
          // valt (alt-teksten, formuliernaam, kapotte invoeg-marker) krijgt
          // één herstelbeurt — zelfde patroon als de mobielcontrole.
          if (gewijzigd.length > 0 && !stopper.signal.aborted) {
            try {
              const { herstelAfspraken, afsprakenMeldingen } = await import(
                "@/lib/beurt-controle"
              );
              const gerepareerd = await herstelAfspraken(
                werkmap,
                gewijzigd,
                site.githubRepo,
              );
              if (gerepareerd.length)
                console.log(
                  `Afspraken-poort ${site.githubRepo}: ${gerepareerd.join("; ")}`,
                );
              // Ruimte voor een herstelbeurt? Een WhatsApp-beurt heeft een
              // krappe eigen grens (maxDuurS); een extra AI-beurt daaroverheen
              // zou het kanaal weer stil laten vallen. Dus alleen herstellen
              // als er ruim tijd over is; de stille reparaties hierboven zijn
              // altijd veilig, die kosten geen AI-tijd.
              const restS = maxDuurS - 80 - Math.round((Date.now() - klok) / 1000);
              // In de demo slaan we deze extra ronde over. Hij duurt tot 90
              // seconden ná "concept klaar", en de bezoeker wacht dan op een
              // correctie die hij niet ziet (een alt-tekst, een ontbrekende
              // titel). De demosite wordt elk uur teruggezet, dus daar hangt
              // geen vindbaarheid vanaf. Bij een klant blijft hij staan.
              const open =
                tijdOp || restS < 90 || site.isDemo
                  ? []
                  : await afsprakenMeldingen(werkmap, gewijzigd);
              if (open.length > 0) {
                stuur({ type: "status", tekst: "Ik loop de vaste afspraken na..." });
                const herstel = await draaiChatAgent({
                  werkmap,
                  model: "claude-sonnet-5",
                  systeem: systeemPrompt(site.naam, site.richtlijnen, site.isDemo, site.githubRepo),
                  opdracht: `AFSPRAKENCONTROLE (automatisch, na je vorige wijziging). Op de pagina's die je zojuist aanpaste ontbreekt nog het volgende:\n${open
                    .slice(0, 10)
                    .map((r) => `- ${r}`)
                    .join("\n")}\n\nHerstel precies dit en verder niets. Alt-teksten schrijf je op basis van wat er echt op de afbeelding staat (bekijk hem zo nodig met lees_bestand). Antwoord met één korte zin.`,
                  budgetUsd: 0.15,
                  maxBeurten: 8,
                  maxDuurMs: 90_000,
                  signal: stopper.signal,
                  opGebeurtenis: () => {},
                });
                const { registreerAiKosten } = await import("@/lib/kosten");
                await registreerAiKosten(site.id, "chat", {
                  tokensIn: herstel.tokensIn,
                  tokensUit: herstel.tokensUit,
                  kostenUsd: herstel.kostenUsd,
                }).catch(() => {});
                const nog = await afsprakenMeldingen(werkmap, gewijzigd);
                console.log(
                  `Afsprakencontrole ${site.githubRepo}: ${open.length} gevonden, ${nog.length} over na herstel`,
                );
                gewijzigd = await gewijzigdeBestanden(werkmap, snapshot);
              }
            } catch (e) {
              console.error("Afspraken-poort mislukt (wijziging gaat gewoon door):", e);
            }
          }

          if (tijdOp && gewijzigd.length === 0) {
            // De "je foto's zijn wel bewaard"-toevoeging van hierboven behouden
            const bewaarNotitie = reply.match(/\n\n\(Je [^)]*\)$/)?.[0] ?? "";
            reply =
              "Dit was een grote klus en ik liep tegen mijn tijdslimiet aan voordat er iets af was. Knip hem in stukjes, dan lukt het wél: vraag bijvoorbeeld eerst om de pagina, en daarna om de foto's in een paar kleinere groepjes." +
              bewaarNotitie;
          }
          if (gewijzigd.length > 0) {
            // Het antwoord hierboven staat er al, maar het concept moet nog
            // worden opgeslagen en het voorbeeld uitgerold — zeg dat expliciet,
            // anders leest de eigenaar "ik heb het gedaan" en ziet hij niets.
            stuur({
              type: "status",
              tekst: "Nog héél even: ik sla dit op en zet mijn voorbeeld klaar...",
            });
          }
          const alleenOngebruikteUploads =
            gewijzigd.length > 0 &&
            gewijzigd.every((p) => ongebruikteUploads.includes(p));
          if (alleenOngebruikteUploads) {
            // Geen echte wijziging: geen concept, maar de foto('s) wél bewaren
            try {
              const { pushBestanden } = await import("@/lib/github");
              const bewaarBestanden = await Promise.all(
                gewijzigd.map(async (pad) => ({
                  pad,
                  inhoud: await readFile(path.join(werkmap!, pad)),
                })),
              );
              await pushBestanden(
                site.githubRepo,
                bewaarBestanden,
                "Meegestuurd bestand bewaard (nog niet geplaatst)",
              );
              // Staat er een concept open, zet hem dan óók op die branch:
              // de fotobank en de volgende beurt kijken naar de conceptbranch,
              // en een foto die alleen op main staat is daar onvindbaar
              // (gezien 19-09: "hij hoort in mijn fotobank" maar hij stond er
              // niet). Zelfde inhoud op beide takken, dus nooit een conflict.
              if (openConcept?.branch) {
                await pushBestanden(
                  site.githubRepo,
                  bewaarBestanden,
                  "Meegestuurd bestand bewaard (nog niet geplaatst)",
                  openConcept.branch,
                ).catch((e) => console.error("Bewaren op conceptbranch:", e));
              }
              const alleenVideo = afbeeldingen.length === 0 && documenten.length === 0 && Boolean(videoPaden);
              const alleenDocument = afbeeldingen.length === 0 && !videoPaden && documenten.length > 0;
              reply = `${reply}\n\n(${
                alleenDocument
                  ? `Je ${documenten.length > 1 ? "documenten staan" : "document staat"} wel al veilig op je site`
                  : alleenVideo
                    ? "Je video is wel bewaard op je site"
                    : "Je foto is wel bewaard in de fotobank van je site"
              }, dus opnieuw meesturen hoeft niet.)`;
            } catch (e) {
              console.error("Fotobank-bewaren mislukt:", e);
            }
            gewijzigd = [];
          }
          if (limietBereikt) {
            reply =
              gewijzigd.length > 0
                ? "Dit was een flinke klus — ik ben zover gekomen als in één keer kan. Bekijk het concept; wat er nog mist, kun je gewoon in een volgend bericht vragen (het concept blijft open, ik werk er dan op verder)."
                : "Dit verzoek is te groot voor één keer. Knip het op in kleinere stappen — bijvoorbeeld per pagina — dan pak ik ze één voor één op.";
          }
          let previewUrl: string | null = null;
          let changeRowId: number | null = null;
          let conceptBranch: string | null = null;

          if (gewijzigd.length > 0) {
            stuur({
              type: "status",
              tekst: "Ik zet het concept voor je klaar...",
            });
            const bestanden = await Promise.all(
              gewijzigd.map(async (pad) => ({
                pad,
                inhoud: await readFile(path.join(werkmap!, pad)),
              })),
            );
            // Werkversie-deploy is onafhankelijk van GitHub — laat hem parallel meelopen
            const deployKlaar = wvNaam
              ? deployMapNaarCloudflare(werkmap!, wvNaam, {
                  subdomeinAanzetten: site.isDemo,
                })
              : Promise.resolve();
            if (openConcept) {
              // Verder op het bestaande concept: zelfde branch en PR
              const { pushBestanden } = await import("@/lib/github");
              await pushBestanden(
                site.githubRepo,
                bestanden,
                `Vervolg via chat: ${bericht.slice(0, 60)}`,
                openConcept.branch,
              );
              const samengevoegd = [
                ...new Set([
                  ...(Array.isArray(openConcept.bestanden)
                    ? (openConcept.bestanden as string[])
                    : []),
                  ...gewijzigd,
                ]),
              ];
              await db
                .update(changes)
                .set({
                  bestanden: samengevoegd,
                  promptTekst: `${openConcept.promptTekst} → ${bericht}`.slice(
                    0,
                    500,
                  ),
                })
                .where(eq(changes.id, openConcept.id));
              changeRowId = openConcept.id;
              previewUrl =
                openConcept.previewUrl ?? `/preview/${openConcept.id}/`;
              conceptBranch = openConcept.branch;
            } else {
              const branch = eigenBranch ?? `wijziging-${Date.now()}`;
              let baseSha: string | null = null;
              if (eigenBranch) {
                // Demo: persistente sandbox-branch; stand vooraf onthouden voor Verwijder
                const { gh, GITHUB_ORG } = await import("@/lib/github");
                try {
                  const ref = (await gh(
                    `/repos/${GITHUB_ORG}/${site.githubRepo}/git/ref/heads/${branch}`,
                  )) as { object: { sha: string } };
                  baseSha = ref.object.sha;
                } catch {
                  await maakBranch(site.githubRepo, branch);
                }
              } else {
                await maakBranch(site.githubRepo, branch);
              }
              const { pushBestanden } = await import("@/lib/github");
              await pushBestanden(
                site.githubRepo,
                bestanden,
                `Wijziging via chat: ${bericht.slice(0, 60)}`,
                branch,
              );
              // Geen pull request meer per concept — dat gebeurt pas bij Publiceer
              // (branch wordt dan rechtstreeks gemerged). Scheelt seconden per wijziging.
              const [row] = await db
                .insert(changes)
                .values({
                  siteId: site.id,
                  branch,
                  promptTekst: bericht,
                  bestanden: gewijzigd,
                  clerkUserId: userId,
                  baseSha,
                })
                .returning({ id: changes.id });
              changeRowId = row.id;
              previewUrl = `/preview/${row.id}/`;
              conceptBranch = branch;
              await db
                .update(changes)
                .set({ previewUrl })
                .where(eq(changes.id, row.id));
            }

            // Elke beurt die echt iets verandert telt als wijziging — óók een
            // vervolg binnen een openstaand concept (anders is een concept dat
            // nooit gepubliceerd wordt een onbeperkte gratis maand). Gratis
            // blijven: vraag-beurten zonder wijziging (komen hier niet), de
            // demo, en "Overal doorvoeren" — dat maakt een eerdere wijziging
            // af en is geen nieuwe.
            if (site.isDemo || bericht.trim() === "Overal doorvoeren") {
              // geen telling
            } else if (verbruik) {
              await db
                .update(usage)
                .set({ wijzigingen: sql`${usage.wijzigingen} + 1` })
                .where(eq(usage.id, verbruik.id));
            } else {
              await db
                .insert(usage)
                .values({ siteId: site.id, maand, wijzigingen: 1 });
            }

            stuur({ type: "status", tekst: "Ik werk mijn voorbeeld bij — een paar tellen nog..." });
            await deployKlaar;

            // Visuele mobielcontrole: de gewijzigde pagina's van het zojuist
            // bijgewerkte voorbeeld écht op telefoonbreedte laten renderen.
            // Kost ±1–4 s; alleen als een pagina te breed is volgt één korte
            // herstelbeurt. Lukt meten niet (limiet, storing), dan gaat alles
            // gewoon door.
            if (
              wvNaam &&
              conceptBranch &&
              changeRowId &&
              !snelpad &&
              !tijdOp &&
              !limietBereikt &&
              !stopper.signal.aborted &&
              !slotKwijt.signal.aborted
            ) {
              try {
                const { meetMobieleWeergave, paginasOmTeMeten, teBredePaginas, beschrijfProblemen } =
                  await import("@/lib/mobiel-render");
                const metingen = await meetMobieleWeergave(
                  `https://${wvNaam}.${CF_SUBDOMEIN}.workers.dev`,
                  paginasOmTeMeten(gewijzigd),
                );
                const teBreed = metingen ? teBredePaginas(metingen) : [];
                if (teBreed.length > 0 && !stopper.signal.aborted && restVoorHerstelS() >= 120) {
                  stuur({ type: "status", tekst: "Ik controleer of het ook goed staat op een telefoon..." });
                  const voorHerstel = await maakSnapshot(werkmap);
                  const herstel = await draaiChatAgent({
                    werkmap,
                    model: "claude-sonnet-5",
                    systeem: systeemPrompt(site.naam, site.richtlijnen, site.isDemo, site.githubRepo),
                    opdracht: `MOBIELCONTROLE (automatisch, na je vorige wijziging). Ik heb de gewijzigde pagina's echt laten zien op een telefoon (390px breed). Ze zijn breder dan het scherm, waardoor je op een telefoon horizontaal moet schuiven:\n${beschrijfProblemen(
                      teBreed,
                    )}\n\nHerstel dit zonder het ontwerp op een computer te veranderen. Veelvoorkomende oorzaken: vaste breedtes of kolommen in een style-attribuut, een raster zonder media query, of een foto/iframe/tabel met een vaste breedte. Regel het via klassen in de bestaande stylesheet met een @media-regel voor smalle schermen (bijv. max-width: 700px: één kolom, max-width: 100%). Gebruik eerst een bestaande klasse als die dit al doet. Pas verder niets aan. Antwoord met één korte zin.`,
                    budgetUsd: 0.15,
                    maxBeurten: 8,
                    maxDuurMs: 90_000,
                    signal: stopper.signal,
                    opGebeurtenis: () => {},
                  });
                  const { registreerAiKosten } = await import("@/lib/kosten");
                  await registreerAiKosten(site.id, "chat", {
                    tokensIn: herstel.tokensIn,
                    tokensUit: herstel.tokensUit,
                    kostenUsd: herstel.kostenUsd,
                  }).catch(() => {});
                  const hersteld = await gewijzigdeBestanden(werkmap, voorHerstel);
                  if (hersteld.length > 0 && !stopper.signal.aborted && !slotKwijt.signal.aborted) {
                    const { pushBestanden } = await import("@/lib/github");
                    await pushBestanden(
                      site.githubRepo,
                      await Promise.all(
                        hersteld.map(async (pad) => ({ pad, inhoud: await readFile(path.join(werkmap!, pad)) })),
                      ),
                      "Mobielcontrole: pagina past weer op een telefoon",
                      conceptBranch,
                    );
                    const [rij] = await db
                      .select({ bestanden: changes.bestanden })
                      .from(changes)
                      .where(eq(changes.id, changeRowId));
                    gewijzigd = [...new Set([...gewijzigd, ...hersteld])];
                    await db
                      .update(changes)
                      .set({
                        bestanden: [
                          ...new Set([...(Array.isArray(rij?.bestanden) ? (rij.bestanden as string[]) : []), ...hersteld]),
                        ],
                      })
                      .where(eq(changes.id, changeRowId));
                    await deployMapNaarCloudflare(werkmap!, wvNaam, { subdomeinAanzetten: site.isDemo });
                  }
                  console.log(
                    `Mobiele weergave ${site.githubRepo}: ${teBreed.map((p) => `${p.pad}=${p.breedte}px`).join(", ")} te breed, ${hersteld.length} bestand(en) hersteld`,
                  );
                }
              } catch (e) {
                console.error("Visuele mobielcontrole mislukt (wijziging gaat gewoon door):", e);
              }
            }
          }
          tik("afgerond");
          console.log(
            `[chat-tijd] cache-gelezen=${cacheGelezen} site=${site.id} voorbereid=${tijden.voorbereid ?? "?"}s ai=${
              tijden.ai ?? "?"
            }s totaal=${tijden.afgerond ?? "?"}s bestanden=${gewijzigd.length}`,
          );

          // Consistentie-vangnet (mechanisch, geen AI): is hier tekst of een
          // foto veranderd die elders op de site nog exact zo staat, dan komt
          // daar ALTIJD een melding van — tenzij de eigenaar al "alleen hier"
          // vroeg. Zo kan een halve doorvoering nooit stilletjes gebeuren.
          if (werkmap && changeRowId && gewijzigd.length > 0) {
            let vangnetDebug = "";
            let vangnetMeldingen: string[] = [];
            try {
              const { vraagtAlleenHier } = await import("@/lib/vangnet-bericht");
              const vroegAlleenHier = vraagtAlleenHier(bericht);
              if (!vroegAlleenHier) {
                const { dubbelingsRapport } = await import("@/lib/consistentie");
                const { leesBestand } = await import("@/lib/github");
                const basisRef = vangnetBasisSha ?? undefined;
                if (!basisRef) throw new Error("geen basis-sha; vangnet overgeslagen om niet met zichzelf te vergelijken");
                const { meldingen, vondsten } = await dubbelingsRapport({
                  werkmap,
                  gewijzigd,
                  oudeInhoud: (pad) => leesBestand(site.githubRepo, pad, basisRef).catch(() => null),
                });
                vangnetMeldingen = meldingen;
                // Vondsten bij het concept bewaren zodat "Overal doorvoeren"
                // in de volgende beurt mechanisch kan; elke beurt overschrijft
                await db
                  .update(changes)
                  .set({ vangnetVondsten: meldingen.length ? vondsten : null })
                  .where(eq(changes.id, changeRowId))
                  .catch((e) => console.error("Vangnet-vondsten bewaren:", e));
                vangnetDebug = `basis=${(basisRef ?? "main").slice(0, 7)} gewijzigd=${gewijzigd.join(",")} meldingen=${meldingen.length}`;
                const sonde = gewijzigd.find((p) => p.endsWith(".html"));
                if (meldingen.length === 0 && sonde) {
                  const oud0 = await leesBestand(site.githubRepo, sonde, basisRef).then((x) => `len=${x.length}`).catch((e) => `ERR=${e instanceof Error ? e.message.slice(0, 80) : e}`);
                  vangnetDebug += ` oud(${sonde})=${oud0}`;
                }
              } else {
                vangnetDebug = "onderdrukt door alleen-hier in de opdracht";
                // De eigenaar koos bewust "alleen hier": oude vondsten opruimen
                // zodat een latere doorvoer-knop niet iets verouderds toepast
                await db
                  .update(changes)
                  .set({ vangnetVondsten: null })
                  .where(eq(changes.id, changeRowId))
                  .catch(() => {});
              }
            } catch (e) {
              console.error("Consistentie-vangnet:", e);
              vangnetDebug = `FOUT: ${e instanceof Error ? e.message.slice(0, 160) : String(e).slice(0, 160)}`;
              // Een stil uitgevallen vangnet is een vals gevoel van veiligheid:
              // de klant merkt niets, dus Jos moet het horen (alleen productie)
              if (
                process.env.VERCEL_ENV === "production" &&
                process.env.RESEND_API_KEY
              ) {
                fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "WordSwap portaal <info@wordswap.nl>",
                    to: ["info@wordswap.nl"],
                    subject: `⚠️ Dubbeling-vangnet uitgevallen: ${site.naam}`,
                    html: `<p>Het dubbeling-vangnet is bij een chatwijziging stil overgeslagen — de klant merkt hier niets van, maar halve doorvoeringen worden nu niet gemeld.</p><p><strong>Site:</strong> ${site.naam} (${site.githubRepo})<br><strong>Fout:</strong> ${(e instanceof Error ? e.message : String(e)).replace(/</g, "&lt;").slice(0, 300)}<br><strong>Gewijzigd:</strong> ${gewijzigd.join(", ").slice(0, 200)}</p>`,
                  }),
                }).catch((f) => console.error("Vangnet-seintje mislukt:", f));
              }
            }
            // Opbouw van de waarschuwing (en de keuzeregel als laatste regel)
            // staat in lib/vangnet-bericht, zodat het te testen is.
            const { bouwVangnetAntwoord } = await import("@/lib/vangnet-bericht");
            reply = bouwVangnetAntwoord({
              reply,
              meldingen: vangnetMeldingen,
              // Alleen buiten productie: laat de testomgeving zelf vertellen wat het vangnet deed
              debug:
                process.env.VERCEL_ENV !== "production" ? vangnetDebug : "",
            }).reply;
          }

          await db
            .insert(messages)
            .values({
              siteId: site.id,
              rol: "assistent",
              tekst: reply,
              clerkUserId: userId,
            });

          // Video-aanlevering: klant kan geen video uploaden via de chat, dus
          // Jos krijgt een seintje om het op te pakken (WeTransfer → info@)
          if (
            /video/i.test(bericht) &&
            /aanlever|nieuwe video|andere video|video vervangen|video erachter/i.test(
              bericht,
            )
          ) {
            const key = process.env.RESEND_API_KEY;
            if (key) {
              fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${key}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "WordSwap portaal <info@wordswap.nl>",
                  to: ["info@wordswap.nl"],
                  subject: `🎬 Video-aanlevering: ${site.naam}`,
                  html: `<p>Een eigenaar wil een video aanleveren.</p><p><strong>Site:</strong> ${site.naam} (${site.domein ?? site.githubRepo})<br><strong>Gebruiker:</strong> ${userId}<br><strong>Vraag in de chat:</strong> ${bericht.replace(/</g, "&lt;").slice(0, 300)}</p><p>De klant heeft de instructie gekregen om de video via WeTransfer naar info@wordswap.nl te sturen. Comprimeren met het ffmpeg-recept uit de huisregels en als concept klaarzetten.</p>`,
                }),
              }).catch((e) => console.error("Video-seintje mislukt:", e));
            }
          }
          // Verbruikstand voor de balk in het portaal: het aandeel van de
          // maandruimte dat op is. Dat is wat de chat echt begrenst — het
          // aantal wijzigingen zei niets over wanneer je wordt geblokkeerd.
          let verbruikNa: { procent: number } | null = null;
          try {
            const { verbruikVan } = await import("@/lib/verbruik");
            const v = await verbruikVan(site, maand);
            verbruikNa = v ? { procent: v.procent } : null;
          } catch {}
          stuur({
            type: "klaar",
            reply,
            previewUrl,
            changeId: changeRowId,
            bestanden: gewijzigd,
            prompt: bericht,
            verbruik: verbruikNa,
          });

          // Geheugen-onderhoud: oude berichten samenvatten zodra het gesprek te lang wordt
          try {
            const alleBerichten = await db
              .select()
              .from(messages)
              .where(eq(messages.siteId, site.id))
              .orderBy(messages.id);
            if (alleBerichten.length > 40) {
              const teSamenvatten = alleBerichten.slice(0, -16);
              const Anthropic = (await import("@anthropic-ai/sdk")).default;
              const client = new Anthropic();
              const resp = await client.messages.create({
                // Samenvatten is eenvoudig werk — het snelle model volstaat
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1500,
                system:
                  "Je onderhoudt het langetermijngeheugen van een website-beheerchat. Vat samen wat blijvend relevant is: voorkeuren van de eigenaar (toon, stijl, werkwijze), afspraken, terugkerende onderwerpen, en tijdelijke wijzigingen die later teruggedraaid moeten worden (zoals feestdagen-openingstijden — noteer wat de oorspronkelijke situatie was). Laat koetjes-en-kalfjes weg. Schrijf compact in het Nederlands, als opsomming.",
                messages: [
                  {
                    role: "user",
                    content: `Bestaand geheugen:\n${site.chatGeheugen ?? "(leeg)"}\n\nNieuwe gespreksfragmenten om in het geheugen te verwerken:\n${teSamenvatten
                      .map((m) => `${m.rol}: ${m.tekst.slice(0, 400)}`)
                      .join(
                        "\n",
                      )}\n\nGeef het volledige bijgewerkte geheugen terug (bestaand + nieuw samengevoegd, gededupliceerd).`,
                  },
                ],
              });
              const nieuwGeheugen = resp.content
                .filter((b) => b.type === "text")
                .map((b) => (b as { text: string }).text)
                .join("\n")
                .slice(0, 8000);
              if (nieuwGeheugen.trim()) {
                await db
                  .update(sites)
                  .set({ chatGeheugen: nieuwGeheugen })
                  .where(eq(sites.id, site.id));
                const grens = teSamenvatten[teSamenvatten.length - 1].id;
                const { lte } = await import("drizzle-orm");
                await db
                  .delete(messages)
                  .where(
                    and(eq(messages.siteId, site.id), lte(messages.id, grens)),
                  );
              }
            }
          } catch (e) {
            console.error("Geheugen-onderhoud mislukt:", e);
          }
        } catch (e) {
          console.error(e);
          stuur({
            type: "klaar",
            reply: "De wijziging is niet bevestigd. Controleer eerst of er een concept is opgeslagen.",
            failed: true,
            previewUrl: null,
            changeId: null,
          });
        } finally {
          if (werkmap) {
            await ruimWerkmapOp(werkmap).catch(() => {});
          }
          await release().catch((e) =>
            console.error("Bewerkingsslot vrijgeven:", e),
          );
          try {
            controller.close();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  } finally {
    if (!streaming) await release();
  }
}
